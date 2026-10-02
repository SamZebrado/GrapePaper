import type { EvidenceExcerpt, EvidenceModelRequest, EvidenceTrailRecord, SourceDocument, SourceLocator } from './types';
import { analysisInputFingerprint, excerptId, parseAssessment, validateExcerpt } from './source';
import { assertCanonicalBibliographyEntry, detectCitations, matchCitation } from './citations';
import { assertCandidateProvenance } from './candidateProvenance';

export const MAX_TRAIL_BYTES = 256 * 1024;
const invalid = (): never => { throw new Error('Invalid or tampered Evidence Trail file.'); };
function object(value: unknown, keys: string[], optional: string[] = []): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some(key => !keys.includes(key) && !optional.includes(key)) || keys.some(key => !Object.prototype.hasOwnProperty.call(result, key))) return invalid();
  return result;
}
function text(value: unknown, max: number, empty = false): string {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim()) || [...value].some(char => char.charCodeAt(0) < 32 && !['\n', '\r', '\t'].includes(char))) return invalid();
  return value;
}
function integer(value: unknown, min = 0, max = 2_000_000): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) return invalid();
  return value as number;
}
function hash(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) return invalid();
  return value;
}
function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) return invalid();
  return value;
}
function locator(value: unknown): SourceLocator {
  const result = object(value, ['page', 'start', 'end'], ['pageLabel']);
  const location: SourceLocator = { page: integer(result.page, 1, 500), start: integer(result.start), end: integer(result.end) };
  if (location.end <= location.start || location.end - location.start > 1200) return invalid();
  if (result.pageLabel !== undefined) location.pageLabel = text(result.pageLabel, 100);
  return location;
}

/** Explicit export includes selected passages/excerpts, never source pages, bytes or keys. */
export function exportTrail(record: EvidenceTrailRecord): string {
  // Whitelist recursively: caller-owned extra indexes/bytes/keys never leave memory.
  const take = (value: object, keys: string[]) => Object.fromEntries(keys.filter(key => key in value).map(key => [key, (value as Record<string, unknown>)[key]]));
  const locationKeys = ['page', 'start', 'end', 'pageLabel'];
  const assessment = (value: EvidenceTrailRecord['assessment']) => value && ({ ...take(value, ['current_passage_id', 'citation_id', 'source_identity_id', 'analysis_input_fingerprint', 'evidence_excerpt_ids', 'interpretation', 'uncertainty', 'missing_evidence', 'kind']),
    aspects: value.aspects.map(aspect => take(aspect, ['statement', 'relation', 'evidence_excerpt_ids', 'rationale'])) });
  const output = JSON.stringify({ version: record.version,
    passage: take(record.passage, ['id', 'documentId', 'text', 'page', 'anchor']),
    citation: record.citation && take(record.citation, ['id', 'raw', 'kind', 'keys', 'start', 'end']),
    bibliography: record.bibliography.map(entry => take(entry, ['id', 'raw', 'title', 'label', 'authorKey', 'year', 'doi'])),
    identity: record.identity && take(record.identity, ['id', 'title', 'confidence', 'candidateId', 'doi']), sourceFingerprint: record.sourceFingerprint,
    excerpts: record.excerpts.map(excerpt => ({ ...take(excerpt, ['id', 'sourceDocumentId', 'text']), locator: take(excerpt.locator, locationKeys),
      provenance: { ...take(excerpt.provenance, ['origin', 'fingerprint', 'extractionVersion']), locator: take(excerpt.provenance.locator, locationKeys) } })),
    resolution: { candidates: record.resolution.candidates.map(candidate => take(candidate, ['id', 'title', 'doi', 'authors', 'year', 'provider', 'confidence', 'bibliographyEntryId', 'matchedFields'])),
      selectedCandidateId: record.resolution.selectedCandidateId, selectedBibliographyEntryId: record.resolution.selectedBibliographyEntryId,
      ambiguity: record.resolution.ambiguity },
    association: record.association && take(record.association, ['sourceIdentityId', 'sourceDocumentId', 'fingerprint', 'basis', 'verification']),
    assessment: assessment(record.assessment), importedAssessment: assessment(record.importedAssessment), analysisExcerptIds: record.analysisExcerptIds,
    sourceAvailable: record.sourceAvailable, searched: record.searched,
    verification: record.verification }, null, 2);
  if (new TextEncoder().encode(output).byteLength > MAX_TRAIL_BYTES) throw new Error('Evidence Trail export is too large.');
  return output;
}

/** A valid checksum is consistency, not authenticity; imported records remain unverified. */
export async function importTrail(json: string): Promise<EvidenceTrailRecord> {
  if (new TextEncoder().encode(json).byteLength > MAX_TRAIL_BYTES) return invalid();
  let parsed: unknown;
  try { parsed = JSON.parse(json); } catch { return invalid(); }
  const value = object(parsed, ['version', 'passage', 'citation', 'bibliography', 'identity', 'resolution', 'association', 'sourceFingerprint', 'excerpts', 'assessment', 'importedAssessment', 'analysisExcerptIds', 'sourceAvailable', 'searched', 'verification']);
  if (value.version !== 1 || !['live-local', 'imported-unverified'].includes(String(value.verification))) return invalid();
  if (typeof value.sourceAvailable !== 'boolean' || typeof value.searched !== 'boolean' || value.assessment !== null && value.importedAssessment !== null) return invalid();
  const passage = object(value.passage, ['id', 'documentId', 'text', 'page', 'anchor']);
  const current = { id: text(passage.id, 200), documentId: text(passage.documentId, 200), text: text(passage.text, 12000), page: integer(passage.page, 1, 100_000), anchor: text(passage.anchor, 1000, true) };
  let citation: EvidenceTrailRecord['citation'] = null;
  if (value.citation !== null) {
    const item = object(value.citation, ['id', 'raw', 'kind', 'keys', 'start', 'end']);
    if (item.kind !== 'numeric' && item.kind !== 'author-year') return invalid();
    citation = { id: text(item.id, 200), raw: text(item.raw, 1000), kind: item.kind, keys: array(item.keys, 30).map(key => text(key, 200)), start: integer(item.start, 0, current.text.length), end: integer(item.end, 1, current.text.length) };
    if (!citation.keys.length || citation.end <= citation.start || current.text.slice(citation.start, citation.end) !== citation.raw) return invalid();
    if (!detectCitations(current.text).some(item => item.start === citation!.start && item.end === citation!.end && item.kind === citation!.kind && JSON.stringify(item.keys) === JSON.stringify(citation!.keys))) return invalid();
  }
  const bibliography = array(value.bibliography, 100).map(item => {
    const entry = object(item, ['id', 'raw', 'title'], ['label', 'authorKey', 'year', 'doi']);
    const result: EvidenceTrailRecord['bibliography'][number] = { id: text(entry.id, 200), raw: text(entry.raw, 4000), title: text(entry.title, 1000, true) };
    for (const key of ['label', 'authorKey', 'year', 'doi'] as const) if (entry[key] !== undefined) result[key] = text(entry[key], 300);
    if (result.doi && !/^10\.\d{4,9}\/\S+$/u.test(result.doi)) return invalid();
    try { assertCanonicalBibliographyEntry(result); } catch { return invalid(); }
    return result;
  });
  let identity: EvidenceTrailRecord['identity'] = null;
  if (value.identity !== null) {
    const item = object(value.identity, ['id', 'title', 'confidence', 'candidateId'], ['doi']);
    if (item.confidence !== 'user-confirmed' && item.confidence !== 'exact-doi') return invalid();
    identity = { id: text(item.id, 200), title: text(item.title, 1000), confidence: item.confidence, candidateId: text(item.candidateId, 200) };
    if (item.doi !== undefined) { identity.doi = text(item.doi, 300); if (!/^10\.\d{4,9}\/\S+$/u.test(identity.doi)) return invalid(); }
  }
  if (new Set(bibliography.map(entry => entry.id)).size !== bibliography.length) return invalid();
  const resolutionValue = object(value.resolution, ['candidates', 'selectedCandidateId', 'selectedBibliographyEntryId', 'ambiguity']);
  const selectedBibliographyEntryId = resolutionValue.selectedBibliographyEntryId === null ? null : text(resolutionValue.selectedBibliographyEntryId, 200);
  const selectedEntry = bibliography.find(entry => entry.id === selectedBibliographyEntryId);
  if (selectedBibliographyEntryId !== null && (!citation || !selectedEntry || !matchCitation(citation, [selectedEntry]).length)) return invalid();
  if (bibliography.length && (!citation || !selectedEntry || matchCitation(citation, [selectedEntry]).length !== 1)) return invalid();
  if (identity && !selectedEntry) return invalid();
  const candidates = array(resolutionValue.candidates, 10).map(value => {
    const candidate = object(value, ['id', 'title', 'authors', 'provider', 'confidence', 'bibliographyEntryId', 'matchedFields'], ['doi', 'year']);
    if (!['bibliography', 'crossref'].includes(String(candidate.provider)) || !['candidate', 'exact-doi'].includes(String(candidate.confidence))) return invalid();
    const result: EvidenceTrailRecord['resolution']['candidates'][number] = { id: text(candidate.id, 200), title: text(candidate.title, 1000), authors: array(candidate.authors, 20).map(author => text(author, 300)), provider: candidate.provider as 'bibliography' | 'crossref', confidence: candidate.confidence as 'candidate' | 'exact-doi', bibliographyEntryId: text(candidate.bibliographyEntryId, 200) };
    if (candidate.year !== undefined) result.year = integer(candidate.year, 1000, 9999);
    if (candidate.doi !== undefined) { result.doi = text(candidate.doi, 300); if (!/^10\.\d{4,9}\/\S+$/u.test(result.doi)) return invalid(); }
    result.matchedFields = array(candidate.matchedFields, 4).map(field => {
      if (!['doi', 'numeric-label', 'author-year', 'bibliographic-query'].includes(String(field))) return invalid();
      return field as 'doi' | 'numeric-label' | 'author-year' | 'bibliographic-query';
    });
    if (!result.matchedFields.length || new Set(result.matchedFields).size !== result.matchedFields.length || result.confidence === 'exact-doi' && (!result.doi || !result.matchedFields.includes('doi'))) return invalid();
    const linkedEntry = bibliography.find(entry => entry.id === result.bibliographyEntryId);
    if (!linkedEntry || result.provider === 'bibliography' && (result.title !== linkedEntry.title || result.doi !== linkedEntry.doi)) return invalid();
    assertCandidateProvenance(citation, bibliography, result);
    return result;
  });
  if (new Set(candidates.map(candidate => candidate.id)).size !== candidates.length) return invalid();
  const selectedCandidateId = resolutionValue.selectedCandidateId === null ? null : text(resolutionValue.selectedCandidateId, 200);
  const selected = candidates.find(candidate => candidate.id === selectedCandidateId);
  const ambiguity = candidates.length === 0 ? 'unresolved' : candidates.length === 1 ? 'single' : 'multiple';
  if (resolutionValue.ambiguity !== ambiguity || selectedCandidateId !== null && !selected || (identity === null) !== (selectedCandidateId === null)) return invalid();
  if (identity && (!selected || selected.bibliographyEntryId !== selectedBibliographyEntryId || identity.candidateId !== selected.id || identity.title !== selected.title || identity.doi !== selected.doi || identity.confidence === 'exact-doi' && selected.confidence !== 'exact-doi')) return invalid();
  const resolution = { candidates, selectedCandidateId, selectedBibliographyEntryId, ambiguity } as EvidenceTrailRecord['resolution'];
  const sourceFingerprint = value.sourceFingerprint === null ? null : hash(value.sourceFingerprint);
  let association: EvidenceTrailRecord['association'] = null;
  if (value.association !== null) {
    const attached = object(value.association, ['sourceIdentityId', 'sourceDocumentId', 'fingerprint', 'basis', 'verification']);
    if (!identity || attached.basis !== 'user-attached' || !['live-local', 'imported-unverified'].includes(String(attached.verification)) || attached.sourceIdentityId !== identity.id || hash(attached.fingerprint) !== sourceFingerprint || hash(attached.sourceDocumentId) !== sourceFingerprint) return invalid();
    association = { sourceIdentityId: identity.id, sourceDocumentId: sourceFingerprint!, fingerprint: sourceFingerprint!, basis: 'user-attached', verification: 'imported-unverified' };
  }
  if ((sourceFingerprint === null) !== (association === null)) return invalid();
  const excerpts: EvidenceExcerpt[] = [];
  for (const item of array(value.excerpts, 3)) {
    const excerpt = object(item, ['id', 'sourceDocumentId', 'text', 'locator', 'provenance']);
    const provenance = object(excerpt.provenance, ['origin', 'fingerprint', 'extractionVersion', 'locator']);
    if (provenance.extractionVersion !== 'pdfjs-text-v1' && provenance.extractionVersion !== 'plain-text-v1') return invalid();
    if (provenance.origin !== (provenance.extractionVersion === 'plain-text-v1' ? 'local-text' : 'local-pdf')) return invalid();
    const location = locator(excerpt.locator);
    const provenanceLocation = locator(provenance.locator);
    const fingerprint = hash(provenance.fingerprint);
    const content = text(excerpt.text, 1200);
    if (JSON.stringify(location) !== JSON.stringify(provenanceLocation) || fingerprint !== sourceFingerprint || location.end - location.start !== content.length || hash(excerpt.sourceDocumentId) !== fingerprint) return invalid();
    const id = await excerptId({ fingerprint, extractionVersion: provenance.extractionVersion }, location, content);
    if (hash(excerpt.id) !== id || excerpts.some(entry => entry.id === id)) return invalid();
    excerpts.push(Object.freeze({ id, sourceDocumentId: fingerprint, text: content, locator: Object.freeze(location),
      provenance: Object.freeze({ origin: provenance.origin as 'local-pdf' | 'local-text', fingerprint, extractionVersion: provenance.extractionVersion, locator: Object.freeze(provenanceLocation) }) }));
  }
  if (excerpts.length && (!association || !citation)) return invalid();
  const analysisExcerptIds = array(value.analysisExcerptIds, 3).map(hash);
  if (new Set(analysisExcerptIds).size !== analysisExcerptIds.length || analysisExcerptIds.some(id => !excerpts.some(excerpt => excerpt.id === id))) return invalid();
  let importedAssessment: EvidenceTrailRecord['assessment'] = null;
  const priorAssessment = value.assessment ?? value.importedAssessment;
  if (priorAssessment !== null) {
    if (!citation || !identity || !association || !analysisExcerptIds.length) return invalid();
    if (!selectedEntry) return invalid();
    const base = { mode: 'evidence' as const, current_passage: current, citation, bibliography_entry: selectedEntry, source_identity: identity, association, excerpts: analysisExcerptIds.map(id => excerpts.find(excerpt => excerpt.id === id)!) };
    const request: EvidenceModelRequest = { ...base, analysis_input_fingerprint: await analysisInputFingerprint(base) };
    importedAssessment = parseAssessment(priorAssessment, request);
  }
  return { version: 1, passage: current, citation, bibliography, identity, resolution, association, sourceFingerprint, excerpts,
    assessment: null, importedAssessment, analysisExcerptIds, sourceAvailable: false, searched: false, verification: 'imported-unverified' };
}

export async function revalidateTrail(record: EvidenceTrailRecord, source: SourceDocument): Promise<EvidenceTrailRecord> {
  // Re-parse the complete record before accepting an in-memory caller's object.
  const parsed = await importTrail(exportTrail(record));
  if (parsed.sourceFingerprint !== source.fingerprint || !(await Promise.all(parsed.excerpts.map(excerpt => validateExcerpt(excerpt, source)))).every(Boolean)) return invalid();
  return { ...parsed, association: parsed.association && { ...parsed.association, verification: 'live-local' }, sourceAvailable: true,
    searched: parsed.excerpts.length > 0, assessment: null, importedAssessment: null, analysisExcerptIds: [], verification: 'live-local' };
}
