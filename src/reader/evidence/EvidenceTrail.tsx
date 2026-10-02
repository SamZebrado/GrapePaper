import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bibliographyCandidate, detectCitations, matchCitation, parseBibliography } from './citations';
import { createResolver } from './resolver';
import { ingestText, searchSource, parseAssessment, analysisInputFingerprint } from './source';
import { ingestPdf } from './sourcePdf';
import { exportTrail, importTrail, revalidateTrail } from './transfer';
import { evidenceJson } from './request';
import { deriveEvidenceState, assertEvidenceStateConsistency } from './semantics';
import type { CurrentPassage, EvidenceModelRequest, EvidenceState, EvidenceTrailRecord, InTextCitation, SourceDocument, SourceIdentityCandidate } from './types';
import './EvidenceTrail.css';

const labels: Record<EvidenceState, string> = {
  CURRENT_PAPER_ONLY: '仅当前论文 · 未匹配来源', BIBLIOGRAPHY_MATCH_ONLY: '仅匹配书目 · 来源尚未确认',
  SOURCE_IDENTITY_RESOLVED_TEXT_UNAVAILABLE: '来源身份已确认 · 未提供全文',
  SOURCE_TEXT_AVAILABLE_NOT_SEARCHED: '本地来源已提供 · 尚未检索',
  SOURCE_TEXT_SEARCHED_RELEVANT_EXCERPT_NOT_FOUND: '已检索 · 未找到相关候选摘录',
  RELEVANT_SOURCE_EXCERPT_LOCATED: '已定位来源摘录 · 不等于支持结论',
  MODEL_INTERPRETATION_FROM_LOCATED_EXCERPT: '基于摘录的 AI 解释 · 非独立核实',
};
interface Props { passage: CurrentPassage; bibliographyText: string; endpoint: string }

/** Memory-only panel. Parent remounts on passage/document/reference change. */
export default function EvidenceTrail({ passage, bibliographyText, endpoint }: Props) {
  const citations = useMemo(() => detectCitations(passage.text), [passage.text]);
  const [references, setReferences] = useState(bibliographyText);
  const entries = useMemo(() => parseBibliography(references), [references]);
  const [record, setRecord] = useState<EvidenceTrailRecord>(() => ({ version: 1, passage, citation: citations.length === 1 ? citations[0] : null, bibliography: [], identity: null, resolution: { candidates: [], selectedCandidateId: null, selectedBibliographyEntryId: null, ambiguity: 'unresolved' }, association: null, sourceFingerprint: null, excerpts: [], assessment: null, importedAssessment: null, analysisExcerptIds: [], sourceAvailable: false, searched: false, verification: 'live-local' }));
  const matches = useMemo(() => record.citation ? matchCitation(record.citation, entries) : [], [record.citation, entries]);
  const [entryId, setEntryId] = useState('');
  const entry = matches.find(item => item.id === entryId);
  const [candidates, setCandidates] = useState<SourceIdentityCandidate[]>([]);
  const [source, setSource] = useState<SourceDocument | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [query, setQuery] = useState(passage.text);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [validatedState, setValidatedState] = useState<{ record: EvidenceTrailRecord; source: SourceDocument | null; state: EvidenceState } | null>(null);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const sourceInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const invalidate = useCallback(() => {
    generation.current++; controller.current?.abort(); controller.current = null;
    setBusy(false); setMessage(''); setRecord(previous => ({ ...previous, assessment: null, importedAssessment: null, analysisExcerptIds: [] }));
  }, []);
  useEffect(() => {
    invalidate();
    const epoch = generation; const pending = controller;
    return () => { epoch.current++; pending.current?.abort(); };
  }, [endpoint, invalidate]);
  useEffect(() => {
    let active = true;
    void deriveEvidenceState(record, source || undefined).then(state => {
      if (active) setValidatedState({ record, source, state });
    }).catch(error => { if (active) setMessage(error instanceof Error ? error.message : '证据状态验证失败。'); });
    return () => { active = false; };
  }, [record, source]);

  async function perform<T>(task: (signal: AbortSignal) => Promise<T>, accept: (value: T) => void) {
    invalidate(); const version = generation.current; const active = new AbortController(); controller.current = active; setBusy(true);
    const timeout = setTimeout(() => active.abort(), 65000);
    try {
      const value = await task(active.signal);
      if (version === generation.current && controller.current === active && !active.signal.aborted) accept(value);
      else if (version === generation.current && controller.current === active) setMessage('操作已取消或超时；迟到结果未采纳。');
    } catch (error) {
      if (version === generation.current && controller.current === active) setMessage(active.signal.aborted ? '操作已取消或超时；可以重试。' : error instanceof Error ? error.message : '证据操作失败。');
    } finally {
      clearTimeout(timeout);
      if (version === generation.current && controller.current === active) { setBusy(false); controller.current = null; }
    }
  }
  const clearSource = () => { setSource(null); setSelectedIds([]); setRecord(previous => ({ ...previous, sourceAvailable: false, searched: false })); };
  const changeCitation = (citation: InTextCitation | null) => {
    invalidate(); clearSource(); setEntryId(''); setCandidates([]);
    setRecord(previous => ({ ...previous, citation, bibliography: [], identity: null, resolution: { candidates: [], selectedCandidateId: null, selectedBibliographyEntryId: null, ambiguity: 'unresolved' }, association: null, sourceFingerprint: null, excerpts: [], assessment: null, verification: 'live-local' }));
  };
  const chooseEntry = (id: string) => {
    invalidate(); clearSource(); setEntryId(id);
    const chosen = matches.find(item => item.id === id);
    const candidateFor = (entry: typeof matches[number]): SourceIdentityCandidate => ({ ...bibliographyCandidate(entry), matchedFields: [record.citation?.kind === 'numeric' ? 'numeric-label' : 'author-year'] });
    setCandidates(chosen ? [candidateFor(chosen)] : []);
    const identityCandidates = chosen ? [chosen, ...matches.filter(item => item.id !== chosen.id).slice(0, 9)].map(candidateFor) : [];
    setRecord(previous => ({ ...previous, bibliography: chosen ? matches : [], identity: null, resolution: { candidates: identityCandidates, selectedCandidateId: null, selectedBibliographyEntryId: chosen?.id || null, ambiguity: identityCandidates.length > 1 ? 'multiple' : chosen ? 'single' : 'unresolved' }, association: null, sourceFingerprint: null, excerpts: [], assessment: null, verification: 'live-local' }));
  };
  const chooseIdentity = (candidate: SourceIdentityCandidate) => {
    invalidate(); clearSource();
    setRecord(previous => ({ ...previous, identity: { id: candidate.id, candidateId: candidate.id, title: candidate.title, ...(candidate.doi ? { doi: candidate.doi } : {}), confidence: candidate.confidence === 'exact-doi' ? 'exact-doi' : 'user-confirmed' }, resolution: { ...previous.resolution, selectedCandidateId: candidate.id }, association: null, sourceFingerprint: null, excerpts: [], assessment: null, verification: 'live-local' }));
  };
  const attach = async (task: (signal: AbortSignal) => Promise<SourceDocument>) => {
    if (!record.identity) return;
    // Changing source invalidates all old live excerpts immediately, before asynchronous extraction.
    const imported = record.verification === 'imported-unverified' ? record : null;
    clearSource();
    if (!imported) setRecord(previous => ({ ...previous, association: null, sourceFingerprint: null, excerpts: [], assessment: null }));
    await perform(task, next => {
      if (imported) {
        void perform(() => revalidateTrail(imported, next), validated => {
          setSource(next); setRecord(validated); setSelectedIds([]);
          setMessage('来源字节与摘录定位已重新核对；AI 解释需要重新生成。');
        });
      } else {
        setSource(next); setRecord(previous => ({ ...previous, association: { sourceIdentityId: previous.identity!.id, sourceDocumentId: next.id, fingerprint: next.fingerprint, basis: 'user-attached', verification: 'live-local' }, sourceFingerprint: next.fingerprint, sourceAvailable: true, searched: false, excerpts: [], assessment: null, verification: 'live-local' }));
        setMessage('本地来源已提供。文件与全文未上传；请检索并核对摘录。');
      }
    });
  };
  const state = validatedState?.record === record && validatedState.source === source ? validatedState.state : 'CURRENT_PAPER_ONLY';
  // The control uses local option IDs; an imported opaque ID stays in the record.
  const displayedCitationId = citations.find(item => record.citation && item.raw === record.citation.raw && item.kind === record.citation.kind && item.start === record.citation.start && item.end === record.citation.end && JSON.stringify(item.keys) === JSON.stringify(record.citation.keys))?.id || '';
  const interpret = () => {
    if (!record.citation || !record.identity || !source || record.verification !== 'live-local' || !selectedIds.length || !endpoint) return;
    const selectedEntry = record.bibliography.find(item => item.id === record.resolution.selectedBibliographyEntryId);
    if (!selectedEntry) return;
    const input = { mode: 'evidence' as const, current_passage: passage, citation: record.citation, bibliography_entry: selectedEntry, source_identity: record.identity, association: record.association!, excerpts: record.excerpts.filter(item => selectedIds.includes(item.id)) };
    void perform(async signal => {
      await assertEvidenceStateConsistency(record, source);
      const body: EvidenceModelRequest = { ...input, analysis_input_fingerprint: await analysisInputFingerprint(input) };
      const result = await evidenceJson(endpoint, body, signal);
      if (!result || typeof result !== 'object' || (result as Record<string, unknown>).mode !== 'evidence') throw new Error('证据服务返回模式不匹配。');
      return parseAssessment((result as Record<string, unknown>).assessment, body);
    }, assessment => setRecord(previous => ({ ...previous, assessment, analysisExcerptIds: input.excerpts.map(excerpt => excerpt.id) })));
  };
  const download = () => {
    try {
      const text = exportTrail(record);
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'grapepaper-evidence-trail.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setMessage(error instanceof Error ? error.message : '导出失败。'); }
  };
  const restore = (file?: File) => {
    if (!file) return;
    void perform(async () => {
      if (file.size > 256000) throw new Error('证据 JSON 需小于 256 KB。');
      const restored = await importTrail(await file.text());
      if (restored.passage.id !== passage.id || restored.passage.documentId !== passage.documentId || restored.passage.text !== passage.text || restored.passage.page !== passage.page || restored.passage.anchor !== passage.anchor) throw new Error('导入记录不属于当前选段；请先打开对应论文并选择同一段。');
      if (restored.citation && !citations.some(item => item.raw === restored.citation?.raw && item.kind === restored.citation.kind && item.start === restored.citation.start && item.end === restored.citation.end && JSON.stringify(item.keys) === JSON.stringify(restored.citation.keys))) throw new Error('导入的引用标记不属于当前选段。');
      return restored;
    }, restored => { clearSource(); setEntryId(''); setCandidates([]); setRecord(restored); setMessage('导入记录未验证。需重新提供字节相同的本地来源；不会信任导入的 AI 解释。'); });
  };

  return <section className="evidenceTrail" aria-label="引用证据链">
    <header><span className="eyebrow">CITATION → SOURCE → EVIDENCE → BOUNDARY</span><h3>让引用有可核对的来处</h3></header>
    <p className="trailState" data-evidence-state={state} role="status">{labels[state]}</p>
    <p className="trailBoundary">来源身份不等于支持关系。检索只定位候选，AI 解释不是独立事实核查。</p>
    <details><summary>当前论文说了什么</summary><p>待核对论断为上方“当前选段”的原文；它不是被引用来源的证据。</p><small>当前论文 · 第 {passage.page} 页</small></details>
    <label>引用标记<select aria-label="引用标记" value={displayedCitationId} onChange={event => changeCitation(citations.find(item => item.id === event.target.value) || null)}><option value="">选择引用（不自动合并多条）</option>{citations.map(item => <option key={item.id} value={item.id}>{item.raw}</option>)}</select></label>
    {!citations.length && <p className="trailBoundary">未识别出可靠的数字或作者年份引用；不会猜测来源。</p>}
    <details className="trailReferences"><summary>核对 / 补充参考文献</summary><label>书目原文<textarea aria-label="证据链书目原文" maxLength={24000} rows={6} value={references} onChange={event => { setReferences(event.target.value); changeCitation(record.citation); }}/></label><p>支持带编号或作者年份的逐条书目；歧义与无匹配会保留，不按排列位置猜编号。</p></details>
    {record.citation && <><label>匹配书目<select aria-label="匹配书目" value={entryId} onChange={event => chooseEntry(event.target.value)}><option value="">{matches.length ? `找到 ${matches.length} 条候选，请核对` : '未匹配；请补充完整书目'}</option>{matches.map(item => <option key={item.id} value={item.id}>{item.label ? `[${item.label}] ` : ''}{item.raw.slice(0, 160)}</option>)}</select></label>{matches.length > 1 && <p className="trailBoundary">多个候选 / 多篇引用：一次只核对一篇，不自动消除歧义。</p>}</>}
    {entry && <><p className="trailReference">{entry.raw}</p><button disabled={busy || !endpoint} onClick={() => { chooseEntry(entryId); void perform(signal => createResolver(endpoint).resolve(entry, signal), found => { const proposed: SourceIdentityCandidate[] = [{ ...bibliographyCandidate(entry), matchedFields: [record.citation?.kind === 'numeric' ? 'numeric-label' : 'author-year'] }, ...found.map(candidate => ({ ...candidate, bibliographyEntryId: entry.id, matchedFields: [candidate.confidence === 'exact-doi' ? 'doi' as const : 'bibliographic-query' as const] }))]; const all = proposed.filter((candidate, index) => proposed.findIndex(item => item.id === candidate.id) === index).slice(0, 10); setCandidates(all); setRecord(previous => { const retained = previous.resolution.candidates.filter(candidate => !all.some(item => item.id === candidate.id)).slice(0, Math.max(0, 10 - all.length)); return { ...previous, resolution: { ...previous.resolution, candidates: [...all, ...retained], selectedCandidateId: null, ambiguity: all.length + retained.length > 1 ? 'multiple' : 'single' } }; }); setMessage(found.length ? '元数据候选已返回；请核对身份，不代表有全文或支持结论。' : '没有可用的远端元数据；仍可按书目手动确认并导入本地来源。'); }); }}>查询来源元数据</button><small>显式查询仅发送这一条书目；Crossref 未启用或离线时可手动继续。</small></>}
    {candidates.length > 0 && !record.identity && <div className="trailCandidates">{candidates.map(candidate => <article key={`${candidate.provider}:${candidate.id}`}><p>{candidate.title}</p><small>{candidate.doi || 'DOI 未提供'} · {candidate.confidence === 'exact-doi' ? '精确 DOI 元数据' : '身份候选，需核对'} · {candidate.provider}</small><button onClick={() => chooseIdentity(candidate)}>确认这条来源身份</button></article>)}</div>}
    {record.identity && <section className="trailIdentity"><h4>来源身份</h4><p>{record.identity.title}</p><small>{record.identity.doi || '无 DOI'} · {record.identity.confidence === 'exact-doi' ? '精确 DOI' : '由你确认，非自动验证'} · 支持强度尚未判定</small>
      <p>确认你提供的文件对应上述来源。文件名 / DOI 不会自动证明 PDF 身份。来源提取暂存内存，刷新即清除。</p>
      <input ref={sourceInput} aria-label="导入本地来源 PDF" type="file" accept=".pdf,application/pdf" hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void attach(signal => ingestPdf(file, signal)); }}/>
      <button onClick={() => sourceInput.current?.click()}>确认对应来源并导入本地 PDF</button>
      <details><summary>或提供本地来源文本</summary><label>来源文本标题<input aria-label="来源文本标题" maxLength={600} value={sourceTitle} onChange={event => setSourceTitle(event.target.value)}/></label><label>来源文本<textarea aria-label="本地来源文本" rows={5} maxLength={100000} value={sourceText} onChange={event => setSourceText(event.target.value)}/></label><button disabled={!sourceText.trim()} onClick={() => void attach(() => ingestText(sourceText, sourceTitle || record.identity?.title || '本地来源'))}>确认对应来源并使用文本</button></details>
    </section>}
    {source && <section><small className="fingerprint">来源字节 SHA-256：{source.fingerprint}<br/>{source.extractionVersion} · {source.pages.length} 页（提取页码，不一定等于印刷页码）</small><label>检索词 / 当前论断<textarea aria-label="证据检索词" rows={3} maxLength={12000} value={query} onChange={event => { invalidate(); setQuery(event.target.value); setSelectedIds([]); setRecord(previous => ({ ...previous, searched: false, excerpts: [], assessment: null })); }}/></label><button disabled={busy || !query.trim()} onClick={() => { setSelectedIds([]); setRecord(previous => ({ ...previous, searched: false, excerpts: [], assessment: null })); void perform(() => searchSource(source, query), excerpts => { setRecord(previous => ({ ...previous, searched: true, excerpts, assessment: null })); }); }}>在本地来源检索候选摘录</button></section>}
    {!!record.excerpts.length && <section className="trailSource"><h4>来源证据 · 精确提取文本</h4><p>词汇相关性不是科学支持。请检查原文、页码与实验条件；PDF 文本顺序可能不完整。导入记录的文字在重新提供来源前均未核对。</p>{record.excerpts.map(excerpt => <article key={excerpt.id}><small>来源第 {excerpt.locator.page} 页 · 字符 {excerpt.locator.start}–{excerpt.locator.end}</small><blockquote>{excerpt.text}</blockquote>{source && <details><summary>查看本地来源这一页（提取文本）</summary><pre>{source.pages.find(page => page.page === excerpt.locator.page)?.text}</pre></details>}<label><input type="checkbox" disabled={!source || record.verification !== 'live-local'} checked={selectedIds.includes(excerpt.id)} onChange={event => { invalidate(); setSelectedIds(previous => event.target.checked ? [...previous, excerpt.id] : previous.filter(id => id !== excerpt.id)); }}/>已检查，使用这条摘录作解释</label></article>)}</section>}
    {record.verification === 'imported-unverified' && <p className="trailWarning">导入来源与摘录未验证；不允许基于这些文字生成可信来源解释。请重新提供匹配的本地文件 / 文本。</p>}
    <button disabled={busy || !endpoint || !source || !selectedIds.length || record.verification !== 'live-local'} onClick={interpret}>仅根据勾选摘录生成解释</button>
    <p className="trailBoundary">此操作发送当前选段、引用 / 来源身份及勾选的短摘录与定位到已配置的 AI 服务。不会发送整个 PDF 或全文索引。未连接 AI 时，本地定位和导出仍可使用。</p>
    {record.assessment && state === 'MODEL_INTERPRETATION_FROM_LOCATED_EXCERPT' && <section className="trailInterpretation"><h4>AI 解释 · 与原文分开</h4><p>{record.assessment.interpretation}</p>{record.assessment.aspects.map((aspect, index) => <article key={index}><h5>模型判断：{{ supports: '支持', contradicts: '相矛盾', mentions: '仅提及', insufficient: '证据不足' }[aspect.relation]}（请复核）</h5><p>{aspect.statement}</p><p>{aspect.rationale}</p><small>对应摘录：{aspect.evidence_excerpt_ids.length ? aspect.evidence_excerpt_ids.map(id => `第 ${record.excerpts.find(item => item.id === id)?.locator.page} 页 · ${id.slice(0, 12)}`).join('；') : '没有支持该方面的摘录'}</small></article>)}<p>不确定性：{record.assessment.uncertainty}</p><ul>{record.assessment.missing_evidence.map((text, index) => <li key={index}>{text}</li>)}</ul></section>}
    {record.importedAssessment && <details className="trailWarning"><summary>隔离的导入解释 · 未验证，不继承信任</summary><p>{record.importedAssessment.interpretation}</p><small>不参与当前证据状态；本地重新核对后会清除，必须重新分析。</small></details>}
    <details><summary>尚未解决 / 缺少的证据</summary><p>{!record.citation ? '没有可靠引用标记。' : !record.identity ? '来源身份待确认。' : !source ? '未核对本地来源全文。' : !record.excerpts.length ? record.searched ? '当前词汇检索未找到相关摘录；不代表论文没有相关内容。' : '来源尚未检索。' : '当前摘录可能不能涵盖完整实验与限制；支持关系需要逐项核对。'}</p></details>
    <details className="trailTransfer"><summary>导出 / 导入证据记录</summary><p>显式导出包含当前选段和短摘录，可能包含私人材料，请自行保管。不会自动保存全文。重新导入不继承验证状态。</p><button onClick={download}>导出证据 JSON（含摘录）</button><button onClick={() => importInput.current?.click()}>导入证据 JSON</button><input ref={importInput} aria-label="导入证据 JSON 文件" type="file" accept=".json,application/json" hidden onChange={event => { restore(event.target.files?.[0]); event.target.value = ''; }}/></details>
    {(busy || message) && <p className="trailMessage" role="status">{busy ? '正在处理证据链…' : message}</p>}
  </section>;
}
