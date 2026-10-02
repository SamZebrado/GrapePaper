import type { EvidenceAssessment, EvidenceExcerpt, EvidenceModelRequest, SourceDocument, SourceLocator } from './types';

export const MAX_SOURCE_CHARACTERS = 2_000_000;
export const MAX_EXCERPT_CHARACTERS = 1200;

export async function sha256(value: string | ArrayBuffer): Promise<string> {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function ingestText(text: string, title: string): Promise<SourceDocument> {
  if (!text.trim() || text.length > MAX_SOURCE_CHARACTERS) throw new Error('Source text is empty or too large.');
  const fingerprint = await sha256(text);
  return Object.freeze({ id: fingerprint, fingerprint, title: title.slice(0, 500),
    pages: Object.freeze([Object.freeze({ page: 1, text })]) as unknown as SourceDocument['pages'], extractionVersion: 'plain-text-v1' });
}

export async function excerptId(source: Pick<SourceDocument, 'fingerprint' | 'extractionVersion'>, locator: SourceLocator, text: string): Promise<string> {
  return sha256(JSON.stringify([source.fingerprint, source.extractionVersion, locator.page, locator.start, locator.end, locator.pageLabel ?? null, text]));
}

/** Fixed-order fingerprint binds exact scientific inputs, not transport trust labels. */
export async function analysisInputFingerprint(request: Omit<EvidenceModelRequest, 'analysis_input_fingerprint'>): Promise<string> {
  const passage = request.current_passage, citation = request.citation, entry = request.bibliography_entry, identity = request.source_identity, association = request.association;
  return sha256(JSON.stringify(['evidence-analysis-v1',
    [passage.id, passage.documentId, passage.text, passage.page, passage.anchor],
    [citation.id, citation.raw, citation.kind, citation.keys, citation.start, citation.end],
    [entry.id, entry.raw, entry.title, entry.label ?? null, entry.authorKey ?? null, entry.year ?? null, entry.doi ?? null],
    [identity.id, identity.title, identity.doi ?? null, identity.confidence, identity.candidateId],
    [association.sourceIdentityId, association.sourceDocumentId, association.fingerprint, association.basis],
    request.excerpts.map(excerpt => [excerpt.id, excerpt.sourceDocumentId, excerpt.text, excerpt.locator.page, excerpt.locator.start,
      excerpt.locator.end, excerpt.locator.pageLabel ?? null, excerpt.provenance.origin, excerpt.provenance.fingerprint, excerpt.provenance.extractionVersion]),
  ]));
}

const stopWords = new Set('a an the and or of to in on for with by is are was were be been this that it as at from does do did not all each study paper result results'.split(' '));
function tokens(text: string): string[] {
  const normalized = text.normalize('NFKC').toLocaleLowerCase('en-US');
  const words = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
  const result: string[] = [];
  for (const word of words) {
    if (/\p{Script=Han}/u.test(word)) {
      for (let index = 0; index + 1 < word.length; index++) result.push(word.slice(index, index + 2));
    } else if (word.length >= 3 && !stopWords.has(word)) result.push(word);
  }
  return [...new Set(result)];
}

/** Deterministic lexical candidates only: a hit does not establish scientific support. */
export async function searchSource(source: SourceDocument, query: string): Promise<EvidenceExcerpt[]> {
  const terms = tokens(query.slice(0, 12000));
  if (!terms.length) return [];
  const minimum = terms.length === 1 ? 1 : Math.max(2, Math.ceil(terms.length / 2));
  if (terms.length === 1 && terms[0].length < 4 && !/\p{Script=Han}/u.test(terms[0])) return [];
  const candidates: { locator: SourceLocator; text: string; score: number }[] = [];
  for (const page of source.pages) {
    // Non-overlapping extraction windows retain offsets, whitespace and exact text.
    for (let start = 0; start < page.text.length;) {
      let end = Math.min(start + MAX_EXCERPT_CHARACTERS, page.text.length);
      if (end < page.text.length) {
        // Search strictly inside the exclusive window end; a delimiter at `end`
        // belongs to the next window and must not grow an excerpt past its cap.
        const boundary = Math.max(page.text.lastIndexOf('\n', end - 1), page.text.lastIndexOf('. ', end - 1));
        if (boundary > start + 200) end = boundary + 1;
      }
      const text = page.text.slice(start, end);
      const present = new Set(tokens(text));
      const score = terms.filter(term => present.has(term)).length;
      if (score >= minimum) candidates.push({ locator: { page: page.page, start, end, ...(page.pageLabel ? { pageLabel: page.pageLabel } : {}) }, text, score });
      start = end;
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.locator.page - b.locator.page || a.locator.start - b.locator.start);
  return Promise.all(candidates.slice(0, 3).map(async candidate => {
    const locator = Object.freeze(candidate.locator);
    return Object.freeze({ id: await excerptId(source, locator, candidate.text), sourceDocumentId: source.id,
      text: candidate.text, locator, provenance: Object.freeze({ origin: source.extractionVersion === 'plain-text-v1' ? 'local-text' as const : 'local-pdf' as const,
        fingerprint: source.fingerprint, extractionVersion: source.extractionVersion, locator }) });
  }));
}

export async function validateExcerpt(excerpt: EvidenceExcerpt, source: SourceDocument): Promise<boolean> {
  const location = excerpt.locator;
  const page = source.pages.find(candidate => candidate.page === location.page);
  return !!page && Number.isInteger(location.start) && Number.isInteger(location.end) && location.start >= 0 && location.end > location.start
    && location.end <= page.text.length && excerpt.text.length <= MAX_EXCERPT_CHARACTERS
    && page.text.slice(location.start, location.end) === excerpt.text && location.pageLabel === page.pageLabel
    && excerpt.sourceDocumentId === source.id && source.id === source.fingerprint
    && excerpt.provenance.fingerprint === source.fingerprint && excerpt.provenance.extractionVersion === source.extractionVersion
    && excerpt.provenance.origin === (source.extractionVersion === 'plain-text-v1' ? 'local-text' : 'local-pdf')
    && JSON.stringify(excerpt.provenance.locator) === JSON.stringify(location)
    && excerpt.id === await excerptId(source, location, excerpt.text);
}

/** Models may interpret supplied IDs, never introduce new authoritative evidence. */
export function parseAssessment(value: unknown, request: EvidenceModelRequest): EvidenceAssessment {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid interpretation.');
  const result = value as Record<string, unknown>;
  const allowed = ['current_passage_id', 'citation_id', 'source_identity_id', 'analysis_input_fingerprint', 'evidence_excerpt_ids', 'aspects', 'interpretation', 'uncertainty', 'missing_evidence', 'kind'];
  if (Object.keys(result).some(key => !allowed.includes(key)) || allowed.some(key => !(key in result))) throw new Error('Unexpected interpretation fields.');
  if (result.kind !== 'model-interpretation' || result.current_passage_id !== request.current_passage.id || result.citation_id !== request.citation.id || result.source_identity_id !== request.source_identity.id) throw new Error('Interpretation identity mismatch.');
  if (!/^[a-f0-9]{64}$/u.test(request.analysis_input_fingerprint) || result.analysis_input_fingerprint !== request.analysis_input_fingerprint) throw new Error('Interpretation input fingerprint mismatch.');
  for (const [field, limit] of [['interpretation', 2400], ['uncertainty', 1200]] as const) {
    if (typeof result[field] !== 'string' || !(result[field] as string).trim() || (result[field] as string).length > limit) throw new Error('Invalid interpretation text.');
  }
  for (const field of ['missing_evidence']) {
    if (!Array.isArray(result[field]) || result[field].length > 6 || result[field].some((item: unknown) => typeof item !== 'string' || !item.trim() || item.length > 600)) throw new Error('Invalid interpretation list.');
  }
  if (!Array.isArray(result.evidence_excerpt_ids) || result.evidence_excerpt_ids.length > 3 || result.evidence_excerpt_ids.some((id: unknown) => typeof id !== 'string' || !/^[a-f0-9]{64}$/u.test(id))) throw new Error('Invalid evidence IDs.');
  const ids = result.evidence_excerpt_ids as string[];
  if (!ids.length || new Set(ids).size !== ids.length || ids.some(id => !request.excerpts.some(excerpt => excerpt.id === id))) throw new Error('Interpretation refers to unsupplied evidence.');
  if (!Array.isArray(result.aspects) || !result.aspects.length || result.aspects.length > 6) throw new Error('Invalid interpretation aspects.');
  for (const aspect of result.aspects) {
    if (!aspect || typeof aspect !== 'object' || Array.isArray(aspect) || Object.keys(aspect).some(key => !['statement', 'relation', 'evidence_excerpt_ids', 'rationale'].includes(key))) throw new Error('Invalid interpretation aspect.');
    if (typeof aspect.statement !== 'string' || !aspect.statement.trim() || aspect.statement.length > 600 || typeof aspect.rationale !== 'string' || !aspect.rationale.trim() || aspect.rationale.length > 600) throw new Error('Invalid aspect text.');
    if (!['supports', 'contradicts', 'mentions', 'insufficient'].includes(aspect.relation) || !Array.isArray(aspect.evidence_excerpt_ids)
      || aspect.evidence_excerpt_ids.length > 3 || new Set(aspect.evidence_excerpt_ids).size !== aspect.evidence_excerpt_ids.length
      || aspect.evidence_excerpt_ids.some((id: unknown) => typeof id !== 'string' || !ids.includes(id))
      || (aspect.relation !== 'insufficient' && !aspect.evidence_excerpt_ids.length)) throw new Error('Invalid aspect evidence binding.');
  }
  return structuredClone(result) as unknown as EvidenceAssessment;
}
