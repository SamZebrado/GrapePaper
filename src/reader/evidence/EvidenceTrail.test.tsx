import { webcrypto } from 'node:crypto';
import { setImmediate as immediate } from 'node:timers';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import EvidenceTrail from './EvidenceTrail';
import type { EvidenceModelRequest } from './types';
import { detectCitations } from './citations';

vi.mock('./sourcePdf', () => ({ ingestPdf: vi.fn() }));
const passage = { id: 'current-1', documentId: 'current-document', text: 'Transformer recurrence-free architecture outperforms every task [1, 2].', page: 3, anchor: '' };
const bibliography = '[1] Smith, A. (2020). Transformer architecture.\n[2] Jones, B. (2021). Another paper.';
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const state = () => document.querySelector('[data-evidence-state]')?.getAttribute('data-evidence-state');
async function chooseSource() {
  const select = screen.getByLabelText('匹配书目') as HTMLSelectElement;
  fireEvent.change(select, { target: { value: select.options[1].value } });
  fireEvent.click(screen.getByRole('button', { name: '确认这条来源身份' }));
  fireEvent.change(screen.getByLabelText('本地来源文本'), { target: { value: 'Transformer recurrence-free architecture achieved a translation result. The experiment only tested translation, not every task.' } });
  fireEvent.click(screen.getByRole('button', { name: '确认对应来源并使用文本' }));
  await waitFor(() => expect(state()).toBe('SOURCE_TEXT_AVAILABLE_NOT_SEARCHED'));
  fireEvent.change(screen.getByLabelText('证据检索词'), { target: { value: 'Transformer recurrence-free architecture' } });
  fireEvent.click(screen.getByRole('button', { name: '在本地来源检索候选摘录' }));
  await waitFor(() => expect(state()).toBe('RELEVANT_SOURCE_EXCERPT_LOCATED'));
  fireEvent.click(screen.getByRole('checkbox', { name: '已检查，使用这条摘录作解释' }));
}
function assessment(body: EvidenceModelRequest) {
  return { kind: 'model-interpretation', current_passage_id: body.current_passage.id, citation_id: body.citation.id, source_identity_id: body.source_identity.id, analysis_input_fingerprint: body.analysis_input_fingerprint, evidence_excerpt_ids: body.excerpts.map(item => item.id), aspects: [{ statement: 'Reported translation result only.', relation: 'supports', evidence_excerpt_ids: body.excerpts.map(item => item.id), rationale: 'Only translation reported.' }, { statement: 'Every task is not established.', relation: 'insufficient', evidence_excerpt_ids: [], rationale: 'Other tasks unavailable.' }], interpretation: 'The result does not establish universal superiority.', uncertainty: 'Only supplied excerpts were examined.', missing_evidence: ['Other tasks.'] };
}
it('offline local evidence does not fetch, persist, infer support or allow model processing', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  render(<EvidenceTrail passage={passage} bibliographyText={bibliography} endpoint=""/>);
  expect(state()).toBe('CURRENT_PAPER_ONLY');
  await chooseSource();
  expect(screen.getByRole('button', { name: '仅根据勾选摘录生成解释' })).toBeDisabled();
  expect(fetcher).not.toHaveBeenCalled();
  expect(localStorage.setItem).not.toHaveBeenCalled();
});
it('sends only selected immutable source excerpts and labels interpretation separately', async () => {
  const fetcher = vi.fn(async (_url: string, options: RequestInit) => {
    const body = JSON.parse(options.body as string) as EvidenceModelRequest;
    return new Response(JSON.stringify({ mode: 'evidence', status: 'available', assessment: assessment(body) }));
  }); vi.stubGlobal('fetch', fetcher);
  render(<EvidenceTrail passage={passage} bibliographyText={bibliography} endpoint="https://companion.example/api/companion"/>);
  await chooseSource();
  fireEvent.click(screen.getByRole('button', { name: '仅根据勾选摘录生成解释' }));
  await screen.findByText('The result does not establish universal superiority.');
  expect(state()).toBe('MODEL_INTERPRETATION_FROM_LOCATED_EXCERPT');
  const body = JSON.parse(fetcher.mock.calls[0][1].body as string);
  expect(Object.keys(body)).toEqual(['mode', 'current_passage', 'citation', 'bibliography_entry', 'source_identity', 'association', 'excerpts', 'analysis_input_fingerprint']);
  expect(body.bibliography_entry.label).toBe('1');
  expect(body.excerpts[0].locator.page).toBe(1);
  expect(body.excerpts[0].text).toContain('only tested translation');
  expect(fetcher.mock.calls[0][1].credentials).toBe('omit');
});
it('rejects unknown evidence IDs and does not promote the evidence state', async () => {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => {
    const body = JSON.parse(options.body as string) as EvidenceModelRequest;
    return new Response(JSON.stringify({ mode: 'evidence', assessment: { ...assessment(body), evidence_excerpt_ids: ['f'.repeat(64)] } }));
  }));
  render(<EvidenceTrail passage={passage} bibliographyText={bibliography} endpoint="https://companion.example/api/companion"/>);
  await chooseSource(); fireEvent.click(screen.getByRole('button', { name: '仅根据勾选摘录生成解释' }));
  await screen.findByText('Interpretation refers to unsupplied evidence.');
  expect(state()).toBe('RELEVANT_SOURCE_EXCERPT_LOCATED');
});
it('citation change cancels a pending model response, including fetch implementations ignoring abort', async () => {
  let resolve!: (response: Response) => void;
  let body!: EvidenceModelRequest;
  vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => { body = JSON.parse(options.body as string); return new Promise<Response>(done => { resolve = done; }); }));
  render(<EvidenceTrail passage={passage} bibliographyText={bibliography} endpoint="https://companion.example/api/companion"/>);
  await chooseSource(); fireEvent.click(screen.getByRole('button', { name: '仅根据勾选摘录生成解释' }));
  await waitFor(() => expect(body).toBeDefined());
  fireEvent.change(screen.getByLabelText('引用标记'), { target: { value: '' } });
  await act(async () => { resolve(new Response(JSON.stringify({ mode: 'evidence', assessment: assessment(body) }))); });
  expect(screen.queryByText('The result does not establish universal superiority.')).not.toBeInTheDocument();
  expect(state()).toBe('CURRENT_PAPER_ONLY');
});
it('source replacement invalidates pending interpretation before new extraction completes', async () => {
  let resolve!: (response: Response) => void; let body!: EvidenceModelRequest;
  vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => { body = JSON.parse(options.body as string); return new Promise<Response>(done => { resolve = done; }); }));
  render(<EvidenceTrail passage={passage} bibliographyText={bibliography} endpoint="https://companion.example/api/companion"/>);
  await chooseSource(); fireEvent.click(screen.getByRole('button', { name: '仅根据勾选摘录生成解释' }));
  await waitFor(() => expect(body).toBeDefined());
  fireEvent.change(screen.getByLabelText('本地来源文本'), { target: { value: 'A different source with no matching method.' } });
  fireEvent.click(screen.getByRole('button', { name: '确认对应来源并使用文本' }));
  await waitFor(() => expect(state()).toBe('SOURCE_TEXT_AVAILABLE_NOT_SEARCHED'));
  await act(async () => { resolve(new Response(JSON.stringify({ mode: 'evidence', assessment: assessment(body) }))); });
  expect(screen.queryByText('The result does not establish universal superiority.')).not.toBeInTheDocument();
});
it('no lexical hit remains explicitly not-found, never fabricated', async () => {
  render(<EvidenceTrail passage={passage} bibliographyText={bibliography} endpoint=""/>);
  await chooseSource();
  fireEvent.change(screen.getByLabelText('证据检索词'), { target: { value: 'unrelated quantum zebras' } });
  fireEvent.click(screen.getByRole('button', { name: '在本地来源检索候选摘录' }));
  await waitFor(() => expect(state()).toBe('SOURCE_TEXT_SEARCHED_RELEVANT_EXCERPT_NOT_FOUND'));
  expect(screen.queryByRole('checkbox', { name: '已检查，使用这条摘录作解释' })).not.toBeInTheDocument();
});
it('rejects an imported record for repeated text at a different geometry anchor', async () => {
  const current = { ...passage, anchor: 'geometry-B' };
  render(<EvidenceTrail passage={current} bibliographyText={bibliography} endpoint=""/>);
  const imported = { version: 1, passage: { ...current, anchor: 'geometry-A' }, citation: detectCitations(current.text)[0], bibliography: [], identity: null, resolution: { candidates: [], selectedCandidateId: null, selectedBibliographyEntryId: null, ambiguity: 'unresolved' }, association: null, sourceFingerprint: null, excerpts: [], assessment: null, importedAssessment: null, analysisExcerptIds: [], sourceAvailable: false, searched: false, verification: 'live-local' };
  const file = new File([JSON.stringify(imported)], 'trail.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: async () => JSON.stringify(imported) });
  fireEvent.change(screen.getByLabelText('导入证据 JSON 文件'), { target: { files: [file] } });
  await screen.findByText('导入记录不属于当前选段；请先打开对应论文并选择同一段。');
  expect(state()).toBe('CURRENT_PAPER_ONLY');
});
it('does not accept a post-timeout response from a provider ignoring abort', async () => {
  let resolve!: (response: Response) => void; let body!: EvidenceModelRequest;
  vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => { body = JSON.parse(options.body as string); return new Promise<Response>(done => { resolve = done; }); }));
  render(<EvidenceTrail passage={passage} bibliographyText={bibliography} endpoint="https://companion.example/api/companion"/>);
  await chooseSource();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  fireEvent.click(screen.getByRole('button', { name: '仅根据勾选摘录生成解释' }));
  await act(async () => { for (let attempt = 0; !body && attempt < 30; attempt++) await new Promise<void>(done => immediate(done)); });
  expect(body).toBeDefined();
  await act(async () => { await vi.advanceTimersByTimeAsync(65001); resolve(new Response(JSON.stringify({ mode: 'evidence', assessment: assessment(body) }))); });
  vi.useRealTimers();
  await screen.findByText('操作已取消或超时；迟到结果未采纳。');
  expect(screen.queryByText('The result does not establish universal superiority.')).not.toBeInTheDocument();
  await waitFor(() => expect(state()).toBe('RELEVANT_SOURCE_EXCERPT_LOCATED'));
});
it('restores a same-passage citation with an opaque ID without changing its identity', async () => {
  render(<EvidenceTrail passage={passage} bibliographyText={bibliography} endpoint=""/>);
  const imported = { version: 1, passage, citation: { ...detectCitations(passage.text)[0], id: 'opaque-citation-1' }, bibliography: [], identity: null, resolution: { candidates: [], selectedCandidateId: null, selectedBibliographyEntryId: null, ambiguity: 'unresolved' }, association: null, sourceFingerprint: null, excerpts: [], assessment: null, importedAssessment: null, analysisExcerptIds: [], sourceAvailable: false, searched: false, verification: 'live-local' };
  const file = new File([JSON.stringify(imported)], 'trail.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: async () => JSON.stringify(imported) });
  fireEvent.change(screen.getByLabelText('导入证据 JSON 文件'), { target: { files: [file] } });
  await screen.findByText('导入记录未验证。需重新提供字节相同的本地来源；不会信任导入的 AI 解释。');
  expect(screen.queryByText('导入的引用标记不属于当前选段。')).not.toBeInTheDocument();
  expect(screen.getByLabelText('引用标记')).toHaveValue(detectCitations(passage.text)[0].id);
  expect(state()).toBe('CURRENT_PAPER_ONLY');
});
