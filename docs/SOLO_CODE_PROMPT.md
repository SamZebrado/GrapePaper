# SOLO Code Prompt — GrapePaper 后续开发

> 将此 prompt 发送给 SOLO Code 以继续 GrapePaper 开发。

---

## 项目背景

GrapePaper 是一个以"葡萄藤"为视觉隐喻的学术论文编辑器 Web 应用。核心特点：
- **石板段落**：段落以石板纹理渲染
- **葡萄叶批注**：批注像葡萄叶一样生长
- **露水引用**：参考文献以露水高亮形式呈现，悬浮显示摘要
- **泡泡式 AI 对话**：从任意元素"吐出"对话泡泡，古老消息会缩小

**当前状态**：
- 构建正常（npm install / tsc / build / dev 全部通过）
- 9 个核心组件已实现
- AI 聊天是 mock（模拟回复）
- Import 按钮禁用，Export 导出 Markdown

**项目位置**：解压 `GrapePaper-v0.1.zip` 后进入 `GrapePaper/` 目录

---

## 任务 1：Demo 截图（优先）

在有 GUI 的环境下执行：

```bash
cd GrapePaper
npm install
npm run dev
# 打开 http://localhost:5173/
```

需要截图（保存到 `demo/screenshots/`）：
1. `01-app-overview.png` — 应用整体布局
2. `02-sidebar-and-title-edit.png` — 侧边栏 + 编辑标题
3. `03-stone-slab-editing.png` — 石板内文本编辑
4. `04-annotation-leaf-expanded.png` — 葡萄叶批注展开
5. `05-chat-panel-mock.png` — 聊天面板（注意 mock 标签）
6. `06-citation-hover-preview.png` — 露水引用悬浮预览
7. `07-export-result.png` — 导出后的 Markdown 文件内容

---

## 任务 2：USABILITY_CHECK.md

按以下步骤测试并记录结果：

```markdown
# USABILITY CHECK — GrapePaper v0.1

## 测试环境
- OS:
- Node:
- npm:

## 测试项

| # | 任务 | 结果 | 证据 |
|---|------|------|------|
| 1 | npm install | PASS/FAIL | 截图/日志 |
| 2 | npm run dev | PASS/FAIL | 截图 |
| 3 | 页面打开 | PASS/FAIL | 截图 |
| 4 | 可编辑标题 | PASS/FAIL | 截图 |
| 5 | 可编辑段落 | PASS/FAIL | 截图 |
| 6 | 可新增段落 | PASS/FAIL | 截图 |
| 7 | 可删除段落 | PASS/FAIL | 截图 |
| 8 | 可添加 annotation | PASS/FAIL | 截图 |
| 9 | 可打开 chat panel | PASS/FAIL | 截图 |
| 10 | 可导出 markdown | PASS/FAIL | 文件内容 |
| 11 | 刷新后状态 | 全部丢失 | 说明 |

## 结论
从以下三档中选择：
- [ ] demo usable
- [ ] prototype usable with clear limitations
- [ ] not yet usable

## 失败项原因
（如有失败项，说明原因）
```

---

## 任务 3：DEMO_SCRIPT.md

创建一个简短的 demo 演示脚本：

```markdown
# DEMO SCRIPT — GrapePaper v0.1

## 步骤

1. **启动项目** — 运行 `npm run dev`，打开浏览器
2. **查看布局** — 展示侧边栏、石板段落、藤蔓连接器
3. **编辑标题** — 在侧边栏输入框修改文档标题
4. **编辑段落** — 点击石板内的文本区域，输入/修改内容
5. **添加批注** — 点击 "+ Annotation" 按钮，输入批注内容
6. **展开批注** — 点击葡萄叶展开批注内容
7. **打开聊天** — 再次点击展开的批注，打开 mock AI 聊天面板
8. **查看引用** — 鼠标悬浮在露水引用上，查看悬浮预览
9. **导出文档** — 点击 "Export .md" 按钮，下载 Markdown 文件
10. **展示导出** — 打开导出的 .md 文件，展示内容

## 注意事项
- AI 聊天是 mock（模拟回复），界面有 "mock" 标签
- Import 按钮未实现，显示 "(soon)"
- 刷新页面后所有修改会丢失（无持久化）
```

---

## 任务 4：后续开发建议（可选）

如果时间允许，按优先级实现：

### P1: 持久化存储
- 使用 localStorage 保存文档数据
- 页面加载时自动恢复

### P2: 接入真实 AI API
- 创建 `src/services/aiService.ts`
- 支持 OpenAI API（通过环境变量注入 API Key）
- 保持 mock 作为 fallback

### P3: 文件导入
- 支持 Markdown 文件导入
- 解析标题和段落结构

### P4: Zotero 集成
- 支持 Better BibTeX 导出文件导入
- 或通过 Zotero Web API 获取文献

---

## 重要提醒

1. **先读文档**：开始前先阅读 `STATUS.md`、`PLAN.md`、`PROJECT_LOG.md`
2. **诚实记录**：失败就是失败，不要伪装成功
3. **证据优先**：每个结论都要有截图/日志/文件作为证据
4. **不扩功能**：本轮只做 demo 和验证，不开发新功能
5. **更新文档**：完成后更新 STATUS.md 和 PROJECT_LOG.md

---

## 交付物

完成后请提供：
1. `demo/screenshots/` 中的 7 张截图
2. `USABILITY_CHECK.md`
3. `DEMO_SCRIPT.md`
4. 更新后的 `STATUS.md`
5. 最终的 `GrapePaper-v0.1-final.zip`
