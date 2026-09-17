import { useMemo, useRef } from 'react';
import VineConnector from '../components/VineConnector/VineConnector';
import slab from '../components/StoneSlab/StoneSlab.module.css';
import './ReflowPage.css';

/** Keep extracted words intact; grouping is only a reading aid, not PDF structure recovery. */
function readingBlocks(text: string): string[] {
  const blocks: string[] = [];
  let lines: string[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) {
      if (lines.length) { blocks.push(lines.join(' ')); lines = []; }
      continue;
    }
    lines.push(line.trim());
    if (lines.join(' ').length >= 650 && /[.!?。！？]["'”’)]?$/.test(line.trim())) {
      blocks.push(lines.join(' ')); lines = [];
    }
  }
  if (lines.length) blocks.push(lines.join(' '));
  return blocks;
}

export default function ReflowPage({ text, title, page, onSelect }: {
  text: string; title: string; page: number; onSelect: (text: string) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const blocks = useMemo(() => readingBlocks(text), [text]);
  const select = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const start = range.startContainer.parentElement?.closest('.reflowText');
    const end = range.endContainer.parentElement?.closest('.reflowText');
    // One slab at a time avoids accidentally including controls or neighboring cards.
    if (start && start === end && root.current?.contains(start)) onSelect(selection.toString());
  };
  return <article ref={root} className="reflowPage" aria-label={`美化阅读第 ${page} 页`}>
    <header><span>THE READING GARDEN · 第 {page} 页</span><h2>{title}</h2><p>在石板上选文字，或点叶子伴读这一段。</p></header>
    {!blocks.length && <p className="reflowEmpty">本页暂无可提取的文字。请切回 PDF 原文查看图片、公式或扫描页。</p>}
    {blocks.map((text, index) => <section className="reflowSection" key={`${page}-${index}`}>
      {index > 0 && <VineConnector fromId={`page-${page}-${index-1}`} toId={`page-${page}-${index}`}/>} 
      <div className={`${slab.slab} reflowSlab`}>
        <span className="reflowNumber">{String(index + 1).padStart(2, '0')}</span>
        <p className="reflowText" onPointerUp={select} onKeyUp={select} tabIndex={0}>{text}</p>
        <button className="reflowLeaf" onClick={() => { window.getSelection()?.removeAllRanges(); onSelect(text); }}><span aria-hidden="true">❧</span> 伴读这一段</button>
      </div>
    </section>)}
    <footer>文字来自当前 PDF 页，按提取顺序重排。图表、公式和分栏请随时切回原文核对。</footer>
  </article>;
}
