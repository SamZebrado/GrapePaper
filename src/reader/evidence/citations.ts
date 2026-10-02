import type { BibliographyEntry, InTextCitation, SourceIdentityCandidate } from './types';
export { assertCanonicalBibliographyEntry, detectCitations, normalizeDoi, parseBibliography } from './citationParser.mjs';

const authorKey = (value: string) => value.normalize('NFKC').toLocaleLowerCase('en').replace(/[’']/g, "'");
const key = (author: string, year: string) => `${authorKey(author)}|${year.toLowerCase()}`;

/** All matching entries survive duplicate labels/author-years: caller must choose. */
export function matchCitation(citation: InTextCitation, entries: BibliographyEntry[]): BibliographyEntry[] {
  return entries.filter(entry => citation.kind === 'numeric'
    ? entry.label !== undefined && citation.keys.includes(entry.label)
    : entry.authorKey !== undefined && entry.year !== undefined && citation.keys.includes(key(entry.authorKey, entry.year)));
}

export function bibliographyCandidate(entry: BibliographyEntry): SourceIdentityCandidate {
  return { id: `bibliography:${entry.id}`, bibliographyEntryId: entry.id, matchedFields: entry.label ? ['numeric-label'] : entry.authorKey && entry.year ? ['author-year'] : [], title: entry.title, doi: entry.doi, authors: entry.authorKey ? [entry.authorKey] : [],
    year: entry.year ? Number(entry.year.slice(0, 4)) : undefined, provider: 'bibliography', confidence: 'candidate' };
}
