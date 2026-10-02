import { describe, expect, it } from 'vitest';
import { assertCanonicalBibliographyEntry, bibliographyCandidate, detectCitations, matchCitation, normalizeDoi, parseBibliography } from './citations';

describe('Evidence Trail conservative citation parser', () => {
  it('expands bounded numeric ranges and retains source offsets', () => {
    const text = 'An observation [1, 3–5; 8] follows.';
    const [citation] = detectCitations(text);
    expect(citation.keys).toEqual(['1', '3', '4', '5', '8']);
    expect(text.slice(citation.start, citation.end)).toBe(citation.raw);
    expect(detectCitations(text)[0].id).toBe(citation.id);
  });
  it('refuses malformed, reversed and excessive ranges rather than truncating', () => {
    expect(detectCitations('[3-1] [0] [1-9999] [1, x] [1/2]')).toEqual([]);
    expect(detectCitations('[1,1,2]')[0].keys).toEqual(['1', '2']);
  });
  it('recognizes narrative, multiple parenthetical authors and year suffixes', () => {
    const citations = detectCitations('Smith et al. (2020a, 2020b) agree (Jones & Doe, 2021; García, 2019).');
    expect(citations.map(item => item.keys)).toEqual([['smith|2020a', 'smith|2020b'], ['jones|2021', 'garcía|2019']]);
  });
  it('does not infer an author from a bare year, prose or incomplete group', () => {
    expect(detectCitations('in (2020), (2020), (in, 2020) and (Smith, 2020; unclear)')).toEqual([]);
    expect(detectCitations('(Smith, 2020a, 2020b)')[0].keys).toEqual(['smith|2020a', 'smith|2020b']);
  });
  it('retains multiline bibliography, DOI and numeric labels', () => {
    const entries = parseBibliography('References\n[1] Smith, J. (2020a). First paper.\nJournal 4. https://doi.org/10.1234/ABC.\n[2] Jones, D. (2021). Second paper.');
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ label: '1', authorKey: 'smith', year: '2020a', doi: '10.1234/abc' });
    expect(entries[0].raw).toContain('\nJournal 4');
    expect(entries[1].doi).toBeUndefined();
    expect(matchCitation(detectCitations('[1, 2]')[0], entries)).toEqual(entries);
  });
  it('keeps duplicate author-years ambiguous and suffixes distinct', () => {
    const entries = parseBibliography('Smith, J. (2020). A.\nSmith, K. (2020). B.\nSmith, J. (2020a). C.\nSmith, J. (2020b). D.');
    expect(matchCitation(detectCitations('(Smith, 2020)')[0], entries)).toHaveLength(2);
    expect(matchCitation(detectCitations('Smith (2020a)')[0], entries).map(item => item.title)).toEqual(['C.']);
    expect(matchCitation(detectCitations('(Jones, 2020)')[0], entries)).toEqual([]);
  });
  it('retains duplicate numeric labels and unknown author identity', () => {
    const entries = parseBibliography('[01] Unidentified title 2020.\n[1] Smith, J. (2020). Other.');
    expect(matchCitation(detectCitations('[1]')[0], entries)).toHaveLength(2);
    expect(entries[0].authorKey).toBeUndefined();
    expect(bibliographyCandidate(entries[0]).confidence).toBe('candidate');
  });
  it('does not promote a DOI-bearing bibliography to exact identity or evidence', () => {
    const [entry] = parseBibliography('[1] Smith, J. (2020). Test. doi:10.1234/ABC');
    expect(bibliographyCandidate(entry)).toMatchObject({ doi: '10.1234/abc', provider: 'bibliography', confidence: 'candidate', authors: ['smith'], year: 2020 });
  });
  it('normalizes DOI prefixes/punctuation while preserving balanced DOI parentheses', () => {
    expect(normalizeDoi('https://doi.org/10.1234/AbC).')).toBe('10.1234/abc');
    expect(normalizeDoi('DOI: 10.1234/foo(bar).')).toBe('10.1234/foo(bar)');
    expect(normalizeDoi('not a doi')).toBeUndefined();
  });
  it('ignores extraction page headings and keeps stable output', () => {
    const input = '[PDF page 9]\nBibliography\nSmith et al. (2020). A.\nJones, J. (2021). B.';
    expect(parseBibliography(input)).toHaveLength(2);
    expect(parseBibliography(input)).toEqual(parseBibliography(input));
  });
  it('does not pretend truncated or oversized entries and excessive ranges are complete', () => {
    expect(detectCitations('[1-31]')).toEqual([]);
    expect(parseBibliography('[1] Smith, J. (2020). ' + 'x'.repeat(4000))).toEqual([]);
    expect(parseBibliography('[1] Smith, J. (2020). ' + 'x'.repeat(24_001))).toEqual([]);
    const tail = '\n[1] Smith, A. (2020). An unfinished tit';
    const alreadyClipped = 'x'.repeat(24000 - tail.length) + tail;
    expect(alreadyClipped).toHaveLength(24000);
    expect(parseBibliography(alreadyClipped)).toEqual([]);
  });
  it('re-derives every semantic field from raw without prescribing opaque IDs', () => {
    const [entry] = parseBibliography('[2] Smith, J. (2020a). Real paper. doi:10.1234/A');
    expect(() => assertCanonicalBibliographyEntry({ ...entry, id: 'opaque-external-id' })).not.toThrow();
    for (const patch of [{ label: '1' }, { authorKey: 'jones' }, { year: '2021' }, { doi: '10.1234/b' }, { title: 'Forged paper' }, { doi: undefined }]) {
      expect(() => assertCanonicalBibliographyEntry({ ...entry, ...patch })).toThrow('provenance');
    }
    expect(() => assertCanonicalBibliographyEntry({ ...entry, raw: entry.raw + '\n[3] Jones, J. (2021). Another.' })).toThrow('provenance');
  });
});
