> **Note**: This plan is historical and partially superseded by STATUS.md and DELIVERY_NOTE.md. It reflects the original development intent, not the current verified state.

# PLAN

## Goal
开发 GrapePaper MVP —— 一个以葡萄藤为视觉隐喻的学术论文编辑器 Web 应用，包含石板段落、葡萄叶批注、泡泡式AI对话、露水参考文献等核心功能。

## 技术栈
- **框架**: React 18 + TypeScript
- **构建**: Vite
- **样式**: CSS Modules + CSS Variables（主题系统）
- **状态管理**: Zustand
- **富文本编辑**: TipTap (ProseMirror)
- **PDF 解析**: pdf.js（待集成）
- **AI 对话**: OpenAI API（浏览器端调用，当前使用模拟回复）
- **参考文献**: Zotero Web API / Better BibTeX（待集成）
- **动画**: Framer Motion
- **3D/视觉效果**: CSS 3D transforms + SVG filters

## Milestones

### Phase 1: 项目脚手架与基础架构
1. [Done (verified)] 初始化 Vite + React + TypeScript 项目
2. [Done (verified)] 配置项目结构（src/components, src/stores, src/styles）
3. [Done (verified)] 集成 Zustand 状态管理
4. [Done (verified)] 建立主题系统（CSS Variables - 葡萄藤配色方案）
5. [Done (verified)] 基础布局组件（App shell, 侧边栏, 主编辑区）

### Phase 2: 核心视觉渲染引擎
6. [Done (static only, not executed)] 石板段落组件（StoneSlab）- 段落以石板样式呈现
7. [Done (static only, not executed)] 葡萄叶批注组件（GrapeLeaf）- 批注像葡萄叶卷曲生长
8. [Done (static only, not executed)] 藤蔓连接线（VineConnector）- 段落间/批注间的藤蔓装饰
9. [Done (static only, not executed)] 露水参考文献组件（DewdropCitation）- 引用以露水高亮呈现
10. [Done (static only, not executed)] 悬浮气泡组件（HoverBubble）- 集成在 DewdropCitation 中

### Phase 3: 富文本编辑能力
11. [Done (verified)] 集成 TipTap 编辑器
12. [Done (static only, not executed)] 石板内的文本编辑功能
13. [Done (static only, not executed)] 批注创建和编辑
14. [Not started] 文档导入（Markdown / 纯文本）
15. [Not started] 文档导出（Markdown / HTML）

### Phase 4: 泡泡式 AI 对话
16. [Done (static only, not executed)] 泡泡组件（ChatBubble）- 提问/回答泡泡样式
17. [Done (static only, not executed)] 泡泡大小随时间递减动画（古老消息泡泡变小）
18. [Done (static only, not executed)] AI 对话面板（从任意元素"吐出"对话）
19. [Done (verified)] 对话历史管理（通过对话 ID 绑定）
20. [Partial] OpenAI API 集成（当前使用模拟回复，需接入真实 API）

### Phase 5: 参考文献与 PDF
21. [Not started] Zotero 集成（通过 Better BibTeX 或 Web API）
22. [Done (static only, not executed)] 参考文献解析和渲染（示例数据）
23. [Not started] PDF 解析（pdf.js）
24. [Not started] PDF 葡萄藤风格渲染
25. [Not started] 引用跳转到原文 PDF 位置

### Phase 6: 整合与打磨
26. [Done (static only, not executed)] 全局动画和过渡效果
27. [Not started] 响应式布局
28. [Not started] 深色/浅色主题切换
29. [Done (verified)] 示例论文数据
30. [Not started] 性能优化

## Validation
- `npm run dev` 能正常启动 ✅
- `npx tsc -b --noEmit` 零错误 ✅
- 浏览器中能看到石板段落 + 葡萄叶批注 + 露水引用的完整视觉效果 ⏳（DOM 结构正确，截图不可用）
- 可以在石板中编辑文本 ⏳
- 可以创建批注 ⏳
- 泡泡式 AI 对话可以正常工作 ⏳
- 参考文献可以正确渲染和悬浮预览 ⏳

## Deferred / blocked
- Zotero 深度集成可能需要浏览器扩展（deferred to post-MVP）
- PDF 非传统渲染是高难度项，可能需要降级为简化版
- 移动端适配（deferred）
- 真实 LLM API 接入（需要 API key）
