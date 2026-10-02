# Zotero 10 compatibility audit — 2026-10-01

Baseline: GitHub main `90387235771f306dcf3b62a1c80ba5ccd13cbd77`.
Inspected installed official Zotero 10.0.4 application resources without opening a user profile.

## Evidence and version strategy

- [Zotero 10 developer guide](https://www.zotero.org/support/dev/zotero_10_for_developers): declares `10.0.*` as the compatibility ceiling. Its changes to collection selection, search, database storage, cookies, menus and localization do not affect this plugin: it uses none of those APIs.
- [Zotero 9 developer guide](https://www.zotero.org/support/dev/zotero_9_for_developers): no major developer-facing changes.
- [Official reader source](https://github.com/zotero/zotero/blob/10.0.4/chrome/content/zotero/xpcom/reader.js): installed 10.0.4 `app/omni.ja` confirms synchronous event dispatch, `renderTextSelectionPopup`, `(type, handler, pluginID)` registration, `(type, handler)` removal, and public `itemID` getter.
- [Preference panes](https://github.com/zotero/zotero/blob/10.0.4/chrome/content/zotero/xpcom/preferencePanes.js): `register()` returns a Promise of pane ID; `unregister(id)` remains available. XHTML fragments retain XUL default namespace and `html:` tags.
- [Plugin lifecycle](https://github.com/zotero/zotero/blob/10.0.4/chrome/content/zotero/xpcom/plugins.js): startup/shutdown remain supported, plugin scope loads bootstrap, disable invokes shutdown. Default prefs retain support.
- [URL launch](https://github.com/zotero/zotero/blob/10.0.4/chrome/content/zotero/xpcom/zotero.js): `launchURL(url)` still delegates HTTP URLs to the external handler.

The old manifest capped installation at 8.0.*. Initial patch: version 0.1.1 and ceiling 10.0.*, retaining minimum 7.0. Real installation subsequently identified a missing mandatory update_url (see below); static API and fixture checks had not caught it. No bootstrap, preferences, payload or web handler changes were required. Declared compatibility is not a claim of desktop testing on 7, 8 or 9.

Metadata remains restricted to the active reader's attachment and its parent title/DOI. Page remains `annotation.position.pageIndex + 1`. Selection popup appends synchronously; metadata is read only on explicit click. Shutdown disables captured callbacks, removes tracked buttons/listener and unregisters the preference pane, including late async registration.

## Real desktop smoke — 10.0.4 on macOS, 2026-10-02

Official pinned Zotero 10.0.4 was run in a fresh temporary profile with a separate temporary data directory, no Sync account and no normal library. A synthetic bibliographic item (title `GrapePaper public smoke fixture`, deliberately synthetic DOI `10.1234/grapepaper-smoke`) held the public [W3C Dummy PDF](https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf). This DOI is a transport fixture, not a scholarly source.

- The original XPI passed ZIP integrity but the actual installer rejected it: `applications.zotero.update_url not provided`. The official 10.0.4 packaged manifest parser requires this field. The bounded fix adds a project-owned HTTPS URL and public empty update feed; Pages copies it through the normal build. No automatic update is advertised.
- Rebuilt 0.1.1 installed active/enabled without compatibility rejection. XPI SHA256: `b69cb5604b120ffe1744c3ed435acafb7afc5749b63aabcb92d4353ec2b16d29`.
- Actual preference pane rendered, saved the loopback receiver, persisted on close/reopen, rejected non-loopback HTTP, and restored the saved URL.
- Actual pointer selection of `Dummy PDF file` produced exactly one companion button in the native reader popup. Explicit button click launched the OS browser with text, page 1, parent title and DOI only. The actual receiving page consumed the fragment and did not mark the passage read.
- Disable removed the injected button and pane; fresh selection while disabled had no integration. Re-enable restored one button and pane. Closing/reopening the PDF retained behavior.
- Clean quit/relaunch of the same isolated profile retained plugin, preference, synthetic item and PDF. The actual restarted reader selected the full fixture text and produced the same allowlisted handoff. No GrapePaper startup exception was observed.

This is a bounded basic reader/focus/lifecycle smoke, not comprehensive accessibility testing. Zotero 7/8 were not run. Real model inference remains separate and unverified. Local screenshots and sanitized review evidence are kept outside the repository; independent smoke and release QA are separate gates.

## Reproduce safely

Run `node zotero/prepare-smoke.mjs` to create a fresh temporary profile and a separate data directory. It prints a manual launch command and does not launch the app. Do not sign into Sync, import private documents, or use the normal library. Use a public/synthetic text-layer PDF. Temporary data is not automatically deleted.

1. Start the printed independent profile; install `dist/grapepaper-0.1.1.xpi`; verify enabled.
2. In GrapePaper preferences save a trusted HTTPS or loopback URL; reopen preferences and verify the value.
3. Open the test PDF, select text, verify the 🍇 button; clicking opens the web page with text, one-based PDF page and available title/DOI. No passage is automatically marked read.
4. Disable: existing button disappears and a fresh selection has none. Re-enable: a fresh selection restores exactly one working button.

If anything fails, record Zotero version, plugin enabled/disabled state, exact step, preference URL origin (omit sensitive content), expected/actual page, Tools → Developer → Error Console errors and Help → Debug Output Logging output for that short reproduction. Do not share private selections or full launch URLs/fragments. `-ZoteroDebugText` outputs diagnostic logs to the launching terminal.

Remaining limits: other Zotero versions, comprehensive keyboard/accessibility behavior and private-library workflows are not covered by this isolated smoke.

## Automatic gate and independent review

2026-10-01: 127 frontend + 19 server + 12 Zotero tests passed (158 total); typecheck, lint:reading, build, build:zotero, XPI archive integrity and git diff --check passed. The two initial server test failures were sandbox loopback-listen EPERM; the authorized unsandboxed full rerun passed.

The existing case-insensitive macOS collision between ServiceConnection.tsx and serviceConnection.ts blocked the preference test. The component was renamed to AIServiceConnection.tsx with a single import update; component bytes remain identical. The normal Pages rebuild produced unchanged existing runtime bundles; the only new static asset is the empty Zotero update feed, copied by the regular build and included in CI's generated consistency check. Both development-server and built-Pages browser E2E passed on 2026-10-02 using an independent headless official Chrome instance.

Strict High independent compatibility review request `GRAPEPAPER_ZOTERO10_COMPAT_20261001_A` returned `GRAPEPAPER_ZOTERO10_COMPAT_GATE = PASS`, with an attachment ACK and a complete reply bound to the original user message. That historical review did not cover the subsequently discovered required update URL. On 2026-10-02 the separate strict High request `GRAPEPAPER_ZOTERO10_REAL_SMOKE_20261001_A` returned `GRAPEPAPER_ZOTERO10_REAL_SMOKE_GATE = PASS`, with the evidence ZIP acknowledged and a complete reply bound to its original user message. It reviewed the actual desktop observations, XPI and bounded update-feed fix. Neither smoke PASS establishes public deployment or final release QA.
