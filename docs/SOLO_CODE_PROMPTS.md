# GrapePaper - SOLO Code 开发 Prompt

> 以下 prompt 用于交给 SOLO Code 继续开发 GrapePaper 中需要本地开发环境或特殊工具的功能。

---

## Prompt 1: 接入真实 LLM API

```
在 GrapePaper 项目中，将模拟 AI 回复替换为真实的 OpenAI API 调用。

技术要求：
1. 在 src/services/aiService.ts 中创建 AI 服务模块
2. 使用浏览器端 fetch 调用 OpenAI Chat Completions API（/v1/chat/completions）
3. API Key 通过环境变量 VITE_OPENAI_API_KEY 注入（在 .env.local 中配置）
4. 支持流式响应（SSE），逐字显示 AI 回复
5. 系统提示词设定为学术写作助手角色
6. 上下文包含当前段落的文本内容和批注内容

修改文件：
- 新建 src/services/aiService.ts
- 修改 src/App.tsx 中的 handleSendMessage 函数
- 新建 .env.local.example（VITE_OPENAI_API_KEY=your_key_here）
- 修改 src/components/ChatPanel/ChatPanel.tsx 支持流式显示

注意：
- 不要将 API Key 硬编码在代码中
- 添加错误处理和 loading 状态
- 保持现有的模拟回复作为 fallback（当 API Key 未配置时）
```

---

## Prompt 2: Zotero 集成

```
在 GrapePaper 项目中实现 Zotero 参考文献集成。

技术要求：
1. 通过 Zotero Web API 获取用户文献库
2. 支持两种集成方式：
   a. Zotero Web API（需要 API Key 和 User ID）
   b. Better BibTeX 导出（.bib 文件导入）
3. 在侧边栏添加 Zotero 连接按钮和配置面板
4. 支持从 Zotero 文献库搜索和插入引用
5. 引用插入后自动生成露水引用组件

修改文件：
- 新建 src/services/zoteroService.ts
- 新建 src/components/ZoteroPanel/ZoteroPanel.tsx + .module.css
- 修改 src/components/Sidebar/Sidebar.tsx 添加 Zotero 入口
- 修改 src/stores/documentStore.ts 添加 Zotero 相关状态
- 修改 src/components/StoneSlab/StoneSlab.tsx 添加插入引用功能

Zotero Web API 文档：https://www.zotero.org/support/dev/web_api/v3/basics
Better BibTeX 格式参考：https://retorque.re/zotero-better-bibtex/

环境变量：
- VITE_ZOTERO_API_KEY
- VITE_ZOTERO_USER_ID
```

---

## Prompt 3: PDF 解析与葡萄藤风格渲染

```
在 GrapePaper 项目中实现 PDF 文件的解析和葡萄藤风格渲染。

技术要求：
1. 使用 pdf.js 解析上传的 PDF 文件
2. 将 PDF 每一页渲染为葡萄藤风格：
   - 页面背景替换为石板纹理
   - 文字保持可选中状态
   - 图片保留原始内容
   - 引用/参考文献自动检测并渲染为露水样式
   - 页面之间用藤蔓连接器连接
3. 支持拖拽上传 PDF 文件
4. 支持从 PDF 中提取文本到编辑器

修改文件：
- 新建 src/services/pdfService.ts（pdf.js 封装）
- 新建 src/components/PDFViewer/PDFViewer.tsx + .module.css
- 新建 src/components/PDFPage/PDFPage.tsx + .module.css（单页葡萄藤风格渲染）
- 修改 src/components/Sidebar/Sidebar.tsx 添加 PDF 上传入口
- 修改 src/stores/documentStore.ts 添加 PDF 相关状态

依赖安装：
- npm install pdfjs-dist

注意：
- pdf.js worker 需要正确配置
- 大 PDF 文件需要分页加载
- 保持文本可选择和可复制
```

---

## Prompt 4: 文档导入/导出

```
在 GrapePaper 项目中实现文档导入和导出功能。

导入支持：
1. Markdown 文件（.md）→ 解析为段落和引用
2. 纯文本文件（.txt）→ 按段落分割
3. LaTeX 文件（.tex）→ 基础解析（标题、段落、引用）
4. Word 文档（.docx）→ 使用 mammoth.js 提取文本

导出支持：
1. Markdown（.md）→ 包含引用和批注
2. HTML（.html）→ 保留基本格式
3. PDF（.pdf）→ 使用 html2pdf.js 或 jsPDF
4. LaTeX（.tex）→ 基础导出

修改文件：
- 新建 src/services/importService.ts
- 新建 src/services/exportService.ts
- 修改 src/components/Sidebar/Sidebar.tsx 中的 Import/Export 按钮
- 修改 src/stores/documentStore.ts 添加导入/导出 actions

依赖安装：
- npm install mammoth html2pdf.js
```

---

## Prompt 5: 响应式布局与移动端适配

```
为 GrapePaper 添加响应式布局支持。

技术要求：
1. 侧边栏在移动端变为可收起的抽屉（hamburger menu 触发）
2. 石板宽度自适应屏幕尺寸
3. 聊天面板在移动端变为全屏覆盖
4. 触摸手势支持（滑动关闭面板等）
5. 字体大小在小屏幕上适当缩小

断点设计：
- Desktop: >= 1024px（当前布局）
- Tablet: 768px - 1023px（侧边栏可收起）
- Mobile: < 768px（侧边栏隐藏，全屏编辑）

修改文件：
- 修改 src/components/Sidebar/Sidebar.module.css
- 修改 src/components/EditorCanvas/EditorCanvas.module.css
- 修改 src/components/ChatPanel/ChatPanel.module.css
- 新建 src/components/MobileMenu/MobileMenu.tsx + .module.css
- 修改 src/styles/theme.css 添加响应式变量
```

---

## Prompt 6: 深色主题

```
为 GrapePaper 添加深色/浅色主题切换功能。

设计要求：
深色主题应保持葡萄藤隐喻，但调整为夜间花园的感觉：
- 背景：深色石板（#1a1a18）
- 石板：深灰石头纹理（#2a2a28）
- 藤蔓：发光的绿色（#4a7c29 带发光效果）
- 露水：月光蓝（#5ba3c7）
- 葡萄：深紫色发光（#8b5cf6）
- 文字：浅色（#e8e0d0）

技术要求：
1. 使用 CSS Variables 实现主题切换
2. 在 src/styles/theme.css 中定义 [data-theme="dark"] 变量
3. 在侧边栏添加主题切换按钮（太阳/月亮图标）
4. 使用 localStorage 记住用户偏好
5. 尊重系统 prefers-color-scheme 设置

修改文件：
- 修改 src/styles/theme.css 添加深色主题变量
- 修改 src/styles/global.css 添加主题过渡
- 修改 src/components/Sidebar/Sidebar.tsx 添加切换按钮
- 新建 src/hooks/useTheme.ts
```
