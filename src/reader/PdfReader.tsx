import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { getDocument, GlobalWorkerOptions, TextLayer, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist';
import type { TextContent } from 'pdfjs-dist/types/src/display/api';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { boundsOfRects, normalizeSelectionText, rectangleFromPoints, selectTextBoxes, selectionAnchor, type Point, type Rect, type TextBox } from './selectionGeometry';
import './PdfReader.css';

GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfSelection = { text: string; page: number; context: string; anchor: string };
export type PdfDocumentInfo = { id: string; title: string; pages: number; references?: string };
type PdfReaderProps = { file: File; onSelection: (selection: PdfSelection) => void; onDocument: (info: PdfDocumentInfo) => void };
type SelectionMode = 'text' | 'box' | 'lasso';
type LoadedDocument = { file: File; pdf: PDFDocumentProxy; info: PdfDocumentInfo };

function textFromContent(content: TextContent): string {
  return content.items.map(item => 'str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : '').join('');
}

function relativeRect(rect: DOMRect, parent: DOMRect): Rect {
  return { x: rect.x - parent.x, y: rect.y - parent.y, width: rect.width, height: rect.height };
}

/** DOM ranges retain PDF.js font metrics and transforms, including rotated text. */
function wordBoxes(layer: HTMLElement, origin: DOMRect): TextBox[] {
  const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
  const boxes: TextBox[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent ?? '';
    for (const match of text.matchAll(/\S+/gu)) {
      const range = document.createRange();
      range.setStart(node, match.index ?? 0);
      range.setEnd(node, (match.index ?? 0) + match[0].length);
      const rect = range.getBoundingClientRect();
      if (rect.width && rect.height) boxes.push({ text: match[0], rect: relativeRect(rect, origin), index: boxes.length });
    }
  }
  return boxes;
}

export function PdfReader({ file, onSelection, onDocument }: PdfReaderProps) {
  const [loaded, setLoaded] = useState<LoadedDocument | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [availableWidth, setAvailableWidth] = useState(760);
  const [size, setSize] = useState({ width: 600, height: 800 });
  const [mode, setMode] = useState<SelectionMode>('text');
  const [loading, setLoading] = useState(true);
  const [pageReady, setPageReady] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pageText, setPageText] = useState('');
  const [showText, setShowText] = useState(false);
  const [drawing, setDrawing] = useState<Point[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const textHostRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const gesture = useRef<{ id: number; mode: 'box' | 'lasso'; points: Point[] } | null>(null);
  const callbacks = useRef({ onSelection, onDocument });
  const selectionTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastEmission = useRef('');
  callbacks.current = { onSelection, onDocument };
  const activeDocument = loaded?.file === file ? loaded : null;

  useEffect(() => {
    let cancelled = false;
    let task: ReturnType<typeof getDocument> | undefined;
    setLoaded(null);
    setPage(1);
    setZoom(1);
    setLoading(true);
    setPageReady(false);
    setPageText('');
    setError('');
    setNotice('');
    setDrawing([]);
    gesture.current = null;
    lastEmission.current = '';
    async function open() {
      try {
        const bytes = await file.arrayBuffer();
        if (cancelled) return;
        // Hash before PDF.js transfers the input buffer to its local worker.
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        if (cancelled) return;
        const id = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
        task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
        const pdf = await task.promise;
        if (cancelled) return;
        const info: PdfDocumentInfo = { id, title: file.name.replace(/\.pdf$/i, ''), pages: pdf.numPages };
        setLoaded({ file, pdf, info });
        setLoading(false);
        callbacks.current.onDocument(info);
        // Reference matching gets source bibliography text, never invented full text.
        let ending = '';
        for (let number = Math.max(1, pdf.numPages - 4); number <= pdf.numPages; number += 1) {
          if (cancelled) return;
          const referencePage = await pdf.getPage(number);
          const content = await referencePage.getTextContent();
          if (cancelled) return;
          ending += `\n[PDF page ${number}]\n${textFromContent(content)}`;
        }
        const heading = /(?:^|\n)\s*(?:\d+\.?\s*)?(References|Bibliography|参考文献)\s*(?:\n|$)/im.exec(ending);
        if (heading && !cancelled) callbacks.current.onDocument({ ...info, references: ending.slice(heading.index, heading.index + 24000) });
      } catch (reason) {
        if (cancelled) return;
        // Bibliography extraction is optional and must not hide a successfully opened PDF.
        if (task) {
          const pdf = await task.promise.catch(() => null);
          if (cancelled) return;
          if (pdf) return;
        }
        setLoading(false);
        const name = reason instanceof Error ? reason.name : '';
        setError(name === 'PasswordException' ? '这份 PDF 有密码保护。请先解锁，再重新打开。' : '无法打开这份 PDF。请确认文件完整，或换一份未加密的 PDF。');
      }
    }
    void open();
    return () => {
      cancelled = true;
      if (selectionTimer.current) clearTimeout(selectionTimer.current);
      void task?.destroy().catch(() => undefined);
    };
  }, [file]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const measure = () => setAvailableWidth(Math.max(240, element.clientWidth - 40));
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!activeDocument || !canvasHostRef.current || !textHostRef.current) return;
    let cancelled = false;
    let renderTask: RenderTask | undefined;
    let textLayer: TextLayer | undefined;
    // New elements per render prevent an old cancelled task from drawing into a new page.
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    const layer = document.createElement('div');
    layer.className = 'gp-pdf-text-layer';
    layer.setAttribute('aria-hidden', 'true');
    canvasHostRef.current.replaceChildren(canvas);
    textHostRef.current.replaceChildren(layer);
    setPageReady(false);
    setPageText('');
    setError('');
    setNotice('');
    setDrawing([]);
    gesture.current = null;
    async function render() {
      try {
        const pdfPage = await activeDocument!.pdf.getPage(page);
        if (cancelled) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const scale = (Math.min(1000, availableWidth) / base.width) * zoom;
        const viewport = pdfPage.getViewport({ scale });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        layer.style.setProperty('--total-scale-factor', String(scale));
        setSize({ width: viewport.width, height: viewport.height });
        renderTask = pdfPage.render({ canvas, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
        // Rendering can reject before the independent text extraction finishes.
        void renderTask.promise.catch(() => undefined);
        const content = await pdfPage.getTextContent();
        if (cancelled) return;
        const text = textFromContent(content);
        setPageText(text);
        textLayer = new TextLayer({ textContentSource: content, container: layer, viewport });
        await Promise.all([renderTask.promise, textLayer.render()]);
        if (cancelled) return;
        setPageReady(true);
        if (!text.trim()) setNotice('这一页没有可提取的文字，可能是扫描页。当前版本暂不支持 OCR，可换用含文字层的 PDF。');
      } catch {
        if (!cancelled) setError('这一页未能完整显示。可以切换页面，或打开下方的纯文本视图。');
      }
    }
    void render();
    return () => {
      cancelled = true;
      renderTask?.cancel();
      textLayer?.cancel();
      // Consume cancellation rejection even if getTextContent is still outstanding.
      void renderTask?.promise.catch(() => undefined);
      canvas.remove();
      layer.remove();
    };
  }, [activeDocument, page, availableWidth, zoom]);

  const emitSelection = useCallback((text: string, rect: Rect) => {
    const normalized = normalizeSelectionText(text);
    if (!normalized || !activeDocument) return;
    if (normalized.length > 12000) {
      setNotice('这次选中的文字比较多，请缩小到一两个段落后再试。');
      return;
    }
    const approximateIndex = normalizeSelectionText(pageText).indexOf(normalized);
    const context = normalizeSelectionText(pageText);
    const start = Math.max(0, approximateIndex - 4000);
    const anchor = selectionAnchor(page, normalized, rect, size);
    // Clicking the confirmation button must not re-emit a still-highlighted PDF range.
    if (lastEmission.current === anchor) return;
    lastEmission.current = anchor;
    callbacks.current.onSelection({ text: normalized, page, context: context.slice(start, start + 16000), anchor });
    setNotice('已选取这段文字。读完后，再点击伴读面板的对号。');
  }, [activeDocument, pageText, page, size]);

  const captureNativeSelection = useCallback(() => {
    if (mode !== 'text' || !pageReady) return;
    const selection = window.getSelection();
    const host = textHostRef.current;
    const stage = stageRef.current;
    if (!selection?.rangeCount || selection.isCollapsed || !host || !stage) return;
    const range = selection.getRangeAt(0);
    if (!host.contains(range.startContainer) || !host.contains(range.endContainer)) return;
    const rect = range.getBoundingClientRect();
    emitSelection(selection.toString(), relativeRect(rect, stage.getBoundingClientRect()));
  }, [mode, pageReady, emitSelection]);

  useEffect(() => {
    const schedule = () => {
      if (selectionTimer.current) clearTimeout(selectionTimer.current);
      selectionTimer.current = setTimeout(captureNativeSelection, 20);
    };
    document.addEventListener('pointerup', schedule);
    document.addEventListener('keyup', schedule);
    return () => {
      document.removeEventListener('pointerup', schedule);
      document.removeEventListener('keyup', schedule);
      if (selectionTimer.current) clearTimeout(selectionTimer.current);
    };
  }, [captureNativeSelection]);

  function localPoint(event: ReactPointerEvent): Point {
    const rect = stageRef.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)), y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)) };
  }

  function beginGesture(event: ReactPointerEvent<HTMLDivElement>) {
    if (mode === 'text' || !pageReady || event.button !== 0) return;
    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    const point = localPoint(event);
    gesture.current = { id: event.pointerId, mode, points: [point] };
    setDrawing([point]);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveGesture(event: ReactPointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const point = localPoint(event);
    if (current.mode === 'box') current.points = [current.points[0], point];
    else {
      const previous = current.points[current.points.length - 1];
      if (Math.hypot(point.x - previous.x, point.y - previous.y) >= 2) current.points.push(point);
    }
    setDrawing([...current.points]);
  }

  function finishGesture(event: ReactPointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId || !stageRef.current || !textHostRef.current) return;
    const end = localPoint(event);
    const points = current.mode === 'box' ? [current.points[0], end] : [...current.points, end];
    gesture.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDrawing(points);
    const region = current.mode === 'box' ? rectangleFromPoints(points[0], end) : points;
    const selected = selectTextBoxes(wordBoxes(textHostRef.current, stageRef.current.getBoundingClientRect()), region);
    const bounds = boundsOfRects(selected.map(item => item.rect));
    if (bounds) emitSelection(selected.map(item => item.text).join(' '), bounds);
    else setNotice('圈选范围内没有识别到文字。请围住文字主体，或切换到「选文字」。');
  }

  function cancelGesture() {
    gesture.current = null;
    setDrawing([]);
  }

  function changePage(next: number) {
    if (!activeDocument) return;
    if (!Number.isFinite(next)) return;
    setPage(Math.max(1, Math.min(activeDocument.pdf.numPages, Math.trunc(next))));
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
    window.getSelection()?.removeAllRanges();
  }

  const drawnRect = mode === 'box' && drawing.length > 1 ? rectangleFromPoints(drawing[0], drawing[drawing.length - 1]) : null;
  return <section className="gp-pdf-reader" aria-label="PDF 阅读器">
    <div className="gp-pdf-toolbar">
      <div className="gp-pdf-modes" role="group" aria-label="选择方式">
        {(['text', 'box', 'lasso'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value}
          onClick={() => { setMode(value); cancelGesture(); }}>
          {value === 'text' ? '选文字' : value === 'box' ? '框选' : '随手圈'}
        </button>)}
      </div>
      <div className="gp-pdf-navigation" role="group" aria-label="翻页">
        <button type="button" aria-label="上一页" disabled={!activeDocument || page <= 1} onClick={() => changePage(page - 1)}>‹</button>
        <label>第 <input aria-label="页码" type="number" min={1} max={activeDocument?.pdf.numPages ?? 1} value={page}
          disabled={!activeDocument} onChange={event => { if (event.target.value) changePage(Number(event.target.value)); }} />
          <span> / {activeDocument?.pdf.numPages ?? '…'} 页</span></label>
        <button type="button" aria-label="下一页" disabled={!activeDocument || page >= activeDocument.pdf.numPages} onClick={() => changePage(page + 1)}>›</button>
      </div>
      <label className="gp-pdf-zoom">缩放 <select aria-label="PDF 缩放" value={zoom} onChange={event => setZoom(Number(event.target.value))}>
        <option value={1}>适合宽度</option><option value={1.25}>125%</option><option value={1.5}>150%</option><option value={2}>200%</option>
      </select></label>
    </div>
    <p className="gp-pdf-hint">{mode === 'text' ? '拖动选中英文原文，让伴读从这一段开始。' : mode === 'box' ? '按住拖出一个方框，选择里面的文字。' : '按住鼠标随手画圈，松开后提取圈内文字。'}</p>
    {loading && <p role="status" className="gp-pdf-status">正在打开 PDF…</p>}
    {error && <p role="alert" className="gp-pdf-error">{error}</p>}
    <div className="gp-pdf-scroll" ref={scrollRef}>
      <div ref={stageRef} className={`gp-pdf-page gp-pdf-mode-${mode}${pageReady ? '' : ' gp-pdf-page-loading'}`}
        style={{ width: size.width, height: size.height, display: activeDocument ? undefined : 'none' } as CSSProperties}
        onPointerDown={beginGesture} onPointerMove={moveGesture} onPointerUp={finishGesture} onPointerCancel={cancelGesture}
        aria-label={`PDF 第 ${page} 页`}>
        <div ref={canvasHostRef} className="gp-pdf-canvas-host" />
        <div ref={textHostRef} className="gp-pdf-text-host" />
        <svg className="gp-pdf-drawing" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true">
          {drawnRect && <rect x={drawnRect.x} y={drawnRect.y} width={drawnRect.width} height={drawnRect.height} rx="3" />}
          {mode === 'lasso' && drawing.length > 1 && <polygon points={drawing.map(point => `${point.x},${point.y}`).join(' ')} />}
        </svg>
      </div>
    </div>
    {activeDocument && !pageReady && !error && <p className="gp-pdf-status" role="status">正在显示第 {page} 页…</p>}
    {notice && <p className="gp-pdf-notice" role="status">{notice}</p>}
    {activeDocument && <div className="gp-pdf-fallback">
      <button type="button" aria-expanded={showText} onClick={() => setShowText(value => !value)}>{showText ? '收起纯文本' : '打开本页纯文本'}</button>
      {showText && <div>
        <p>可以用键盘选中下面的文字，再点击「用选中文字伴读」。PDF 的提取顺序有时与版面不同，请对照原页。</p>
        <textarea ref={fallbackRef} readOnly value={pageText} aria-label={`第 ${page} 页提取文字`} rows={12} />
        <button type="button" disabled={!pageText} onClick={() => {
          const field = fallbackRef.current;
          if (!field || field.selectionStart === field.selectionEnd) { setNotice('请先在纯文本框里选中一段文字。'); return; }
          const text = field.value.slice(field.selectionStart, field.selectionEnd);
          const top = size.height * field.selectionStart / Math.max(1, field.value.length);
          emitSelection(text, { x: 0, y: top, width: size.width, height: size.height / 1000 });
        }}>用选中文字伴读</button>
      </div>}
    </div>}
  </section>;
}

export default PdfReader;
