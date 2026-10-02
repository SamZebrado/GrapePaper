# Evidence Trail V1

A local, inspectable **Citation → Source → Evidence → Boundary** loop, not an autonomous research agent or factual-verification service.

## One reading loop

1. Select a current-paper passage containing a numeric `[1]` or recognizable author-year citation.
2. Check the extracted bibliography or supply complete reference text. Unknown formats and duplicate entries remain unresolved; choose one entry explicitly.
3. Optionally query metadata through the configured companion service. Crossref must be enabled on the server with `GRAPEPAPER_CROSSREF_ENABLED=1`. Search results remain candidates; exact DOI metadata is identity, not claim support. Offline manual confirmation remains available.
4. Confirm source identity, then explicitly confirm that the local PDF/text you supply corresponds to it. This association is user-attested, not automatically verified from filenames or DOI similarity.
5. Search local source text. Inspect candidate exact text, extraction-page number, page text and character range. Choose the excerpts to send for interpretation.
6. Invoke the connected companion explicitly. Source text and model interpretation remain visually separate; each interpreted aspect carries its own relation and excerpt references.
7. Explicitly export a JSON record if needed. Imported records are unverified, with prior interpretation quarantined. Reattach identical local source bytes/text and matching extraction locators before generating fresh interpretation.

## Seven distinct boundaries

- Current paper only.
- Bibliography match only.
- Resolved source identity, text unavailable.
- Local source text available, not searched.
- Searched, no relevant candidate excerpt found.
- Source excerpt located (lexical relevance, not established scientific support).
- Model interpretation from located excerpts (not independent verification).

Only the canonical asynchronous state validator may derive these states. Identity confidence, retrieval relevance and model-assessed support relation are separate. Missing evidence is not filled with generated quotations.

## Local extraction and provenance

PDF.js extracts text locally. The source fingerprint is SHA-256 of exact PDF bytes; plain-text sources use exact UTF-8 bytes. Excerpt IDs bind fingerprint, extraction version, page, range and exact text. Pages are 1-based extraction pages, with printed labels separate. Ranges are JavaScript UTF-16 offsets into exact page text: `page.text.slice(start,end) === excerpt.text`.

Source limits: 100 MB, 500 pages, two million extracted characters. Retrieval returns at most three 1,200-character lexical candidates. PDF reading order may be imperfect; scanned PDFs without a text layer are unavailable, not OCR-processed. No publisher fetching or paywall scraping occurs.

Source files, indexes and new records are memory-only. No source PDF is uploaded or automatically written to browser storage. The explicit interpretation request sends the current passage, selected citation/bibliography entry, identity/association and checked excerpts—not the whole PDF or unselected source pages. Keys remain server-side. Explicit JSON export contains selected text and excerpts; treat it as potentially private.

## Same-service structured contract

The existing `POST /api/companion` supports two additional modes; legacy explanation mode is unchanged.

- `mode: "resolve"`, `entry`: bounded bibliography metadata. Response includes the same `entry_id`, candidates and `lookup` (`disabled`, `available`, `unavailable`). Only the fixed Crossref metadata host is used. Disabled/outage is not reported as a no-match scientific result.
- `mode: "evidence"`: `current_passage`, `citation`, `bibliography_entry`, `source_identity`, explicit local `association`, immutable `excerpts`, and `analysis_input_fingerprint`. This hash binds exact analysis input and ordered selected excerpt IDs.
- Response: `assessment` with copied passage/citation/source IDs and input hash, supplied `evidence_excerpt_ids`, per-aspect `statement`, `relation`, excerpt IDs and `rationale`, `interpretation`, `uncertainty`, `missing_evidence`, and `kind: "model-interpretation"`.

Models cannot supply authoritative quotation, locator or fingerprint fields. Invalid schemas, unsupplied IDs and changed input hashes fail closed. Source/citation/query/endpoint changes and aborted/timed-out requests cannot promote stale responses. No evidence means unavailable, with no model call.

## Export/import and limitations

Version-1 records preserve current passage, citation, matched bibliography, bounded candidate-specific resolver/match provenance, selected entry, user-confirmed association, source fingerprint, exact excerpts and analysis input bindings. Imports are bounded to 256 KB and do not inherit live verification. Cryptographic self-consistency is not authenticity; actual local extraction must be rechecked. Reattachment clears both active and imported interpretations.

Deterministic tests and browser E2E use synthetic papers and controlled resolver/model responses. They test evidence boundaries, not the scientific accuracy of a real model. No real provider quality claim is made. No OCR, general research agent, vector database, cloud sync or additional Zotero payload is introduced.
