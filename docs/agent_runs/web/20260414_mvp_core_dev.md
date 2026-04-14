# 2026-04-14 - MVP 核心功能开发

## Objective
- 搭建 React + TypeScript + Vite 项目脚手架
- 开发 GrapePaper 所有核心视觉组件
- 实现富文本编辑、AI对话泡泡、露水引用等功能

## Manual Testing Facts (Source-of-Truth)
- `npx tsc -b --noEmit`: 零错误通过
- `npm run dev`: Vite 开发服务器正常启动 (localhost:5173)
- 浏览器控制台无错误（仅 React DevTools 提示）
- DOM snapshot 确认所有组件正确渲染（标题、4个石板段落、工具栏、批注按钮、添加按钮）
- 修复了 Vite 默认 index.css/App.css 与自定义主题系统的 CSS 变量冲突

## Changed Files
- src/types/index.ts（类型定义）
- src/stores/documentStore.ts（Zustand 状态管理 + 示例数据）
- src/styles/theme.css（葡萄藤主题 CSS 变量系统）
- src/styles/global.css（全局样式）
- src/components/StoneSlab/StoneSlab.tsx + .module.css（石板段落组件）
- src/components/GrapeLeaf/GrapeLeaf.tsx + .module.css（葡萄叶批注组件）
- src/components/DewdropCitation/DewdropCitation.tsx + .module.css（露水引用组件）
- src/components/ChatBubble/ChatBubble.tsx + .module.css（对话泡泡组件）
- src/components/ChatPanel/ChatPanel.tsx + .module.css（聊天面板组件）
- src/components/VineConnector/VineConnector.tsx + .module.css（藤蔓连接器组件）
- src/components/Sidebar/Sidebar.tsx + .module.css（侧边栏组件）
- src/components/EditorCanvas/EditorCanvas.tsx + .module.css（编辑画布组件）
- src/App.tsx（主应用组件）
- src/main.tsx（入口点）
- index.html（标题更新）
- src/index.css（清空 Vite 默认样式）
- src/App.css（清空 Vite 默认样式）
- src/components/EditorCanvas/EditorCanvas.module.css（修复 flex 布局）

## Commands Run
- `npm create vite@latest . -- --template react-ts`（通过临时目录）
- `npm install`（基础依赖）
- `npm install zustand @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder framer-motion`
- `npx tsc -b --noEmit`（编译验证）
- `npm run dev -- --host 0.0.0.0`（开发服务器）

## Raw Results
- TypeScript 编译：零错误
- Vite 开发服务器：正常启动
- 浏览器：页面加载成功，DOM 结构正确

## Verified vs. Unverified
- Verified: TypeScript 编译、Vite 启动、DOM 结构、无控制台错误
- Unverified: 视觉渲染效果（截图功能暂时不可用）、交互功能（点击、编辑、动画）

## Current Conclusion
- MVP 核心代码开发完成，所有组件已创建并通过编译
- 需要视觉验证确认石板、葡萄叶、露水等视觉效果是否正确渲染
- AI 对话功能使用模拟回复，需要接入真实 API

## Next Step Suggestions
- 视觉验证和样式微调
- 接入真实 LLM API
- 实现 PDF 解析和渲染
- Zotero 集成
- 文档导入/导出

## Blockers Encountered
- Vite 默认 index.css 设置了 `#root { width: 1126px; text-align: center }` 等样式，覆盖了自定义布局 → 已通过清空文件解决
- EditorCanvas 的 `flex: 1` 在 fixed sidebar 布局下不生效 → 已改用 `width: calc(100% - var(--gp-sidebar-width))`
- 浏览器截图功能超时 → 无法视觉验证，但 DOM 结构确认正确
