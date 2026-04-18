# 2026-04-17 - Demo 截图尝试（受阻）

## Objective
- 生成 7 张 demo 截图
- 录制操作流程视频/gif
- 完成 USABILITY_CHECK.md 可用性测试
- 打最终交付 zip

## Manual Testing Facts (Source-of-Truth)
- `npm run dev` 启动成功，localhost:5173 可访问
- 尝试使用 Playwright headless shell 截图，失败：`libatk-1.0.so.0: cannot open shared object file`
- apt 源不可用（DNS 解析失败），无法安装 GUI 依赖
- Puppeteer 同样需要 GUI 依赖，已卸载

## Changed Files
- 无代码改动
- 创建了 `demo/screenshots/` 目录（空）
- 创建了 `demo-screenshot.mjs`（已删除）

## Commands Run
- `npm install` — 通过
- `npm run dev -- --host 0.0.0.0` — 通过
- `npx playwright install chromium` — 下载成功但缺少系统依赖
- `apt-get install libatk1.0-0 ...` — 失败（DNS 问题）
- `npm install puppeteer` — 安装成功但同样需要 GUI 依赖
- `npm uninstall puppeteer playwright` — 清理完成

## Raw Results
- Dev server 正常运行
- Headless browser 无法启动（缺少 libatk 等 X11 相关库）

## Verified vs. Unverified
- Verified: 构建和 dev server 启动
- Unverified: UI 交互、截图、导出功能实际效果

## Current Conclusion
- 项目代码状态良好，构建正常
- VM 环境限制导致无法完成可视化 demo
- 需要在有 GUI 环境的机器上继续

## Next Step Suggestions
1. 在本地 Mac/Windows/Linux 桌面环境运行 `npm run dev`
2. 手动截图或使用系统浏览器截图工具
3. 完成 USABILITY_CHECK.md
4. 接入真实 AI API

## Blockers Encountered
- VM 无 GUI 依赖（libatk, libxcomposite, libxdamage, libatspi 等）
- apt 源 DNS 解析失败，无法安装系统包
