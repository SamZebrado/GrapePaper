# DELIVERY NOTE — GrapePaper v0.1.19

## 1. What Changed This Round

### 清理和优化 (P1)
- ✅ 清理了源码包 — 移除了旧版本的 zip 文件
- ✅ 优化了测试环境 — 添加了 scrollTo mock 以减少 JSDOM 警告
- ✅ 统一了文档版本 — 更新了所有文档的版本号到 v0.1.19

### 功能完善
- **源码包清理**：移除了旧版本的 zip 文件，使交付物更干净
- **测试环境优化**：添加了 scrollTo mock，减少了测试日志中的噪音
- **文档一致性**：统一了所有文档的版本号到 v0.1.19

## 2. How to Install and Run

```bash
# Prerequisites: Node.js >= 18 LTS (tested on 18.x)
# npm 9+ (tested on 9.x)

cd GrapePaper
npm install
npm run dev
# → http://localhost:5173/
```

## 3. Recommended Environment

| Item | Version |
|------|---------|
| Node.js | >= 18 LTS (recommended: 20 or 22) |
| npm | >= 9 (recommended: 10) |
| OS | macOS / Linux / Windows (no native bindings needed) |

**Do not use Vite 8+** — it requires Rolldown native binaries that are not available on all platforms. This project pins Vite 6.

## 4. Verification Results (actually executed)

| Command | Result |
|---------|--------|
| `npm install` | ✅ Pass — 366 packages, 0 vulnerabilities |
| `npx tsc -b --noEmit` | ✅ Pass — zero errors |
| `npm run build` | ✅ Pass — vite v6.4.2, dist/ output (32KB CSS + 600KB JS) |
| `npm run test:run` | ✅ Pass — 60 tests passed |

## 5. What Is Mock / Not Implemented

| Feature | Status |
|---------|--------|
| AI chat responses | **Mock** — returns hardcoded string after 800ms delay |
| Import button | **Implemented** — supports JSON and Markdown import |
| Citations | **Hardcoded sample data** — 4 sample refs about LLMs |
| Zotero integration | Not implemented |
| PDF import/render | Not implemented |
| File import (docx/tex) | Not implemented |
| Dark theme | Not implemented |
| Mobile responsive | Not implemented |
| Persistent storage | **Implemented** — uses localStorage |
| Tests | **Implemented** — 60 tests covering core store, import/export, and UI interactions |
| UIContext | **Implemented** — unified UI state management with useUI() hook |
| documentIO module | **Implemented** — pure functions for import/export logic |
| Annotation edit/delete | **Implemented** — edit and delete annotation functionality |
| Annotation/chat interaction | **Fixed** — resolved interaction regression |
| Autosave/restore status | **Implemented** — added status hints |
| Annotation edit feedback | **Implemented** — added save/cancel feedback |

## 6. Files Changed

- `package.json` — version (0.1.18 → 0.1.19)
- `src/test/setup.ts` — added scrollTo mock to reduce JSDOM warnings
- `STATUS.md` — updated version (0.1.18 → 0.1.19)
- `USABILITY_CHECK.md` — updated version (0.1.18 → 0.1.19)
- `DEMO_SCRIPT.md` — updated version (0.1.18 → 0.1.19)
- `DELIVERY_NOTE.md` — complete rewrite for v0.1.19
- All config files included in source zip: tsconfig.json, tsconfig.app.json, tsconfig.node.json, vite.config.ts, vitest.config.ts, index.html, .gitignore, eslint.config.js