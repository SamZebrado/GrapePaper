# STATUS

## Current workstream
- GrapePaper v0.1.20 — Demo Release Prep

## Current truth (2026-04-18)

### 构建验证（已通过）
- `npm install` — ✅ 366 packages, 0 vulnerabilities
- `npx tsc -b --noEmit` — ✅ 零错误
- `npm run build` — ✅ vite v6.4.2
- `npm run dev` — ✅ 启动成功 (localhost:5173)
- `npm run test:run` — ✅ 60 tests passed
- `npm run typecheck` — ✅ 零错误
- 完整源码包可复现 — ✅ 通过 RUN_LOG.md 验证

### 技术栈
- React 18.3 + TypeScript 5.6 + Vite 6.4 (esbuild)
- Zustand 5 + TipTap 2 + Framer Motion 11
- React Context 用于 UI 状态管理（已完成重构）
- Vitest + jsdom + @testing-library 用于测试

### 功能状态
- 已实现：石板渲染、TipTap 编辑、葡萄叶批注（含编辑/删除功能）、露水引用悬浮预览、藤蔓 SVG、聊天泡泡、侧边栏导航、Markdown 导出、JSON 导入/导出、Markdown 导入、localStorage 持久化、Reset to Sample、Clear Draft、Toast 通知、Confirm 模态框
- Mock：AI 聊天回复、示例引用数据
- 未实现：PDF、Zotero、真实 AI API、docx/tex 导入

### 架构状态
- ✅ 已完成 UIContext 重构
- ✅ 移除 ToastManager/ConfirmModalManager 的 window 全局暴露
- ✅ 统一使用 useUI() hook
- ✅ 只有一套 UI 状态机制
- ✅ 已添加完整测试（documentStore.test.ts + documentIO.test.ts + GrapeLeaf.test.tsx + ChatPanel.test.tsx + Sidebar.test.tsx + userFlow.test.tsx，60 tests passed）
- ✅ 完整源码包可复现（包含所有构建必需文件）
- ✅ 导入导出逻辑已抽离到独立模块（src/utils/documentIO.ts）
- ✅ 已添加 annotation 编辑/删除功能
- ✅ 已修复 annotation/chat 交互回归

### 交付物
- ✅ 已创建：demo/screenshots 文件夹
- ✅ 已创建：USABILITY_CHECK.md（已更新到 v0.1.20）
- ✅ 已创建：DEMO_SCRIPT.md（已更新到 v0.1.20）
- ✅ 已创建：RUN_LOG.md（验证记录）
- ✅ 已更新：DELIVERY_NOTE.md
- ✅ 已创建：测试文件（documentStore.test.ts + documentIO.test.ts + GrapeLeaf.test.tsx + ChatPanel.test.tsx + Sidebar.test.tsx + userFlow.test.tsx）
- ✅ 完整源码包可复现（包含 tsconfig.json 等所有构建必需文件）
- ✅ 已完成：demo/screenshots 中的截图

## Active risks / blockers
- No blocking issue for local startup or build
- Major features still unimplemented: real AI API, PDF rendering, Zotero integration, docx/tex import

## Current source-of-truth files
- STATUS.md
- README.md
- DELIVERY_NOTE.md
- USABILITY_CHECK.md
- DEMO_SCRIPT.md
- RUN_LOG.md

## Recommended next step
1. 统一文档中的版本号和测试数量
2. 深化 documentIO / storage 校验
3. 添加 autosave/restore 状态提示和 annotation 编辑反馈

## Latest run archive
- RUN_LOG.md（当前版本验证记录）
