import { analysisInputFingerprint, excerptId, parseAssessment, validateExcerpt } from './source';
import { assertCanonicalBibliographyEntry, detectCitations, matchCitation } from './citations';
import { assertCandidateProvenance } from './candidateProvenance';
import type { EvidenceModelRequest, EvidenceState, EvidenceTrailRecord, SourceDocument } from './types';

/** One canonical, non-mutating state derivation; no consumer stores/promotes its own state. */
function deriveStructuralEvidenceState(record: EvidenceTrailRecord): EvidenceState {
  assertStructure(record);
  if (record.verification === 'imported-unverified') return record.bibliography.length ? 'BIBLIOGRAPHY_MATCH_ONLY' : 'CURRENT_PAPER_ONLY';
  if (record.assessment) return 'MODEL_INTERPRETATION_FROM_LOCATED_EXCERPT';
  if (record.excerpts.length) return 'RELEVANT_SOURCE_EXCERPT_LOCATED';
  if (record.sourceAvailable) return record.searched ? 'SOURCE_TEXT_SEARCHED_RELEVANT_EXCERPT_NOT_FOUND' : 'SOURCE_TEXT_AVAILABLE_NOT_SEARCHED';
  if (record.identity) return 'SOURCE_IDENTITY_RESOLVED_TEXT_UNAVAILABLE';
  return record.bibliography.length ? 'BIBLIOGRAPHY_MATCH_ONLY' : 'CURRENT_PAPER_ONLY';
}
/** The ONLY public state API: cryptographic validation must precede state 7. */
export async function deriveEvidenceState(record: EvidenceTrailRecord, source?: SourceDocument): Promise<EvidenceState> {
  await assertEvidenceStateConsistency(record, source);
  return deriveStructuralEvidenceState(record);
}
function assertStructure(record: EvidenceTrailRecord) {
  const fail = () => { throw new Error('Evidence state/provenance is inconsistent.'); };
  for (const entry of record.bibliography) assertCanonicalBibliographyEntry(entry);
  if (record.citation && !detectCitations(record.passage.text).some(citation => citation.raw === record.citation?.raw && citation.kind === record.citation.kind && citation.start === record.citation.start && citation.end === record.citation.end && JSON.stringify(citation.keys) === JSON.stringify(record.citation.keys))) fail();
  const selectedEntry = record.bibliography.find(entry => entry.id === record.resolution.selectedBibliographyEntryId);
  if (record.bibliography.length && (!record.citation || !selectedEntry || matchCitation(record.citation, [selectedEntry]).length !== 1)) fail();
  if (!record.bibliography.length && record.resolution.selectedBibliographyEntryId !== null) fail();
  const candidateIds = record.resolution.candidates.map(candidate => candidate.id);
  const ambiguity = candidateIds.length === 0 ? 'unresolved' : candidateIds.length === 1 ? 'single' : 'multiple';
  if (candidateIds.length > 10 || new Set(candidateIds).size !== candidateIds.length || record.resolution.ambiguity !== ambiguity || (record.identity === null) !== (record.resolution.selectedCandidateId === null)) fail();
  if (record.verification === 'imported-unverified' && (record.assessment || record.sourceAvailable)) fail();
  if (record.identity && (!record.resolution.candidates.some(candidate => candidate.id === record.identity?.candidateId) || record.resolution.selectedCandidateId !== record.identity.candidateId)) fail();
  if (record.identity && !record.bibliography.some(entry => entry.id === record.resolution.selectedBibliographyEntryId)) fail();
  if (record.identity && record.resolution.candidates.find(candidate => candidate.id === record.identity?.candidateId)?.bibliographyEntryId !== record.resolution.selectedBibliographyEntryId) fail();
  const selectedCandidate = record.resolution.candidates.find(candidate => candidate.id === record.resolution.selectedCandidateId);
  if (record.identity && (!selectedCandidate || record.identity.title !== selectedCandidate.title || record.identity.doi !== selectedCandidate.doi || record.identity.confidence === 'exact-doi' && selectedCandidate.confidence !== 'exact-doi')) fail();
  if (record.resolution.candidates.some(candidate => !Array.isArray(candidate.matchedFields) || !candidate.matchedFields.length || candidate.matchedFields.length > 4 || new Set(candidate.matchedFields).size !== candidate.matchedFields.length)) fail();
  for (const candidate of record.resolution.candidates) assertCandidateProvenance(record.citation, record.bibliography, candidate);
  if ((record.sourceFingerprint === null) !== (record.association === null)) fail();
  if (record.association && record.association.verification !== record.verification) fail();
  if (record.association && (!record.identity || record.association.sourceIdentityId !== record.identity.id || record.association.fingerprint !== record.sourceFingerprint || record.association.sourceDocumentId !== record.sourceFingerprint || record.association.basis !== 'user-attached')) fail();
  if (record.sourceAvailable && (!record.association || record.association.verification !== 'live-local' || !record.identity)) fail();
  if (record.verification === 'live-local' && (record.searched || record.excerpts.length || record.assessment) && !record.sourceAvailable) fail();
  if (record.verification === 'live-local' && record.excerpts.length && !record.searched) fail();
  const excerptIds = record.excerpts.map(excerpt => excerpt.id);
  if (excerptIds.length > 3 || new Set(excerptIds).size !== excerptIds.length || record.analysisExcerptIds.length > 3 || new Set(record.analysisExcerptIds).size !== record.analysisExcerptIds.length || record.analysisExcerptIds.some(id => !excerptIds.includes(id))) fail();
  if (record.excerpts.some(excerpt => excerpt.sourceDocumentId !== record.sourceFingerprint || excerpt.provenance.fingerprint !== record.sourceFingerprint || excerpt.text.length !== excerpt.locator.end - excerpt.locator.start)) fail();
  if (record.assessment && (!record.citation || !record.identity || !record.excerpts.length || !record.searched || !record.analysisExcerptIds.length || record.assessment.current_passage_id !== record.passage.id || record.assessment.citation_id !== record.citation.id || record.assessment.source_identity_id !== record.identity.id || record.assessment.evidence_excerpt_ids.some(id => !record.analysisExcerptIds.includes(id)))) fail();
}
/** Cryptographic consistency is not authenticity. A live source also verifies actual local text. */
export async function assertEvidenceStateConsistency(record: EvidenceTrailRecord, source?: SourceDocument) {
  assertStructure(record);
  for (const excerpt of record.excerpts) {
    if (excerpt.id !== await excerptId({ fingerprint: excerpt.provenance.fingerprint, extractionVersion: excerpt.provenance.extractionVersion }, excerpt.locator, excerpt.text)) throw new Error('Excerpt content changed.');
    if (source && !await validateExcerpt(excerpt, source)) throw new Error('Source fingerprint / extraction mismatch.');
  }
  if (record.sourceAvailable && (!source || source.fingerprint !== record.sourceFingerprint)) throw new Error('Live source is required.');
  if (record.assessment) {
    const input = { mode: 'evidence' as const, current_passage: record.passage, citation: record.citation!, bibliography_entry: record.bibliography.find(entry => entry.id === record.resolution.selectedBibliographyEntryId)!, source_identity: record.identity!, association: record.association!, excerpts: record.analysisExcerptIds.map(id => record.excerpts.find(excerpt => excerpt.id === id)!).filter(Boolean) };
    if (input.excerpts.length !== record.analysisExcerptIds.length) throw new Error('Analysis excerpt is missing.');
    const request: EvidenceModelRequest = { ...input, analysis_input_fingerprint: await analysisInputFingerprint(input) };
    parseAssessment(record.assessment, request);
  }
}
