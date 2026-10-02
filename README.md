# GrapePaper 🍇

**葡萄伴读**：保留英文原文，用中文梳理论证、追溯引用实验，再偶尔遇到一张文献故事卡。网页阅读器与实验版 Zotero 插件共享伴读流程。原有葡萄笔记编辑器保留在「葡萄笔记」。

**[打开网页预览 →](https://samzebrado.github.io/GrapePaper/)**

拖入 PDF 即可阅读。点 **❧ 美化模式**，当前页文字会使用原项目的石板与葡萄藤排版；切回 **PDF 原文** 查看图表。两种模式共享页码、伴读和阅读确认，不会把 PDF 写入笔记草稿。原有编辑器仍可从顶部「葡萄笔记」进入。

网页预览的 PDF、圈选、确认、间奏、提示词和 JSON 导入可直接使用。**实时 AI 需点「连接 AI」接入自己的伴读服务**；预览不包含公共模型额度。美化模式按文字层顺序重排，不保证还原分栏、公式与图表。

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

## 引用证据链 · Evidence Trail V1

选择含 `[1]` 或 `Smith (2020)` 等引用的选段，在「引用证据链」中核对书目，明确选择来源身份，再确认对应关系并导入本地来源 PDF / 文本。重复作者年份与多条引用保留候选，一次检查一篇；不认识的格式不猜测。Crossref 元数据查询需服务端显式启用，离线也可手动确认书目并使用本地来源。

静态网页的元数据查询复用现有「连接 AI」入口，目前只有服务健康检查报告模型已配置时才能连接。仅启用 Crossref、未配置模型的服务可独立处理 `mode: "resolve"` API 请求，但不能从静态网页连接；此时使用离线书目确认与本地来源流程。连接成功也不证明模型密钥有效。

本地词汇检索定位最多三条候选短摘录；可查看精确提取原文、页码与字符定位。**候选相关性不等于支持结论，DOI 身份不等于证据强度。** 检查并勾选摘录后，可显式请求已连接的模型解释。每项模型判断标明支持 / 相矛盾 / 仅提及 / 证据不足及对应摘录，始终与来源文字分开。

来源文件与全文索引只在内存中；不上传 PDF、不自动保存原文。生成证据解释仅发送当前选段、选中书目、来源身份与勾选的短摘录及定位。显式导出的证据 JSON 含选段与摘录，请注意私人材料。重新导入会隔离旧解释；需重新提供字节相同的本地来源并核对提取定位，随后重新分析。改换引用、来源或检索输入会使旧解释失效。

来源限制为 100 MB / 500 页 / 200 万提取字符；不做 OCR，不获取付费全文，不建立云端库。PDF 提取顺序和启发式书目识别可能不完整。未找到候选只表示这次检索无匹配，不表示论文没有相关证据。自动模型 / resolver 测试为受控 mock，不代表真实模型的科学判断质量。

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

## GitHub Pages 预览

Pages 设置使用 `main` 分支的 `/docs`。更新代码后运行 `npm run build:pages`，一并提交生成的 `docs/index.html`、`docs/assets/`、图标与许可文件即可更新预览。构建保留 `docs` 中的原有文档，资源路径使用 `/GrapePaper/`。不要手工修改生成文件。

Pages 只提供静态文件。用预览连接本机模型服务时，按[配置说明](docs/companion-api.md#use-from-the-public-preview)允许预览网页的 origin，再在网页中填 `http://127.0.0.1:8787`。浏览器可能询问本地网络权限；无法连接时仍可复制伴读提示词或导入笔记。

## Zotero 插件

```bash
npm run build:zotero
```

在独立 Zotero 测试 profile 中通过「工具 → 插件 → 从文件安装插件」安装 `zotero/dist/grapepaper-0.1.1.xpi`，在 GrapePaper 设置中填入网页地址。选中文字后点击 **GrapePaper 伴读**；到网页读完后再点对号。已打开的同源网页通过内存握手接收新选段，延续阅读会话。

插件清单允许 Zotero 7.0–10.0.*。2026-10-02 已在 macOS 的独立临时 profile/data 中实测 Zotero 10.0.4：安装、偏好保存/重开/拒绝不安全地址、真实 PDF 选文、网页接收、停用/启用和重启持久性。目前仍是**实验版选段桥接**；7/8 未实际运行，不把声明范围或自动合同测试等同于各版本桌面验证。[安装、兼容性和桥接说明](zotero/README.md)

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
npm run build:pages  # 生成绑定 /docs 的在线预览
npm run build:zotero
npm run test:e2e     # 需先启动 npm run dev，并安装 Playwright Chromium
npm run test:e2e:evidence # 本地来源、证据边界、导入核对；AI/resolver 为受控 mock
```

CI 执行上述构建和测试，并上传构建出的实验版 XPI。自动模型测试使用受控响应，真实模型推理仍未验证；Zotero 10.0.4 的桌面 smoke 独立于自动测试，详见兼容性说明。

技术栈：React 18、TypeScript、Vite、PDF.js、Zustand、TipTap；MIT 许可。PDF.js 及其衍生 CSS 遵循 Apache-2.0，[第三方说明](THIRD_PARTY_NOTICES.md)。

Evidence Trail V1 已提供本地 Citation → Source → Evidence → Boundary 循环；竞品测试不是前置条件。自动全文获取、OCR 与真实模型科学判断质量仍未验证或实现，不把候选摘录或模型解释称为独立事实核查。

---

**English** — GrapePaper pairs original PDF text with a Chinese reading companion. Select text, draw a rectangle or lasso, inspect the explanation and citations, then explicitly check the passage as read. Reading markers stay in memory unless local persistence is enabled. Occasional sourced story cards or reflection prompts add variety without a document completion score. A local server connects to an OpenAI-compatible model; API keys remain server-side and real inference remains unverified. The experimental Zotero bridge declares 7.0–10.0.* compatibility and transfers a selected excerpt into the same web reader. Real desktop smoke tested on Zotero 10.0.4 on macOS; 7/8 were not run. Evidence Trail locates exact excerpts in user-supplied local sources and keeps model interpretation separate. Automatic external full-text acquisition, live news search and OCR are not included. See the setup, metadata-connection limitation and evidence boundaries above.
