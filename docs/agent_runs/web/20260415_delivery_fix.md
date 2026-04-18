# 2026-04-15 - 交付修复：依赖降级 + 诚实文档

## Objective
- 修复 vite@8 rolldown native binding 跨平台问题
- 清理交付物（删除 node_modules/dist/旧 lockfile）
- 修正 package.json 元信息
- 诚实标注 mock 和未实现功能
- 重写 README / STATUS / DELIVERY_NOTE

## Manual Testing Facts (Source-of-Truth)
- `npm install`: 240 packages, 0 vulnerabilities, exit code 0
- `npx tsc -b --noEmit`: zero errors, exit code 0
- `npm run build`: vite v6.4.2, dist/ output 26KB CSS + 591KB JS, exit code 0
- `npm run dev`: vite v6.4.2, starts in 387ms, localhost:5173, exit code 0

## Changed Files
- package.json (name, version, all dependency versions downgraded)
- tsconfig.app.json (removed TS 5.8+ options)
- tsconfig.node.json (same)
- src/vite-env.d.ts (new: CSS Modules declarations)
- src/components/Sidebar/Sidebar.tsx (disabled Import, wired Export)
- src/components/Sidebar/Sidebar.module.css (disabled style)
- src/components/ChatPanel/ChatPanel.tsx (mock badge)
- src/components/ChatPanel/ChatPanel.module.css (mock badge style)
- README.md (full rewrite)
- STATUS.md (full rewrite)
- PROJECT_LOG.md (updated)
- DELIVERY_NOTE.md (new)

## Commands Run
- `rm -rf node_modules package-lock.json`
- `npm install`
- `npx tsc -b --noEmit`
- `npm run build`
- `npm run dev` (timeout 8s, confirmed startup)

## Raw Results
- All four verification commands passed with exit code 0
- No rolldown/native binding errors

## Verified vs. Unverified
- Verified: npm install, tsc, build, dev startup
- Unverified: runtime UI interaction in browser (dev server confirmed running, no visual screenshot taken)

## Current Conclusion
- Project is now a clean, reproducible MVP package
- Vite 6 + esbuild eliminates all native binding issues
- All mock/placeholder features are clearly labeled in UI and docs

## Blockers Encountered
- vite@8 rolldown: `Cannot find native binding` on macOS ARM64 → fixed by downgrading to vite@6
- CSS Modules type declarations missing in TS 5.6 → fixed by adding vite-env.d.ts
- `document.createElement` type error in Sidebar → fixed by using `globalThis.document`
