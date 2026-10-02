import type { BibliographyEntry, InTextCitation } from './types';
export function normalizeDoi(value: string): string | undefined;
export function detectCitations(text: string): InTextCitation[];
export function parseBibliography(text: string): BibliographyEntry[];
export function assertCanonicalBibliographyEntry(entry: BibliographyEntry): void;
