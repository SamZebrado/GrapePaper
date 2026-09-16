# GrapePaper Zotero Companion

在 Zotero 的 PDF 阅读器中选择一段文字，再点击 **🍇 GrapePaper 伴读**，即可带着该段文字打开独立网页。解释、参考文献线索和阅读确认由网页提供；点击插件按钮不等于确认已读。

## 安装与最小操作

1. 在项目根目录执行 `node zotero/build.mjs`，生成 `zotero/dist/grapepaper-0.1.0.xpi`。构建只需要 Node.js，不下载额外依赖。
2. 在 Zotero 的「工具 → 插件」中选择「从文件安装插件」，打开该 XPI。
3. 启动 GrapePaper 网页（项目根目录 `npm run dev`），或使用自己信任的 HTTPS 部署。在 Zotero 设置中的 **GrapePaper** 页面保存完整网页地址，默认 `http://localhost:5173/`；若开发服务器换了端口，请同步修改这里。
4. 打开有文本层的 PDF，选择一段文字，点击 **🍇 GrapePaper 伴读**。网页打开后，先查看／生成伴读，再按需点击阅读确认对号。

## 兼容性与限制

- 面向 Zotero 7 和 8 的官方 `renderTextSelectionPopup` API 实现，包含启动／停用清理和可配置地址。清单允许 7.0–8.0.*；**尚未在真实 Zotero 桌面环境完成安装与交互验证**，当前为实验版桥接插件。
- 插件支持 Zotero 自带的文字选择。任意形状圈选由网页版负责；扫描版 PDF 若无文本层，请先 OCR。
- 网页新标签页接收选段，不自动同步 Zotero 数据库，也不读取、上传整个 PDF。全文参考文献解析仍需要在网页中自行打开对应 PDF；仅传选段时，参考线索需要结合原文核对。
- 每段上限 4,000 个 JavaScript 字符单位；编码后的地址也有长度限制。超限会提示缩短选择，不会静默截断正文。
- 每次点击会打开网页；如果同源的 GrapePaper 阅读页已打开，网页通过内存中的 `BroadcastChannel` 握手把选段交给一个已有页面，以延续该页的阅读会话。没有接收页、浏览器不支持或握手超时时，在新页面阅读。桌面内嵌侧栏尚未实现；插件不保存阅读计数，不创建已读批注。
- 只允许 HTTPS 地址，或 `localhost`、`127.0.0.1`、`[::1]` 上的 HTTP。地址中不允许账号密码、查询参数或既有 fragment。无自动更新服务器；新版本重新构建安装。

## 传输合同

插件只在明确点击时调用 `Zotero.launchURL()`，通过地址 fragment 交给网页：

```text
https://your-companion.example/#grapepaper=<encodeURIComponent(JSON)>
```

```json
{
  "version": 1,
  "source": "zotero",
  "selection": { "text": "Selected passage", "page": 3 },
  "document": { "title": "Example paper", "doi": "10.1234/example" }
}
```

`page` 是 PDF 的一基页码（`pageIndex + 1`），可能与论文印刷页码不同；缺失时省略。没有 DOI、标题时也省略对应字段。传输内容不包含附件路径、Zotero item/library key、PDF 字节或 API 密钥。

Fragment 不随初始 HTTP 请求发送给网站服务器，但接收页面及其脚本能够读取，因此仅使用自己信任的部署。网页收到后应立即 `history.replaceState` 移除 fragment，保留选段在内存中；浏览器／操作系统仍可能暂存已打开的地址。该桥接不构成加密或数据保密保证。生成伴读是网页中单独的用户动作。

跨标签页发现消息仅含随机请求 ID；收到应答后，选段标记给首个接收页，其他页面忽略这次传递。`BroadcastChannel` 限于同源页面，传递协议不会写入 `localStorage`。它不提供同源脚本之间的隐私隔离；使用来自可信部署的页面。

## 验证

```bash
node --test zotero/bridge.test.mjs
node zotero/build.mjs
```

自动检查覆盖字段白名单、URL 限制、选段／页码、显式点击发送、关闭清理和构建内容。它们验证桥接合同，不能代替真实 Zotero 中的安装、偏好面板、键盘操作和 PDF 选择测试。

维护时应在独立 Zotero 测试 profile 中完成：安装 → 保存本地地址 → PDF 选段 → 网页接收 → 停用后按钮消失 → 重新启用。随后再核对当前稳定版的兼容性上限。

## 官方依据

- [Zotero 7 developer guide: reader hooks, bootstrap and preferences](https://www.zotero.org/support/dev/zotero_7_for_developers)
- [Zotero 8 developer guide: platform changes](https://www.zotero.org/support/dev/zotero_8_for_developers)
- [Official reader event API and public itemID getter](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/reader.js)
- [Selection popup source](https://github.com/zotero/reader/blob/master/src/common/components/view-popup/selection-popup.js)
- [CustomSections source: append must be synchronous](https://github.com/zotero/reader/blob/master/src/common/components/common/custom-sections.js)
- [PDF selection metadata source](https://github.com/zotero/reader/blob/master/src/pdf/pdf-view.js)
- [MDN: URI fragments](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment)

后续优先在真实 Zotero 环境验证，再考虑内嵌伴读侧栏。
