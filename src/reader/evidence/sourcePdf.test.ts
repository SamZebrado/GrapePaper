import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock('pdfjs-dist', () => ({ getDocument: mock.getDocument, GlobalWorkerOptions: {} }));
import { ingestPdf, MAX_SOURCE_BYTES } from './sourcePdf';
import { searchSource, validateExcerpt } from './source';

function file(bytes = new Uint8Array([1, 2, 3])): File {
  return { size: bytes.length, name: 'Public fixture.pdf', arrayBuffer: async () => bytes.buffer } as File;
}
function setup(numPages = 2, pageText = 'Transformer attention recurrence') {
  const cleanup = vi.fn();
  const destroy = vi.fn(async () => undefined);
  const pdf = { numPages, getPageLabels: async () => ['i', '1'], getPage: async () => ({ getTextContent: async () => ({ items: [{ str: pageText, hasEOL: true }] }), cleanup }) };
  mock.getDocument.mockReturnValue({ promise: Promise.resolve(pdf), destroy });
  return { pdf, cleanup, destroy };
}
beforeEach(() => { mock.getDocument.mockReset(); });
describe('bounded local PDF extraction', () => {
  it('preserves exact extracted text, page and printed label; always cleans up', async () => {
    const { cleanup, destroy } = setup();
    const source = await ingestPdf(file());
    expect(source.pages).toEqual([{ page: 1, text: 'Transformer attention recurrence\n', pageLabel: 'i' }, { page: 2, text: 'Transformer attention recurrence\n', pageLabel: '1' }]);
    const excerpts = await searchSource(source, 'Transformer recurrence');
    expect(excerpts).toHaveLength(2);
    expect(await validateExcerpt(excerpts[0], source)).toBe(true);
    expect(cleanup).toHaveBeenCalledTimes(2);
    expect(destroy).toHaveBeenCalledOnce();
    expect(mock.getDocument.mock.calls[0][0]).toHaveProperty('data');
    expect(mock.getDocument.mock.calls[0][0]).not.toHaveProperty('url');
  });
  it('rejects bytes/pages/text bounds and scanned images', async () => {
    await expect(ingestPdf({ ...file(), size: MAX_SOURCE_BYTES + 1 } as File)).rejects.toThrow('100 MB');
    expect(mock.getDocument).not.toHaveBeenCalled();
    const oversized = setup(501);
    await expect(ingestPdf(file())).rejects.toThrow('500 page');
    expect(oversized.destroy).toHaveBeenCalledOnce();
    const text = setup(1, 'x'.repeat(2_000_001));
    await expect(ingestPdf(file())).rejects.toThrow('text limit');
    expect(text.cleanup).toHaveBeenCalledOnce();
    expect(text.destroy).toHaveBeenCalledOnce();
    const scanned = setup(1, '');
    await expect(ingestPdf(file())).rejects.toThrow('OCR');
    expect(scanned.destroy).toHaveBeenCalledOnce();
  });
  it('rejects pre-abort without opening and destroys a running extraction on cancellation', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(ingestPdf(file(), controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(mock.getDocument).not.toHaveBeenCalled();
    const running = new AbortController();
    const { pdf, destroy } = setup();
    pdf.getPageLabels = async () => { running.abort(); return []; };
    await expect(ingestPdf(file(), running.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(destroy).toHaveBeenCalledOnce();
  });
  it('destroys failed PDF tasks', async () => {
    const destroy = vi.fn(async () => undefined);
    mock.getDocument.mockImplementation(() => ({ promise: Promise.reject(new Error('Malformed PDF')), destroy }));
    await expect(ingestPdf(file())).rejects.toThrow('Malformed PDF');
    expect(destroy).toHaveBeenCalledOnce();
  });
});
