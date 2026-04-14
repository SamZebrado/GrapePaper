# STATUS

## Current workstream
- GrapePaper MVP 开发 - 全功能原型 v0.1

## Current truth
- 项目已初始化，React + TypeScript + Vite 脚手架搭建完成
- 9 个核心组件已开发：StoneSlab, GrapeLeaf, DewdropCitation, ChatBubble, ChatPanel, VineConnector, Sidebar, EditorCanvas, App
- Zustand 状态管理已集成，含示例学术文档数据
- TipTap 富文本编辑器已集成到石板组件中
- Framer Motion 动画已集成（叶子生长、气泡弹出、石板浮起等）
- TypeScript 编译零错误，Vite 开发服务器正常运行
- 修复了 Vite 默认样式文件（index.css/App.css）与自定义主题的冲突

## Active risks / blockers
- Zotero 集成需要浏览器扩展或本地 API（deferred）
- AI 对话目前使用模拟回复，需要接入真实 LLM API
- PDF 非传统渲染尚未实现（deferred）
- 浏览器截图功能暂时不可用，无法视觉验证渲染效果

## Current source-of-truth files
- STATUS.md
- PLAN.md
- PROJECT_LOG.md
- src/stores/documentStore.ts（示例数据和状态管理）
- src/styles/theme.css（主题系统）

## Recommended next step
- 接入真实 AI API（OpenAI/其他）
- 实现 PDF 解析和葡萄藤风格渲染
- 实现 Zotero 集成
- 添加文档导入/导出功能
- 响应式布局优化

## Latest run archive
- [docs/agent_runs/web/20260414_mvp_core_dev.md](docs/agent_runs/web/20260414_mvp_core_dev.md)
