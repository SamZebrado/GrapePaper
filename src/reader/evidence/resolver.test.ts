import { afterEach, describe, expect, it, vi } from 'vitest';
import { createResolver } from './resolver';
import type { BibliographyEntry, SourceIdentityCandidate } from './types';

const entry: BibliographyEntry = { id: 'entry-1', raw: 'Smith (2020). Paper.', title: 'Paper', doi: '10.1234/paper' };
const candidate: SourceIdentityCandidate = { id: 'crossref:10.1234/paper', title: 'Paper', doi: '10.1234/paper', authors: ['Smith'], year: 2020, provider: 'crossref', confidence: 'exact-doi' };
const reply = (patch: Record<string, unknown> = {}) => new Response(JSON.stringify({ mode: 'resolve', entry_id: entry.id, candidates: [candidate], lookup: 'available', ...patch }), { headers: { 'Content-Type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());

describe('Evidence Trail explicit companion resolver adapter', () => {
  it('binds response, returns candidates only and passes abort signal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply()); vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    expect(await createResolver('/api/companion').resolve(entry, controller.signal)).toEqual([candidate]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/companion');
    expect(options).toMatchObject({ credentials: 'omit', redirect: 'error', signal: controller.signal });
    expect(JSON.parse(options.body)).toEqual({ mode: 'resolve', entry });
  });
  it('supports explicitly configured HTTPS and local service endpoints only', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply()); vi.stubGlobal('fetch', fetchMock);
    await createResolver('http://127.0.0.1:8787').resolve(entry);
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:8787/api/companion');
    expect(() => createResolver('http://publisher.example/pdf')).toThrow();
    expect(() => createResolver('//publisher.example/api/companion')).toThrow();
    expect(() => createResolver('https://user:pass@example.com')).toThrow();
    expect(() => createResolver('https://example.com?key=secret')).toThrow();
  });
  it('rejects responses for a different request or mode', async () => {
    for (const patch of [{ entry_id: 'other' }, { mode: 'evidence' }, { candidates: {} }]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(patch)));
      await expect(createResolver('/api/companion').resolve(entry)).rejects.toThrow('不匹配');
    }
  });
  it('refuses mismatched exact DOI and duplicate IDs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ candidates: [{ ...candidate, doi: '10.1234/other' }] })));
    await expect(createResolver('/api/companion').resolve(entry)).rejects.toThrow('DOI');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ candidates: [candidate, candidate] })));
    await expect(createResolver('/api/companion').resolve(entry)).rejects.toThrow('重复');
  });
  it('accepts no DOI or ordinary uncertain candidates without promotion', async () => {
    const uncertain = { ...candidate, doi: undefined, confidence: 'candidate' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ candidates: [uncertain] })));
    expect((await createResolver('/api/companion').resolve({ ...entry, doi: undefined }))[0].confidence).toBe('candidate');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ candidates: [] })));
    expect(await createResolver('/api/companion').resolve(entry)).toEqual([]);
  });
  it('rejects malformed providers, shape, excessive candidates and unnormalized DOI', async () => {
    for (const patch of [{ provider: 'invented' }, { source_text: 'fake evidence' }, { confidence: ['candidate'] }, { title: '' }, { authors: ['x'.repeat(201)] }, { year: '2020' }, { doi: 'https://doi.org/10.1234/paper' }]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ candidates: [{ ...candidate, ...patch }] })));
      await expect(createResolver('/api/companion').resolve(entry)).rejects.toThrow();
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ candidates: Array.from({ length: 11 }, () => candidate) })));
    await expect(createResolver('/api/companion').resolve(entry)).rejects.toThrow();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ candidates: [{ ...candidate, authors: Array(21).fill('Author') }] })));
    await expect(createResolver('/api/companion').resolve(entry)).rejects.toThrow();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ candidates: [{ ...candidate, authors: Array(20).fill('Author') }] })));
    expect((await createResolver('/api/companion').resolve(entry))[0].authors).toHaveLength(20);
  });
  it('bounds response bytes and rejects invalid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('x'.repeat(64_001))));
    await expect(createResolver('/api/companion').resolve(entry)).rejects.toThrow('过大');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json')));
    await expect(createResolver('/api/companion').resolve(entry)).rejects.toThrow();
  });
  it('propagates abort/offline and reports unavailable without inventing a result', async () => {
    const error = new DOMException('aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    await expect(createResolver('/api/companion').resolve(entry)).rejects.toBe(error);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(createResolver('/api/companion').resolve(entry)).rejects.toThrow('offline');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    await expect(createResolver('/api/companion').resolve(entry)).rejects.toThrow('不可用');
  });
  it('rejects malformed entry metadata before network and excludes unknown outbound properties', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply()); vi.stubGlobal('fetch', fetchMock);
    await expect(createResolver('/api/companion').resolve({ ...entry, doi: 'https://doi.org/10.1234/paper' })).rejects.toThrow('无效');
    expect(fetchMock).not.toHaveBeenCalled();
    await createResolver('/api/companion').resolve({ ...entry, private_extra: 'not sent' } as BibliographyEntry);
    expect(fetchMock.mock.calls[0][1].body).not.toContain('private_extra');
  });
  it('does not interpret a disabled or unavailable lookup as no matching source', async () => {
    for (const lookup of ['disabled', 'unavailable', 'invented', ['available']]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({ lookup, candidates: [] })));
      await expect(createResolver('/api/companion').resolve(entry)).rejects.toThrow();
    }
  });
});
