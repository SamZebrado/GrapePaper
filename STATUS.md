# STATUS

## Release

GrapePaper v0.1.20 — Visual / Product V2 is complete for local source release as of 2026-08-30.

This archive contains source code only. It does not claim a hosted deployment, publication, or remote push.

## Included product boundary

- Desktop academic writing canvas with editable StoneSlab paragraphs, GrapeLeaf annotation create/edit/delete, display-only Dewdrop citations, bounded decorative VineConnector SVGs, grouped file and maintenance actions, local persistence, English and Simplified Chinese application chrome, and a clearly labelled mock discussion panel.
- JSON import/export preserves the supported document structure, including nested annotations, chat threads/messages, and citation display fields.
- Markdown import/export intentionally preserves only the title and plain paragraph text.
- Chat remains a local simulation. Citations remain sample/display-only.

## Verification

- Clean dependency install: PASS with `npm ci --ignore-scripts`.
- Automated tests: PASS — 11 files, 98/98 tests.
- Typecheck: PASS.
- Production build: PASS — 550 modules.
- Production Chromium checks: PASS for English/Chinese smoke, reload recovery, JSON/Markdown contracts, annotation lifecycle, citation pointer/keyboard behavior, mock chat, reduced motion, 1440×800 and 900×800 layouts, horizontal overflow, and bounded connector geometry.
- Visual comparison against the accepted desktop baselines remained within 0.0346% changed pixels, with maximum channel delta 1.
- Lint is not marked PASS because of the documented ESLint/plugin configuration mismatch.

## Excluded scope

PDF import/rendering, Zotero integration, real AI/LLM connectivity, DOCX/LaTeX import, dark theme, and mobile layout are not included.

See `docs/V2_KNOWN_LIMITATIONS.md` for the public limitation contract.
