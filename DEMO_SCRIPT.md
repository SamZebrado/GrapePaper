
# DEMO SCRIPT — GrapePaper v0.1.19

## 步骤

1. **启动项目** — 运行 `npm run dev`，打开浏览器
2. **查看布局** — 展示侧边栏、石板段落、藤蔓连接器
3. **编辑标题** — 在侧边栏输入框修改文档标题
4. **编辑段落** — 点击石板内的文本区域，输入/修改内容
5. **添加批注** — 点击 "+ Annotation" 按钮，在弹出的输入框中输入批注内容，点击 "Add Annotation" 确认
6. **展开批注** — 点击葡萄叶展开批注内容
7. **编辑批注** — 点击展开批注中的 "Edit" 按钮，修改批注内容，点击 "Save" 确认
8. **删除批注** — 点击展开批注中的 "Delete" 按钮，确认删除
9. **打开聊天** — 再次点击展开的批注，打开 mock AI 聊天面板
10. **查看引用** — 鼠标悬浮在露水引用上，查看悬浮预览
11. **导出文档** — 点击 "Export .md" 按钮，下载 Markdown 文件
12. **导出 JSON** — 点击 "Export .json" 按钮，下载 JSON 文件
13. **导入 JSON** — 点击 "Import .json" 按钮，选择之前导出的 JSON 文件
14. **导入 Markdown** — 点击 "Import .md" 按钮，选择 Markdown 文件
15. **重置为示例** — 点击 "Reset to Sample" 按钮，恢复到示例文档
16. **清除草稿** — 点击 "Clear Draft" 按钮，清除本地草稿
17. **刷新页面** — 验证内容是否保留（localStorage 持久化）

## 注意事项
- AI 聊天是 mock（模拟回复），界面有 "mock" 标签
- 已实现 Import 功能，支持 JSON 和 Markdown 导入
- 已实现 localStorage 持久化，刷新页面后修改会保留
- 已实现批注的编辑和删除功能
- 已添加 autosave/restore 状态提示
- 已添加 annotation 编辑时的保存/取消反馈

