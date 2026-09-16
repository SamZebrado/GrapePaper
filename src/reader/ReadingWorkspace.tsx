import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { companionPrompt, companionRequest, parseReply, type CompanionReply, type PaperInfo, type Passage, type SourceInfo, type Story, type ZoteroHandoff } from './protocol';
import { confirmPassage, digest, emptySession, parseProgress, passageIdentity, PROGRESS_KEY, type ProgressData } from './session';
import './ReadingWorkspace.css';

const PdfReader = lazy(() => import('./PdfReader'));
const demo = [
  { text: 'An introduction connects a research question to earlier work. A citation can supply a method, an observation, or a competing explanation; these roles should be distinguished before evaluating the new claim.', explanation: '引言在交代“这个问题从哪里来”。先看引用在句子里承担什么角色：借用方法、支持观察，还是引出竞争解释。三种用法需要核对的原文位置不同。', role: '建立研究问题与已有证据的关系。' },
  { text: 'Methods describe how an observation was produced. When reading a cited experiment, identify the manipulation, the measured response, and the comparison that allows an inference.', explanation: '读到某个实验时，先找三个东西：作者改变了什么（manipulation）、测量了什么（response）、通过哪组比较得出结论。方法决定了结论能解释到哪里。', role: '把概括性的研究结论还原为可核对的实验。' },
  { text: 'A discussion moves from observations to interpretations. An alternative explanation may remain possible even when the reported result is clear. Returning to the original figure can help locate that boundary.', explanation: 'Discussion 往往从数据走向机制解释。读懂观察结果后，可以再问：还有没有其他机制也会产生这个结果？回到原图检查，就能分清证据和推断。', role: '区分观察、解释和仍然开放的问题。' },
];
type Interlude = { title: string; body: string; story?: Story };
interface Props { handoff?: ZoteroHandoff | null }

export default function ReadingWorkspace({ handoff }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [paper, setPaper] = useState<PaperInfo | null>(null);
  const paperRef = useRef<PaperInfo | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [selection, setSelection] = useState<Passage | null>(null);
  const [selectionKey, setSelectionKey] = useState('');
  const [reply, setReply] = useState<CompanionReply | null>(null);
  const [sources, setSources] = useState('');
  const [sourceInfo, setSourceInfo] = useState<SourceInfo>({});
  const sourceRef = useRef({ text: '', info: {} as SourceInfo });
  const [progress, setProgress] = useState<ProgressData>({ version: 1, documents: {} });
  const [remember, setRemember] = useState(false);
  const [cadence, setCadence] = useState(3);
  const [automatic, setAutomatic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [interlude, setInterlude] = useState<Interlude | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [manualText, setManualText] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const documentIntent = useRef(0);
  const progressRef = useRef(progress);
  const storageFailed = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const replyInput = useRef<HTMLInputElement>(null);
  const lastStory = useRef('');
  const currentSession = paper ? progress.documents[paper.id] || emptySession() : emptySession();
  const confirmed = !!selectionKey && currentSession.confirmed.includes(selectionKey);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) { const restored = parseProgress(raw); progressRef.current = restored; setProgress(restored); setRemember(true); }
    } catch { /* Memory-only reading remains available. */ }
    const selectionGeneration = generation;
    const intentGeneration = documentIntent;
    return () => { request.current?.abort(); selectionGeneration.current++; intentGeneration.current++; };
  }, []);

  const saveProgress = (next: ProgressData) => {
    progressRef.current = next; setProgress(next);
    if (remember) {
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); }
      catch { storageFailed.current = true; setMessage('无法保存阅读标记，本次阅读仍可继续。'); return false; }
    }
    return true;
  };

  const updateSources = useCallback((text: string, info: SourceInfo = {}) => {
    sourceRef.current = { text, info }; setSources(text); setSourceInfo(info);
  }, []);

  const resetSelection = useCallback(() => {
    generation.current++; request.current?.abort(); request.current = null;
    setSelection(null); setSelectionKey(''); setReply(null); setBusy(false); setMessage(''); setInterlude(null);
  }, []);

  const onDocument = useCallback((info: PaperInfo) => {
    const changed = paperRef.current?.id !== info.id;
    paperRef.current = info; setPaper(info);
    if (changed) { resetSelection(); updateSources(info.references || ''); lastStory.current = ''; }
    else if (info.references && !sourceRef.current.text) updateSources(info.references);
  }, [resetSelection, updateSources]);

  const explain = useCallback(async (passage: Passage, doc: PaperInfo, sourceText: string, metadata: SourceInfo) => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    const version = generation.current; setBusy(true); setMessage(''); setReply(null);
    const timeout = setTimeout(() => controller.abort(), 65000);
    try {
      const response = await fetch('/api/companion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(companionRequest(doc, passage, sourceText, metadata)), signal: controller.signal });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error?.message || '伴读服务暂不可用。可先复制伴读提示词，在常用 AI 中阅读。');
      const parsed = parseReply(data);
      if (version === generation.current && request.current === controller) setReply(parsed);
    } catch (error) {
      if (version === generation.current && request.current === controller) setMessage(controller.signal.aborted ? '伴读请求已结束，可以重试或复制提示词。' : error instanceof Error ? error.message : '伴读请求失败。');
    } finally {
      clearTimeout(timeout);
      if (version === generation.current && request.current === controller) setBusy(false);
    }
  }, []);

  const selectPassage = useCallback((passage: Passage) => {
    const doc = paperRef.current;
    if (!doc || !passage.text.trim()) return;
    const version = ++generation.current;
    request.current?.abort(); request.current = null; setBusy(false);
    setSelection(passage); setSelectionKey(''); setReply(null); setMessage('');
    void passageIdentity(passage.page, passage.text).then(key => { if (version === generation.current) setSelectionKey(key); });
    if (doc.id === 'demo-reading') {
      const part = demo.find(item => item.text.includes(passage.text.trim()) || passage.text.includes(item.text));
      if (part) setReply({ explanation: part.explanation, argumentRole: part.role, citations: [], stories: [], questions: ['这一段的观察与解释分别是什么？你会回到原文的哪一处核对？'], evidenceNotice: '内置教学示例：文字与解读为 GrapePaper 编写，不是已发表的论文或实时 AI 输出。' });
    } else if (automatic) void explain(passage, doc, sourceRef.current.text, sourceRef.current.info);
  }, [automatic, explain]);

  useEffect(() => {
    if (!handoff) return;
    let active = true;
    const intent = ++documentIntent.current;
    resetSelection(); setFile(null); setIsDemo(false);
    void digest(handoff.document.doi || handoff.document.title || handoff.selection.text).then(id => {
      if (!active || intent !== documentIntent.current) return;
      const doc = { id: `zotero:${id}`, title: handoff.document.title || 'Zotero 选段', pages: handoff.selection.page || 1, doi: handoff.document.doi };
      onDocument(doc);
      const passage = { text: handoff.selection.text, page: handoff.selection.page || 1, context: '', anchor: '' };
      setSelection(passage);
      const version = generation.current;
      void passageIdentity(passage.page, passage.text).then(key => { if(active && intent === documentIntent.current && version === generation.current) setSelectionKey(key); });
    });
    return () => { active = false; };
  }, [handoff, resetSelection, onDocument]);

  const openPdf = (candidate?: File) => {
    if (!candidate) return;
    if (!/\.pdf$/i.test(candidate.name) && candidate.type !== 'application/pdf') { setMessage('请选择 PDF 文件。'); return; }
    if (candidate.size > 100 * 1024 * 1024) { setMessage('这个 PDF 超过 100 MB，请先压缩或拆分。'); return; }
    documentIntent.current++;
    resetSelection(); setPaper(null); paperRef.current = null; updateSources(''); setIsDemo(false); setFile(candidate);
  };

  const openDemo = () => {
    documentIntent.current++;
    setFile(null); setIsDemo(true); onDocument({ id: 'demo-reading', title: 'The paragraph and the paper', pages: 1 });
  };

  const markRead = () => {
    if (!paper || !selectionKey || !selection) return;
    const current = progressRef.current.documents[paper.id] || emptySession();
    const result = confirmPassage(current, selectionKey, cadence);
    if (result.session === current) return;
    saveProgress({ version: 1, documents: { ...progressRef.current.documents, [paper.id]: result.session } });
    if (result.unlock) {
      const stories = reply?.stories || [];
      const story = stories.find(s => s.id !== lastStory.current);
      if (story) { lastStory.current = story.id; setInterlude({ title: story.title, body: story.body, story }); }
      else setInterlude({ title: '停一小步，想一想', body: reply?.questions[0] || '刚读的段落怎样推进了作者的问题？哪些地方你还想回到原文核对？' });
    }
  };

  const toggleRemember = (checked: boolean) => {
    try {
      if (checked) localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressRef.current));
      else localStorage.removeItem(PROGRESS_KEY);
      storageFailed.current = false; setRemember(checked);
      setMessage(checked ? '已开启本机阅读标记。不会保存选段原文或 PDF。' : '已删除保存的阅读标记；当前标记只保留到关闭或刷新。');
    } catch { storageFailed.current = true; setMessage('浏览器未允许更新本机记录。请在浏览器网站数据中清除旧标记。'); }
  };

  const copyPrompt = async () => {
    if (!paper || !selection) return;
    try { await navigator.clipboard.writeText(companionPrompt(paper, selection, sources, sourceInfo)); setMessage('伴读提示词已复制。'); }
    catch { setMessage('无法使用剪贴板，请使用“下载提示词”。'); }
  };
  const downloadPrompt = () => {
    if (!paper || !selection) return;
    const url = URL.createObjectURL(new Blob([companionPrompt(paper, selection, sources, sourceInfo)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'grapepaper-companion-prompt.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importReply = async (candidate?: File) => {
    if (!candidate || !selection) return;
    const version = generation.current;
    try {
      if (candidate.size > 256000) throw new Error('伴读 JSON 需小于 256 KB。');
      const parsed = parseReply(JSON.parse(await candidate.text()));
      // Imported claims are user-supplied and cannot self-certify verification.
      parsed.evidenceNotice = '导入的伴读笔记，来源与摘录需自行核对。';
      parsed.citations.forEach(c => { c.evidence = 'model-unverified'; });
      parsed.stories.forEach(s => { s.evidence = 'model-unverified'; });
      if (version === generation.current) { request.current?.abort(); request.current = null; setBusy(false); setReply(parsed); setMessage('已导入当前选段的伴读。'); }
    } catch (error) { if (version === generation.current) setMessage(error instanceof Error ? error.message : '导入失败。'); }
  };

  return <main className="readingWorkspace" lang="zh-CN">
    <div className="readingHeading">
      <div><span className="eyebrow">READ AT YOUR OWN PACE</span><h1>读懂一段，再走一小步。</h1><p>英文原文在左，中文伴读在旁。圈选、理解，然后轻轻点一个对号。</p></div>
      <div className="readerActions"><button className="primary" onClick={() => fileInput.current?.click()}>打开 PDF</button><button aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}>阅读偏好</button></div>
    </div>
    <input ref={fileInput} type="file" accept=".pdf,application/pdf" hidden onChange={event => { openPdf(event.target.files?.[0]); event.target.value = ''; }}/>
    <input ref={replyInput} type="file" accept=".json,application/json" hidden onChange={event => { void importReply(event.target.files?.[0]); event.target.value = ''; }}/>
    {settingsOpen && <section className="readingSettings" aria-label="阅读偏好">
      <label><input type="checkbox" checked={remember} onChange={e => toggleRemember(e.target.checked)}/>在这台设备记住阅读标记</label>
      <p>默认只在本次阅读中计数。不显示全文完成率；关闭保存时，会删除以前保存的标记。</p>
      <label>阅读间奏 <select value={cadence} onChange={e => { setCadence(Number(e.target.value)); setInterlude(null); }}><option value={3}>每确认 3 段</option><option value={5}>每确认 5 段</option><option value={8}>每确认 8 段</option><option value={0}>关闭，安静阅读</option></select></label>
      <label><input type="checkbox" checked={automatic} onChange={e => setAutomatic(e.target.checked)}/>圈选后自动生成 AI 伴读</label>
      <p>开启后，将选段、当前页上下文和参考文献发送到你配置的伴读服务；PDF 文件留在本机。未配置时可复制提示词或导入笔记。</p>
      <button onClick={() => { const saved = saveProgress({version:1,documents:{}}); setInterlude(null); setMessage(saved ? '阅读标记已清空。' : '本次阅读标记已清空，但无法更新以前保存的标记。请在浏览器网站数据中清除旧标记。'); }}>清空阅读标记</button>
    </section>}
    {message && <p className="readingMessage" role="status">{message}</p>}
    <div className="readingGrid">
      <section className="paperColumn" aria-label="英文原文">
        <div className="columnHeading"><span>01 / ORIGINAL</span><span>{paper ? paper.title : '从一篇感兴趣的文章开始'}</span></div>
        {file ? <Suspense fallback={<div className="emptyReading">正在加载 PDF 阅读器…</div>}><PdfReader file={file} onSelection={selectPassage} onDocument={onDocument}/></Suspense> : isDemo ? <article className="samplePaper" onMouseUp={() => {
          const selected = window.getSelection(); const parent = selected?.anchorNode?.parentElement;
          if (selected && parent?.closest('.samplePaper') && selected.toString().trim()) selectPassage({text:selected.toString(),page:1,context:demo.map(x=>x.text).join('\n'),anchor:''});
        }}><span className="sampleTag">原创教学示例 · 非发表论文</span><h2>The paragraph and the paper</h2><p className="sampleSubtitle">A small companion for reading research</p>{demo.map((part,i) => <section key={part.text}><h3>{['The question','The experiment','The interpretation'][i]}</h3><p>{part.text}</p><button onClick={() => selectPassage({text:part.text,page:1,context:demo.map(x=>x.text).join('\n'),anchor:''})}>伴读这一段 →</button></section>)}</article> : paper && selection ? <article className="samplePaper"><span className="sampleTag">{paper.id.startsWith('zotero:') ? '来自 Zotero 的选段' : '粘贴的选段'} · 第 {selection.page} 页</span><h2>{paper.title}</h2><p className="handoffText">{selection.text}</p><p className="muted">完整 PDF 仍在原阅读器中。可继续在那里圈选，或在这里打开 PDF。</p></article> : <div className="emptyReading" onDragOver={e => e.preventDefault()} onDrop={e => {e.preventDefault();openPdf(e.dataTransfer.files[0]);}}>
          <div className="vineMark" aria-hidden="true">❦</div><h2>让文献有来处，也有故事。</h2><p>放入 PDF，随手圈住想读懂的地方。<br/>原文、引用和中文解读一起看。</p><button className="primary" onClick={() => fileInput.current?.click()}>选择或拖入 PDF</button><button onClick={openDemo}>先试读一页示例 →</button><small>PDF 在浏览器本地打开 · 无需上传全文</small>
        </div>}
        <details className="manualInput" open={manualOpen} onToggle={event => setManualOpen(event.currentTarget.open)}><summary>也可以粘贴一段原文</summary><label>文章标题<input value={manualTitle} maxLength={1000} onChange={e => setManualTitle(e.target.value)} placeholder="用于区分文章"/></label><label>英文或中文选段<textarea value={manualText} maxLength={12000} rows={5} onChange={e => setManualText(e.target.value)}/></label><button disabled={!manualText.trim()} onClick={async () => {
          const intent = ++documentIntent.current;
          const text = manualText.trim(); const suppliedTitle = manualTitle.trim(); const title = suppliedTitle || '粘贴的文章';
          resetSelection(); setFile(null); setIsDemo(false);
          const id = await digest(suppliedTitle ? `title:${suppliedTitle.normalize('NFKC')}` : `untitled:${text}`);
          if (intent !== documentIntent.current) return;
          setFile(null); setIsDemo(false); onDocument({id:`paste:${id}`,title,pages:1}); selectPassage({text,page:1,context:'',anchor:''}); setManualOpen(false);
        }}>开始伴读</button></details>
      </section>
      <aside className="companionColumn" aria-label="中文伴读">
        <div className="columnHeading"><span>02 / COMPANION</span><span className="memoryStatus">{remember ? '本机记忆' : '随读随走'}</span></div>
        {!selection ? <div className="companionEmpty"><span className="leafMark" aria-hidden="true">❧</span><h2>把难懂的地方，交给这一片叶子。</h2><p>选一段原文后，在这里梳理思路、追溯引用、核对实验。看完点 ✓，才确认读过。</p><div className="readingSteps"><span>圈选</span><span>伴读</span><span>✓ 确认</span><span>偶遇故事</span></div><p className="muted">没有全文打卡清单，也不用追赶进度。</p></div> : <>
          <div className="selectedPassage"><div><strong>当前选段</strong><span>第 {selection.page} 页</span></div><blockquote>{selection.text}</blockquote></div>
          <div className="companionActions"><button className="primary" disabled={busy || !paper || isDemo} onClick={() => paper && void explain(selection, paper, sources, sourceInfo)}>{busy ? '正在梳理论证…' : '生成中文伴读'}</button><button className={confirmed ? 'readCheck confirmed' : 'readCheck'} aria-pressed={confirmed} disabled={!selectionKey || confirmed} onClick={markRead}>{confirmed ? '✓ 已确认读过' : '✓ 我读过了'}</button></div>
          <p className="dataNote">生成时发送当前选段、页内上下文及下方来源材料。勾选只确认已读。</p>
          {reply ? <div className="companionAnswer"><section><h3>这段在说什么</h3><p>{reply.explanation}</p></section>{reply.argumentRole && <section><h3>它在论证中的位置</h3><p>{reply.argumentRole}</p></section>}<section><h3>引用文献与实验</h3>{reply.citations.length ? reply.citations.map((citation,i) => <article className="citationCard" key={i}><h4>{citation.url ? <a href={citation.url} target="_blank" rel="noopener noreferrer">{citation.title || '查看来源'} ↗</a> : citation.title || '待定位的引用'}</h4><span className="evidenceTag">{citation.evidence === 'provided-excerpt' ? '有提供的原文 · 解释待核对' : citation.evidence === 'metadata-only' ? '仅元数据 · 未核对全文' : '待核对原始来源'}</span><p>{citation.experiment}</p>{citation.quote && <blockquote>{citation.quote}</blockquote>}{citation.locator && <small>{citation.locator}</small>}</article>) : <p className="muted">这个选段暂无可定位的引用实验。可在下方补充参考文献或来源原文。</p>}</section>{reply.questions.length > 0 && <section><h3>带着这个问题回到英文</h3><p>{reply.questions[0]}</p></section>}<p className="evidenceNotice">{reply.evidenceNotice}</p></div> : !busy && <p className="answerHint">点“生成中文伴读”，或复制提示词到常用 AI。也可导入已经整理好的伴读 JSON。</p>}
          <div className="promptActions"><button onClick={() => void copyPrompt()}>复制伴读提示词</button><button onClick={downloadPrompt}>下载提示词</button><button onClick={() => replyInput.current?.click()}>导入伴读 JSON</button></div>
          <details className="sourceInput"><summary>参考文献与来源原文（可选）</summary><p>PDF 末尾识别到的参考文献会放在这里。也可替换为一篇来源的实验或故事摘录，并填写它的标题、链接与定位。整份参考文献列表请保持来源信息为空。</p><textarea aria-label="参考文献与来源原文" rows={8} maxLength={24000} value={sources} onChange={e => updateSources(e.target.value, sourceInfo)}/><label>来源标题（可选）<input value={sourceInfo.title || ''} maxLength={600} onChange={e => updateSources(sources, {...sourceInfo, title: e.target.value})}/></label><label>来源链接（可选）<input type="url" value={sourceInfo.url || ''} maxLength={2000} placeholder="https://doi.org/…" onChange={e => updateSources(sources, {...sourceInfo, url: e.target.value})}/></label><label>页码或章节（可选）<input value={sourceInfo.locator || ''} maxLength={300} placeholder="p. 4, Experiment 1" onChange={e => updateSources(sources, {...sourceInfo, locator: e.target.value})}/></label></details>
        </>}
        {interlude && <section className="readingInterlude" aria-label="阅读间奏" role="status"><div className="interludeTop"><span>{interlude.story ? ({debate:'观点争议',history:'学术故事',biography:'学者故事',news:'相关动态'}[interlude.story.kind] || '文献故事') : '阅读间奏'}</span><button aria-label="关闭阅读间奏" onClick={() => setInterlude(null)}>×</button></div><h3>{interlude.title}</h3><p>{interlude.body}</p>{interlude.story && <><a href={interlude.story.sourceUrl} target="_blank" rel="noopener noreferrer">{interlude.story.sourceTitle || '查看故事来源'} ↗</a>{interlude.story.quote && <blockquote>{interlude.story.quote}</blockquote>}{interlude.story.locator && <small>{interlude.story.locator}</small>}<small>AI 整理 / 导入内容，请核对来源。不代表独立事实核查。</small></>}<button onClick={() => setInterlude(null)}>继续随便读 →</button></section>}
      </aside>
    </div>
  </main>;
}
