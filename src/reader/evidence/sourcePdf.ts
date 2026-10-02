import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { SourceDocument, SourcePage } from './types';
import { MAX_SOURCE_CHARACTERS, sha256 } from './source';

GlobalWorkerOptions.workerSrc = workerUrl;
export const MAX_SOURCE_BYTES = 100 * 1024 * 1024;
export const MAX_SOURCE_PAGES = 500;

/** Local PDF.js extraction only. PDF reading order is not a printed-layout guarantee. */
export async function ingestPdf(file: File, signal?: AbortSignal): Promise<SourceDocument> {
  const checkAbort = () => { if (signal?.aborted) throw new DOMException('Source extraction cancelled.', 'AbortError'); };
  checkAbort();
  if (file.size <= 0 || file.size > MAX_SOURCE_BYTES) throw new Error('Source PDF must be no larger than 100 MB.');
  const bytes = await file.arrayBuffer();
  checkAbort();
  if (bytes.byteLength > MAX_SOURCE_BYTES) throw new Error('Source PDF is too large.');
  const fingerprint = await sha256(bytes);
  checkAbort();
  const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  let destruction: Promise<void> | undefined;
  const destroy = () => { destruction ??= task.destroy(); return destruction; };
  const onAbort = () => { void destroy().catch(() => undefined); };
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    checkAbort();
    const pdf = await task.promise;
    checkAbort();
    if (pdf.numPages > MAX_SOURCE_PAGES) throw new Error('Source PDF exceeds the 500 page limit.');
    const labels = await pdf.getPageLabels();
    checkAbort();
    const pages: SourcePage[] = [];
    let characters = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      checkAbort();
      const page = await pdf.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        checkAbort();
        const text = content.items.map(item => 'str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : '').join('');
        characters += text.length;
        if (characters > MAX_SOURCE_CHARACTERS) throw new Error('Source PDF exceeds the extracted text limit.');
        pages.push(Object.freeze({ page: pageNumber, text, ...(labels?.[pageNumber - 1] ? { pageLabel: labels[pageNumber - 1] } : {}) }));
      } finally { page.cleanup(); }
    }
    if (!pages.some(page => page.text.trim())) throw new Error('No extractable source text. OCR is not supported.');
    return Object.freeze({ id: fingerprint, fingerprint, title: file.name.slice(0, 500), pages: Object.freeze(pages) as unknown as SourcePage[], extractionVersion: 'pdfjs-text-v1' });
  } catch (error) {
    checkAbort();
    throw error;
  } finally {
    signal?.removeEventListener('abort', onAbort);
    await destroy();
  }
}
