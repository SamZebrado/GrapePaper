import { companionEndpoint } from '../serviceConnection';
import { normalizeDoi } from './citations';
import type { BibliographyEntry, ResolverAdapter, SourceIdentityCandidate } from './types';

const MAX_BYTES = 64_000;
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.length > 0 && value.length <= max;

async function boundedJson(response: Response): Promise<unknown> {
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('来源解析响应过大。');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('来源解析响应为空。');
  const decoder = new TextDecoder();
  let bytes = 0, body = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) throw new Error('来源解析响应过大。');
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return JSON.parse(body);
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}

function candidate(value: unknown, entry: BibliographyEntry): SourceIdentityCandidate {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('来源候选格式无效。');
  const item = value as Record<string, unknown>;
  if (Object.keys(item).some(key => !['id', 'title', 'doi', 'authors', 'year', 'provider', 'confidence'].includes(key))) throw new Error('来源候选包含未知字段。');
  if (!text(item.id, 200) || !text(item.title, 1000) || item.provider !== 'crossref' || typeof item.confidence !== 'string' || !['candidate', 'exact-doi'].includes(item.confidence)
    || !Array.isArray(item.authors) || item.authors.length > 20 || !item.authors.every(author => text(author, 200))
    || (item.year !== undefined && (!Number.isInteger(item.year) || Number(item.year) < 1500 || Number(item.year) > 2200))) throw new Error('来源候选格式无效。');
  const doi = item.doi === undefined ? undefined : typeof item.doi === 'string' ? normalizeDoi(item.doi) : undefined;
  if (item.doi !== undefined && (!doi || item.doi !== doi)) throw new Error('来源 DOI 格式无效。');
  if (item.confidence === 'exact-doi' && (!entry.doi || doi !== normalizeDoi(entry.doi))) throw new Error('来源 DOI 与请求不匹配。');
  return { id: item.id, title: item.title, doi, authors: item.authors as string[], year: item.year as number | undefined, provider: 'crossref', confidence: item.confidence as SourceIdentityCandidate['confidence'] };
}

/** Only calls the explicitly configured companion service; never fetches publisher URLs. */
export function createResolver(endpoint: string): ResolverAdapter {
  const target = endpoint === '/api/companion' ? endpoint : companionEndpoint(endpoint);
  return {
    async resolve(entry, signal) {
      if (!text(entry.id, 200) || !text(entry.raw, 4000) || !text(entry.title, 1000)
        || (entry.label !== undefined && !/^\d{1,4}$/.test(entry.label))
        || (entry.authorKey !== undefined && !text(entry.authorKey, 200))
        || (entry.year !== undefined && !/^(?:18|19|20)\d{2}[a-z]?$/.test(entry.year))
        || (entry.doi !== undefined && (!normalizeDoi(entry.doi) || normalizeDoi(entry.doi) !== entry.doi))) throw new Error('参考文献条目无效。');
      const safeEntry: BibliographyEntry = { id: entry.id, raw: entry.raw, title: entry.title, label: entry.label, authorKey: entry.authorKey, year: entry.year, doi: entry.doi };
      const response = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', redirect: 'error', signal,
        body: JSON.stringify({ mode: 'resolve', entry: safeEntry }) });
      if (!response.ok) throw new Error(response.status === 503 ? '来源解析服务当前不可用。' : '来源解析请求失败。');
      const value = await boundedJson(response);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('来源解析响应无效。');
      const reply = value as Record<string, unknown>;
      if (reply.mode !== 'resolve' || reply.entry_id !== entry.id || !Array.isArray(reply.candidates) || reply.candidates.length > 10) throw new Error('来源解析响应与请求不匹配。');
      if (typeof reply.lookup !== 'string' || !['disabled', 'available', 'unavailable'].includes(reply.lookup)) throw new Error('来源解析查询状态无效。');
      if (reply.lookup === 'disabled') throw new Error('服务端未启用 Crossref 来源查询；尚未执行身份查询。');
      if (reply.lookup === 'unavailable') throw new Error('Crossref 来源查询暂时不可用；不能将此解释为没有匹配来源。');
      const candidates = reply.candidates.map(value => candidate(value, entry));
      if (new Set(candidates.map(item => item.id)).size !== candidates.length) throw new Error('来源候选标识重复。');
      return candidates;
    },
  };
}
