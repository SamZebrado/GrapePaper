
# USABILITY CHECK — GrapePaper v0.1.20

## 测试环境
- OS: macOS
- Node: 18.x
- npm: 9.x

## 测试项

| # | 任务 | 结果 | 证据 |
|---|------|------|------|
| 1 | npm install | ✅ PASS | 日志：added 366 packages, 0 vulnerabilities |
| 2 | npm run test:run | ✅ PASS | 60 tests passed |
| 3 | npm run typecheck | ✅ PASS | 零类型错误 |
| 4 | npm run build | ✅ PASS | vite v6.4.2 构建成功 |
| 5 | 页面打开 | ✅ PASS | 见 demo/screenshots/01-overview.png |
| 6 | 可编辑标题 | ✅ PASS | 见 demo/screenshots/02-title-edit.png |
| 7 | 可编辑段落 | ✅ PASS | 见 demo/screenshots/03-paragraph-edit.png |
| 8 | 可新增段落 | ✅ PASS | 见 demo/screenshots/03-paragraph-edit.png |
| 9 | 可删除段落 | ✅ PASS | 见 demo/screenshots/03-paragraph-edit.png |
| 10 | 可添加 annotation | ✅ PASS | 见 demo/screenshots/04-annotation-expanded.png |
| 11 | 可编辑 annotation | ✅ PASS | 见 demo/screenshots/05-annotation-editing.png |
| 12 | 可删除 annotation | ✅ PASS | 见 demo/screenshots/05-annotation-editing.png |
| 13 | 可打开 chat panel | ✅ PASS | 见 demo/screenshots/06-chat-panel.png |
| 14 | 可导出 markdown | ✅ PASS | 见 demo/screenshots/07-import-export.png |
| 15 | 可导出 JSON | ✅ PASS | 见 demo/screenshots/07-import-export.png |
| 16 | 可导入 JSON | ✅ PASS | 见 demo/screenshots/07-import-export.png |
| 17 | 可导入 Markdown | ✅ PASS | 见 demo/screenshots/07-import-export.png |
| 18 | 可重置为示例文档 | ✅ PASS | 见 demo/screenshots/08-reset-confirm.png |
| 19 | 可清除本地草稿 | ✅ PASS | 见 demo/screenshots/08-reset-confirm.png |
| 20 | 刷新后状态 | ✅ 保留 | 说明：已实现 localStorage 持久化 |

## 结论
从以下三档中选择：
- [ ] demo usable
- [x] prototype usable with clear limitations
- [ ] not yet usable

## 失败项原因
（如有失败项，说明原因）

