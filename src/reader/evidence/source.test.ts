import { describe, expect, it } from 'vitest';
import { ingestText, searchSource, validateExcerpt, parseAssessment, excerptId, analysisInputFingerprint } from './source';
import { exportTrail, importTrail, revalidateTrail } from './transfer';
import type { EvidenceModelRequest, EvidenceTrailRecord } from './types';

async function fixture() {
  const source = await ingestText('The Transformer architecture uses attention without recurrence.\nA second sentence describes translation.', 'Source');
  const excerpts = await searchSource(source, 'Transformer attention recurrence');
  const record: EvidenceTrailRecord = { version: 1, passage: { id: 'passage-1', documentId: 'current-1', text: 'Claim [1]', page: 1, anchor: 'anchor' },
    citation: { id: 'citation-1', raw: '[1]', kind: 'numeric', keys: ['1'], start: 6, end: 9 },
    bibliography: [{ id: 'bib-1', raw: '[1] Source', title: 'Source', label: '1' }], identity: { id: 'identity-1', title: 'Source', candidateId: 'candidate-1', confidence: 'user-confirmed' },
    resolution: { candidates: [{ id: 'candidate-1', title: 'Source', authors: [], provider: 'bibliography', confidence: 'candidate', bibliographyEntryId: 'bib-1', matchedFields: ['numeric-label'] }], selectedCandidateId: 'candidate-1', selectedBibliographyEntryId: 'bib-1', ambiguity: 'single' },
    association: { sourceIdentityId: 'identity-1', sourceDocumentId: source.id, fingerprint: source.fingerprint, basis: 'user-attached', verification: 'live-local' },
    sourceFingerprint: source.fingerprint, excerpts, assessment: null, importedAssessment: null, analysisExcerptIds: [], sourceAvailable: true, searched: true, verification: 'live-local' };
  return { source, excerpts, record };
}

describe('local source provenance', () => {
  it('hashes exact UTF8, preserving raw text and immutable offset evidence', async () => {
    const { source, excerpts } = await fixture();
    expect(source.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect((await ingestText(source.pages[0].text + ' ', 'Source')).fingerprint).not.toBe(source.fingerprint);
    expect(excerpts).toHaveLength(1);
    expect(excerpts[0].text).toBe(source.pages[0].text);
    expect(excerpts[0].locator).toEqual({ page: 1, start: 0, end: source.pages[0].text.length });
    expect(Object.isFrozen(excerpts[0])).toBe(true);
    expect(await validateExcerpt(excerpts[0], source)).toBe(true);
    expect(await validateExcerpt({ ...excerpts[0], text: 'Edited model quotation' }, source)).toBe(false);
    expect(await validateExcerpt(excerpts[0], await ingestText('Different bytes', 'Source'))).toBe(false);
  });
  it('returns no unrelated or stopword-only hits, deterministically caps multiple hits', async () => {
    const source = await ingestText(('Transformer attention recurrence.\n' + 'z'.repeat(1100) + '\n').repeat(5), 'Source');
    expect(await searchSource(source, 'banana telescope')).toEqual([]);
    expect(await searchSource(source, 'the paper does this')).toEqual([]);
    const first = await searchSource(source, 'Transformer attention');
    expect(first).toHaveLength(3);
    expect(await searchSource(source, 'Transformer attention')).toEqual(first);
    for (const excerpt of first) expect(await validateExcerpt(excerpt, source)).toBe(true);
  });
  it('rejects empty and oversized text', async () => {
    await expect(ingestText(' ', 'Source')).rejects.toThrow();
    await expect(ingestText('x'.repeat(2_000_001), 'Source')).rejects.toThrow();
  });
  it('finds Chinese lexical candidates without normalizing authoritative evidence', async () => {
    const source = await ingestText('  研究结果显示，注意力机制不需要循环结构。\n另一项研究未提供相关证据。', '中文来源');
    const excerpts = await searchSource(source, '注意力机制 循环结构');
    expect(excerpts).toHaveLength(1);
    expect(excerpts[0].text.startsWith('  ')).toBe(true);
    expect(await validateExcerpt(excerpts[0], source)).toBe(true);
  });
  it('keeps newline and sentence delimiters at the exclusive cap outside the excerpt', async () => {
    for (const delimiter of ['\n', '. ']) {
      const raw = 'attention ' + 'x'.repeat(1190) + delimiter + 'continued.';
      const source = await ingestText(raw, 'Boundary source');
      const excerpts = await searchSource(source, 'attention');
      expect(excerpts).toHaveLength(1);
      expect(excerpts[0].text).toBe(raw.slice(0, 1200));
      expect(excerpts[0].text.length).toBe(1200);
      expect(await validateExcerpt(excerpts[0], source)).toBe(true);
      const { record } = await fixture();
      record.sourceFingerprint = source.fingerprint;
      record.excerpts = excerpts;
      record.association = { ...record.association!, sourceDocumentId: source.id, fingerprint: source.fingerprint };
      const imported = await importTrail(exportTrail(record));
      expect(imported.excerpts).toEqual(excerpts);
      expect((await revalidateTrail(imported, source)).excerpts).toEqual(excerpts);
    }
  });
});

describe('Evidence Trail explicit transfer', () => {
  it('roundtrips excerpt provenance but strips verification and clears assessment on reattachment', async () => {
    const { source, record } = await fixture();
    const imported = await importTrail(exportTrail(record));
    expect(imported).toEqual({ ...record, association: { ...record.association, verification: 'imported-unverified' }, sourceAvailable: false, searched: false, verification: 'imported-unverified' });
    expect(await revalidateTrail(imported, source)).toEqual(record);
    await expect(revalidateTrail(imported, await ingestText('Changed source', 'Source'))).rejects.toThrow();
  });
  it('does not export source indexes or PDFs', async () => {
    const { record } = await fixture();
    const output = exportTrail({ ...record, pages: ['private unrelated page'], bytes: 'private bytes' } as EvidenceTrailRecord);
    expect(output).not.toContain('private unrelated page');
    expect(output).not.toContain('private bytes');
    const extra = JSON.parse(exportTrail(record));
    extra.passage.sourcePages = ['secret page'];
    extra.excerpts[0].provenance.localPath = '/private/source.pdf';
    expect(exportTrail(extra)).not.toContain('secret page');
    expect(exportTrail(extra)).not.toContain('/private/source.pdf');
  });
  it('does not mistake recomputed imported checksums for authentic source evidence', async () => {
    const { source, record } = await fixture();
    const altered = JSON.parse(exportTrail(record)) as EvidenceTrailRecord;
    const excerpt = altered.excerpts[0];
    excerpt.text = 'X'.repeat(excerpt.text.length);
    excerpt.id = await excerptId(source, excerpt.locator, excerpt.text);
    const imported = await importTrail(JSON.stringify(altered));
    expect(imported.verification).toBe('imported-unverified');
    await expect(revalidateTrail(imported, source)).rejects.toThrow();
  });
  it('rejects tampered text, offsets, fingerprint, extraction, extra properties and oversized files', async () => {
    const { record } = await fixture();
    for (const mutate of [
      (value: EvidenceTrailRecord) => { value.excerpts[0].text += 'false'; },
      (value: EvidenceTrailRecord) => { value.excerpts[0].locator.start = 2; },
      (value: EvidenceTrailRecord) => { value.sourceFingerprint = '0'.repeat(64); },
      (value: EvidenceTrailRecord) => { value.excerpts[0].provenance.extractionVersion = 'pdfjs-text-v1'; },
    ]) {
      const changed = JSON.parse(exportTrail(record)) as EvidenceTrailRecord;
      mutate(changed);
      await expect(importTrail(JSON.stringify(changed))).rejects.toThrow();
    }
    await expect(importTrail(JSON.stringify({ ...record, apiKey: 'secret' }))).rejects.toThrow();
    await expect(importTrail('{')).rejects.toThrow();
    await expect(importTrail(' '.repeat(256 * 1024 + 1))).rejects.toThrow();
  });
  it('rejects current-passage/citation tampering and model quotations or unknown IDs', async () => {
    const { record } = await fixture();
    const base = { mode: 'evidence' as const, current_passage: record.passage, citation: record.citation!, bibliography_entry: record.bibliography[0], source_identity: record.identity!, association: record.association!, excerpts: record.excerpts };
    const request: EvidenceModelRequest = { ...base, analysis_input_fingerprint: await analysisInputFingerprint(base) };
    const aspect = { statement: 'Recurrence-free', relation: 'supports', evidence_excerpt_ids: [record.excerpts[0].id], rationale: 'The exact supplied text states this.' };
    const assessment = { current_passage_id: record.passage.id, citation_id: record.citation!.id, source_identity_id: record.identity!.id,
      analysis_input_fingerprint: request.analysis_input_fingerprint, evidence_excerpt_ids: [record.excerpts[0].id], aspects: [aspect], interpretation: 'Bounded interpretation', uncertainty: 'Only supplied excerpt', missing_evidence: [], kind: 'model-interpretation' };
    expect(parseAssessment(assessment, request).interpretation).toBe('Bounded interpretation');
    expect(() => parseAssessment({ ...assessment, quote: 'Fabricated source quotation' }, request)).toThrow();
    expect(() => parseAssessment({ ...assessment, evidence_excerpt_ids: ['fake'] }, request)).toThrow();
    expect(() => parseAssessment({ ...assessment, current_passage_id: 'another' }, request)).toThrow();
    for (const changes of [
      { interpretation: '  ' }, { uncertainty: '\n\t' },
      { interpretation: 'x'.repeat(2401) }, { uncertainty: 'x'.repeat(1201) },
      { aspects: Array(7).fill(aspect) }, { missing_evidence: ['x'.repeat(601)] },
      { aspects: [{ ...aspect, statement: ' ' }] }, { missing_evidence: [null] },
      { aspects: [{ ...aspect, rationale: 'x'.repeat(601) }] },
      { aspects: [{ ...aspect, evidence_excerpt_ids: [] }] },
      { aspects: [{ ...aspect, relation: 'guarantees' }] },
      { aspects: [{ ...aspect, quote: 'No' }] },
      { aspects: [{ ...aspect, evidence_excerpt_ids: ['0'.repeat(64)] }] },
      { analysis_input_fingerprint: '0'.repeat(64) },
      { evidence_excerpt_ids: [record.excerpts[0].id, record.excerpts[0].id] },
      { evidence_excerpt_ids: Array(4).fill(record.excerpts[0].id) },
      { evidence_excerpt_ids: [] }, { evidence_excerpt_ids: ['A'.repeat(64)] },
    ]) expect(() => parseAssessment({ ...assessment, ...changes }, request)).toThrow();
    expect(parseAssessment({ ...assessment, aspects: [{ ...aspect, relation: 'insufficient', evidence_excerpt_ids: [] }] }, request).aspects[0].relation).toBe('insufficient');
    record.assessment = parseAssessment(assessment, request);
    record.analysisExcerptIds = record.excerpts.map(excerpt => excerpt.id);
    const imported = await importTrail(exportTrail(record));
    expect(imported.assessment).toBeNull();
    expect(imported.importedAssessment).toEqual(record.assessment);
    expect((await importTrail(exportTrail(imported))).importedAssessment).toEqual(record.assessment);
    const revalidated = await revalidateTrail(imported, (await fixture()).source);
    expect(revalidated.assessment).toBeNull();
    expect(revalidated.importedAssessment).toBeNull();
    expect(revalidated.analysisExcerptIds).toEqual([]);
    await expect(importTrail(JSON.stringify({ ...record, citation: { ...record.citation, raw: '[2]' } }))).rejects.toThrow();
    await expect(importTrail(JSON.stringify({ ...record, passage: { ...record.passage, anchor: 'stale anchor' } }))).rejects.toThrow();
    await expect(importTrail(JSON.stringify({ ...record, importedAssessment: record.assessment }))).rejects.toThrow();
  });
  it('rejects mismatched candidates, identity associations and resolution flags', async () => {
    const { record } = await fixture();
    for (const changes of [
      { resolution: { ...record.resolution, selectedCandidateId: 'unknown' } },
      { resolution: { ...record.resolution, selectedBibliographyEntryId: 'unknown' } },
      { resolution: { ...record.resolution, selectedBibliographyEntryId: null } },
      { resolution: { ...record.resolution, ambiguity: 'multiple' } },
      { identity: { ...record.identity, title: 'Wrong source title' } },
      { association: { ...record.association, sourceIdentityId: 'wrong-id' } },
      { association: { ...record.association, fingerprint: '0'.repeat(64) } },
      { association: null },
      { sourceAvailable: 'true' },
    ]) await expect(importTrail(JSON.stringify({ ...record, ...changes }))).rejects.toThrow();
  });
  it('preserves grouped citation selected entry and rejects key/label tampering', async () => {
    const { record } = await fixture();
    record.passage.text = 'Claim [1, 2]';
    record.citation = { ...record.citation!, raw: '[1, 2]', keys: ['1', '2'], end: 12 };
    record.bibliography.push({ id: 'bib-2', raw: '[2] Another source', title: 'Another source', label: '2' });
    const imported = await importTrail(exportTrail(record));
    expect(imported.resolution.selectedBibliographyEntryId).toBe('bib-1');
    record.resolution.selectedBibliographyEntryId = 'bib-2';
    await expect(importTrail(exportTrail(record))).rejects.toThrow();
    record.resolution.selectedBibliographyEntryId = 'bib-1';
    record.bibliography[0].label = '9';
    await expect(importTrail(exportTrail(record))).rejects.toThrow();
    record.bibliography[0].label = '1';
    record.citation.keys = ['1', '9'];
    await expect(importTrail(exportTrail(record))).rejects.toThrow();
  });
  it('requires per-candidate match provenance and rejects legacy aggregate event context', async () => {
    const { record } = await fixture();
    const without = JSON.parse(exportTrail(record));
    delete without.resolution.candidates[0].matchedFields;
    await expect(importTrail(JSON.stringify(without))).rejects.toThrow();
    for (const fields of [[], ['numeric-label', 'numeric-label'], ['unknown'], ['doi', 'numeric-label', 'author-year', 'bibliographic-query', 'doi']]) {
      const changed = JSON.parse(exportTrail(record));
      changed.resolution.candidates[0].matchedFields = fields;
      await expect(importTrail(JSON.stringify(changed))).rejects.toThrow();
    }
    const exact = JSON.parse(exportTrail(record));
    exact.resolution.candidates[0] = { ...exact.resolution.candidates[0], confidence: 'exact-doi', doi: '10.1234/source', matchedFields: ['bibliographic-query'] };
    await expect(importTrail(JSON.stringify(exact))).rejects.toThrow();
    const imported = await importTrail(exportTrail(record));
    expect(imported.resolution.candidates[0].matchedFields).toEqual(['numeric-label']);
    const aggregate = JSON.parse(exportTrail(record));
    aggregate.resolution.matchedFields = ['doi'];
    await expect(importTrail(JSON.stringify(aggregate))).rejects.toThrow();
  });
  it('rejects semantically impossible candidate match provenance', async () => {
    const { record } = await fixture();
    for (const changes of [
      { authors: ['Invented author'] },
      { year: 2020 },
      { matchedFields: ['author-year'] },
      { matchedFields: ['doi'] },
      { matchedFields: ['numeric-label', 'author-year'] },
      { provider: 'bibliography', confidence: 'exact-doi', doi: '10.1234/source', matchedFields: ['doi'] },
      { provider: 'crossref', confidence: 'candidate', matchedFields: ['numeric-label'] },
      { provider: 'crossref', confidence: 'exact-doi', doi: '10.1234/source', matchedFields: ['bibliographic-query'] },
    ]) {
      const changed = JSON.parse(exportTrail(record));
      changed.resolution.candidates[0] = { ...changed.resolution.candidates[0], ...changes };
      await expect(importTrail(JSON.stringify(changed))).rejects.toThrow();
    }
    const crossref = JSON.parse(exportTrail(record));
    crossref.resolution.candidates[0] = { ...crossref.resolution.candidates[0], provider: 'crossref', matchedFields: ['bibliographic-query'] };
    expect((await importTrail(JSON.stringify(crossref))).resolution.candidates[0].matchedFields).toEqual(['bibliographic-query']);
    const exact = JSON.parse(exportTrail(record));
    exact.resolution.candidates[0] = { ...exact.resolution.candidates[0], provider: 'crossref', confidence: 'exact-doi', doi: '10.1234/source', matchedFields: ['doi'] };
    exact.identity = { ...exact.identity, confidence: 'exact-doi', doi: '10.1234/source' };
    exact.bibliography[0].doi = '10.1234/source';
    expect((await importTrail(JSON.stringify(exact))).identity?.confidence).toBe('exact-doi');
    exact.bibliography[0].doi = '10.1234/another';
    await expect(importTrail(JSON.stringify(exact))).rejects.toThrow();
    delete exact.bibliography[0].doi;
    await expect(importTrail(JSON.stringify(exact))).rejects.toThrow();
  });
  it('rejects unlinked bibliography but permits an empty current-paper record', async () => {
    const { record } = await fixture();
    const currentPaper: EvidenceTrailRecord = { ...record, citation: null, bibliography: [], identity: null,
      resolution: { candidates: [], selectedCandidateId: null, selectedBibliographyEntryId: null, ambiguity: 'unresolved' },
      association: null, sourceFingerprint: null, excerpts: [], sourceAvailable: false, searched: false };
    expect((await importTrail(exportTrail(currentPaper))).bibliography).toEqual([]);
    await expect(importTrail(exportTrail({ ...currentPaper, bibliography: record.bibliography }))).rejects.toThrow();
    await expect(importTrail(exportTrail({ ...currentPaper, citation: record.citation, bibliography: record.bibliography }))).rejects.toThrow();
    const matchedOnly = { ...currentPaper, citation: record.citation, bibliography: record.bibliography,
      resolution: { ...currentPaper.resolution, selectedBibliographyEntryId: 'bib-1' } };
    expect((await importTrail(exportTrail(matchedOnly))).resolution.selectedBibliographyEntryId).toBe('bib-1');
  });
});
