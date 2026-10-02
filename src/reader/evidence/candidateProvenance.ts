import { bibliographyCandidate, matchCitation } from './citations';
import type { BibliographyEntry, InTextCitation, SourceIdentityCandidate } from './types';

/** Candidate metadata match provenance is independent of source-content support. */
export function assertCandidateProvenance(citation: InTextCitation | null, bibliography: BibliographyEntry[], candidate: SourceIdentityCandidate): void {
  const fail = (): never => { throw new Error('Invalid candidate match provenance.'); };
  const entry = bibliography.find(item => item.id === candidate.bibliographyEntryId);
  if (!citation || !entry || matchCitation(citation, [entry]).length !== 1) return fail();
  let expected: string;
  if (candidate.provider === 'bibliography') {
    const derived = bibliographyCandidate(entry);
    if (candidate.confidence !== 'candidate' || candidate.title !== entry.title || candidate.doi !== entry.doi || candidate.year !== derived.year || JSON.stringify(candidate.authors) !== JSON.stringify(derived.authors)) return fail();
    expected = citation.kind === 'numeric' ? 'numeric-label' : 'author-year';
  } else if (candidate.provider === 'crossref' && candidate.confidence === 'exact-doi') {
    if (!entry.doi || candidate.doi !== entry.doi) return fail();
    expected = 'doi';
  } else if (candidate.provider === 'crossref' && candidate.confidence === 'candidate') {
    expected = 'bibliographic-query';
  } else return fail();
  if (!Array.isArray(candidate.matchedFields) || candidate.matchedFields.length !== 1 || candidate.matchedFields[0] !== expected) return fail();
}
