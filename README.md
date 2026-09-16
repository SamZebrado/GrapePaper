# GrapePaper 🍇

**葡萄伴读**：保留英文原文，用中文梳理论证、追溯引用实验，再偶尔遇到一张文献故事卡。网页阅读器与实验版 Zotero 插件共享伴读流程。原有葡萄笔记编辑器保留在「葡萄笔记」。

## 最小操作

需要 **Node.js 22.13+（推荐 Node 24）**，以及支持 PDF.js 的现代桌面浏览器。

```bash
npm ci --ignore-scripts
npm run dev
```

打开终端显示的本地地址，选择 PDF 或试读示例：

1. 选文字、框选或随手画圈，提取当前页的选段。
2. 生成中文伴读，或复制提示词到常用 AI；已有笔记可通过 JSON 导入。
3. 读完点击 **✓ 我读过了**。选择、翻页和 AI 回答均不会自动确认。
4. 默认每确认 3 个不同选段出现阅读间奏；可改为 5、8 段或关闭。有来源的故事优先；没有可用故事时给一个回读问题。

默认只在内存中保留阅读标记，刷新或关闭后消失。不显示全文完成率、连续打卡或待读清单。可在阅读偏好中开启本机保存；关闭时删除保存的数据。保存内容仅包括文档哈希、已确认选段哈希和间奏计数，PDF、选段、模型回复不随阅读标记保存。笔记编辑器仍使用它原有的草稿保存机制。

## 连接伴读模型

另开终端，配置支持 JSON 输出的 OpenAI-compatible 服务：

```bash
export GRAPEPAPER_API_BASE_URL='http://localhost:11434/v1'
export GRAPEPAPER_MODEL='your-installed-model'
npm run server
```

示例中的模型名称需换成已安装的模型。云端模型使用提供商的 HTTPS base URL，并在**服务端环境**设置 `GRAPEPAPER_API_KEY`。不要使用 `VITE_*` 保存密钥。网页开发服务器已代理 `/api` 到本地 `127.0.0.1:8787`。

AI 只接收明确提交的选段、当前页上下文和提供的来源材料；「圈选后自动生成」需自行开启。本地示例是预写教学内容，未配置模型时不会伪装成真实 AI。提示词复制和笔记导入不需要模型服务。

[配置、输入输出格式与来源范围](docs/companion-api.md)

## Zotero 插件

```bash
npm run build:zotero
```

在 Zotero 中通过「工具 → 插件 → 从文件安装插件」安装 `zotero/dist/grapepaper-0.1.0.xpi`，在 GrapePaper 设置中填入网页地址。选中文字后点击 **GrapePaper 伴读**；到网页读完后再点对号。已打开的同源网页通过内存握手接收新选段，延续阅读会话。

插件按 Zotero 7/8 官方阅读器 API 实现，目前是**实验版选段桥接**，尚未在真实 Zotero 桌面完成安装验证；不是完整内嵌侧栏，也不自动同步 Zotero 数据库。[安装、兼容性和桥接说明](zotero/README.md)

## 能力与限制

| 功能 | 当前范围 |
| --- | --- |
| PDF 阅读 | 本地 PDF.js 渲染；文字选择、矩形框选、自由套索；翻页、缩放、纯文本辅助视图 |
| 中文伴读 | 论证作用、引用实验、短摘录、定位、回读问题；真实模型需配置 |
| 引用背景 | 提取末尾最多 5 页中的参考文献；可补充实际来源摘录和链接；可选 Crossref 书目候选搜索 |
| 故事与争议 | 从提供的来源片段生成或导入；来源不足时不生成故事。不能把文字匹配当成事实核查 |
| 阅读确认 | 手动确认、相同页相同文本去重、可选本机保存；无全文完成压力 |
| 双端入口 | 独立网页 + Zotero 选段桥接，界面为中文伴读；原编辑器保留中英文切换 |
| 原笔记编辑器 | 石板段落、葡萄叶批注、露水引用、Markdown/JSON 导入导出；其旧聊天仍为明确标注的模拟 |

扫描 PDF 需先 OCR。复杂栏排、公式和文字顺序可能提取不准，应核对当前选段。套索以词的文字框中心判断包含关系，不做图片或公式识别。单文件上限 100 MB、网页选段上限 12,000 字符、Zotero 选段上限 4,000 字符。

当前不会自动获取付费论文全文、实时搜索新闻或验证学者生平；完整引用实验解读需要实际来源摘录。Crossref 仅提供候选书目信息。静态部署可用 PDF、提示词和导入功能；AI 需要另行部署和保护后端，不能把本地开发服务直接暴露为公共代理。

## 开发与验证

```bash
npm run test:all      # 网页逻辑 + 本地服务 + Zotero 桥接
npm run typecheck
npm run lint:reading # 本轮阅读器代码；旧编辑器的 lint 债务仍保留
npm run build
npm run build:zotero
npm run test:e2e     # 需先启动 npm run dev，并安装 Playwright Chromium
```

CI 执行上述构建和测试，并上传构建出的实验版 XPI。真实模型推理与真实 Zotero 安装需在对应环境验证；自动测试使用受控响应，不能替代这些验证。

技术栈：React 18、TypeScript、Vite、PDF.js、Zustand、TipTap；MIT 许可。PDF.js 及其衍生 CSS 遵循 Apache-2.0，[第三方说明](THIRD_PARTY_NOTICES.md)。

下一步优先验证真实 Zotero 使用，再扩展可追溯的全文来源获取和内嵌伴读。

---

**English** — GrapePaper pairs original PDF text with a Chinese reading companion. Select text, draw a rectangle or lasso, inspect the explanation and citations, then explicitly check the passage as read. Reading markers stay in memory unless local persistence is enabled. Occasional sourced story cards or reflection prompts add variety without a document completion score. A local server connects to an OpenAI-compatible model; API keys remain server-side. The experimental Zotero 7/8 bridge transfers a selected excerpt into the same web reader. Full-text retrieval, live news search, OCR and real Zotero desktop validation are not yet included. See the setup and evidence limits above.
