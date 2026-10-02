/** Evidence Trail V1: extraction owns evidence; metadata and models never promote it. */
export const EVIDENCE_STATES = [
  'CURRENT_PAPER_ONLY', 'BIBLIOGRAPHY_MATCH_ONLY',
  'SOURCE_IDENTITY_RESOLVED_TEXT_UNAVAILABLE', 'SOURCE_TEXT_AVAILABLE_NOT_SEARCHED',
  'SOURCE_TEXT_SEARCHED_RELEVANT_EXCERPT_NOT_FOUND', 'RELEVANT_SOURCE_EXCERPT_LOCATED',
  'MODEL_INTERPRETATION_FROM_LOCATED_EXCERPT',
] as const;
export type EvidenceState = typeof EVIDENCE_STATES[number];
export interface CurrentPassage { id: string; documentId: string; text: string; page: number; anchor: string }
/** start/end are UTF-16 offsets into exact CurrentPassage.text, end exclusive. */
export interface InTextCitation { id: string; raw: string; kind: 'numeric' | 'author-year'; keys: string[]; start: number; end: number }
export interface BibliographyEntry { id: string; raw: string; label?: string; authorKey?: string; year?: string; title: string; doi?: string }
export interface SourceIdentityCandidate { id: string; title: string; doi?: string; authors: string[]; year?: number; provider: 'bibliography' | 'crossref'; confidence: 'candidate' | 'exact-doi'; bibliographyEntryId?: string; matchedFields?: ('doi' | 'author-year' | 'numeric-label' | 'bibliographic-query')[] }
export interface ResolvedSourceIdentity { id: string; title: string; doi?: string; confidence: 'user-confirmed' | 'exact-doi'; candidateId: string }
export type SourceDocumentFingerprint = string; // SHA-256 of exact local file bytes, not title/DOI.
/** 1-based extraction page; start/end are JS UTF-16 offsets in exact SourcePage.text.
 * page.text.slice(start, end) === excerpt.text; printed page label is separate. */
export interface SourceLocator { page: number; start: number; end: number; pageLabel?: string }
export interface SourcePage { page: number; text: string; pageLabel?: string }
export interface SourceDocument { id: string; fingerprint: SourceDocumentFingerprint; title: string; pages: SourcePage[]; extractionVersion: 'pdfjs-text-v1' | 'plain-text-v1' }
export interface ProvenanceRecord { origin: 'local-pdf' | 'local-text'; fingerprint: SourceDocumentFingerprint; extractionVersion: SourceDocument['extractionVersion']; locator: SourceLocator }
export interface EvidenceExcerpt { id: string; sourceDocumentId: string; text: string; locator: SourceLocator; provenance: ProvenanceRecord }
export interface SourceAssociation {
  sourceIdentityId: string; sourceDocumentId: string; fingerprint: SourceDocumentFingerprint;
  basis: 'user-attached'; verification: 'live-local' | 'imported-unverified';
}
export interface IdentityResolution {
  candidates: SourceIdentityCandidate[]; selectedCandidateId: string | null;
  selectedBibliographyEntryId: string | null;
  ambiguity: 'unresolved' | 'single' | 'multiple';
}
export interface EvidenceAspectAssessment {
  statement: string; relation: 'supports' | 'contradicts' | 'mentions' | 'insufficient';
  evidence_excerpt_ids: string[]; rationale: string;
}
export interface EvidenceAssessment {
  current_passage_id: string; citation_id: string; source_identity_id: string;
  analysis_input_fingerprint: string; evidence_excerpt_ids: string[]; aspects: EvidenceAspectAssessment[];
  interpretation: string; uncertainty: string; missing_evidence: string[];
  kind: 'model-interpretation';
}
export interface EvidenceTrailRecord {
  version: 1; passage: CurrentPassage; citation: InTextCitation | null;
  bibliography: BibliographyEntry[]; identity: ResolvedSourceIdentity | null;
  resolution: IdentityResolution; association: SourceAssociation | null;
  sourceFingerprint: SourceDocumentFingerprint | null; excerpts: EvidenceExcerpt[];
  assessment: EvidenceAssessment | null;
  importedAssessment: EvidenceAssessment | null;
  analysisExcerptIds: string[]; // Exact request subset/order; permits recomputation of analysis input hash.
  /** Canonical state derivation owns these retrieval lifecycle flags, never a UI heuristic. */
  sourceAvailable: boolean; searched: boolean;
  /** Imported records retain data, not verification. Reattach matching bytes before interpretation. */
  verification: 'live-local' | 'imported-unverified';
}
export interface EvidenceModelRequest {
  mode: 'evidence'; current_passage: CurrentPassage; citation: InTextCitation; bibliography_entry: BibliographyEntry;
  source_identity: ResolvedSourceIdentity; association: SourceAssociation; excerpts: EvidenceExcerpt[];
  analysis_input_fingerprint: string;
}
export interface ResolverAdapter {
  resolve(entry: BibliographyEntry, signal?: AbortSignal): Promise<SourceIdentityCandidate[]>;
}
