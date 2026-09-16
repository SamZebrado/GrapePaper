> Historical v0.1.20 snapshot. For current reading/PDF/AI/Zotero capabilities, see the [README](../README.md).

# GrapePaper Visual / Product V2 — Known limitations

Date: 2026-08-30

## Product boundary

- Chat is a local mock interaction. It appends a deterministic placeholder response after a short delay and does not call an AI/LLM service.
- Citations use sample data and are display-only. Users cannot create, edit, delete, or synchronize citations, and there is no Zotero integration.
- Markdown import/export preserves the document title and plain paragraph text only. It intentionally does not roundtrip annotations, citations, chat threads, or rich-text formatting. Use JSON for the full supported document structure.
- PDF import/rendering, DOCX/LaTeX import, dark theme, and mobile layout are not implemented.
- The layout is validated for desktop at 1440×800 and for the specified 900×800 narrow fallback. Widths below 900px are not a supported mobile experience.

## Engineering limitations

- The production JavaScript bundle is approximately 672 kB minified (about 212 kB gzip), so Vite emits its >500 kB advisory. Code splitting is not part of this visual/product release.
- `npm install --ignore-scripts` on the current lockfile reports 9 dependency audit findings (1 low, 1 moderate, 7 high). They were recorded rather than automatically upgraded because an indiscriminate audit fix could change the tested dependency graph; dependency remediation requires a separate scoped update and regression pass.
- Automated tests emit a Node `--localstorage-file` warning from the test environment and a jsdom navigation diagnostic. The final assertions still pass; neither message is claimed as a clean-console production-browser result.
- `npm run lint` is blocked before file analysis because the tracked ESLint configuration expects `eslint-plugin-react-hooks.configs.flat.recommended`, which the installed plugin does not expose. This pre-existing tooling mismatch is not represented as a lint PASS; repairing and then resolving the legacy lint backlog is a separate scoped maintenance task.
- The source archive is a local release artifact. It does not imply a hosted deployment, publication, or remote push.

## Evidence interpretation

- English/Chinese switching localizes application chrome; it does not translate authored manuscript content.
- Visual regression tolerates at most 0.1% changed pixels for a same-size frozen baseline. The observed overview delta was 3 of 1,152,000 pixels with maximum channel delta 1; citation, chat, and Chinese captures matched their frozen hashes exactly in the development-server QA.
- A passing build or test suite does not replace the captured 1440/900 visual and interaction evidence.
