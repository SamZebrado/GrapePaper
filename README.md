# GrapePaper 🍇

一个以葡萄藤为主题的学术论文编辑器 —— 视觉隐喻实验。

**版本**: v0.1.20

## 项目简介

GrapePaper 使用自然灵感的视觉元素来渲染学术文档：
- **石板** —— 段落以纹理石板的形式呈现
- **葡萄叶** —— 批注以叶子形状的元素生长出来
- **露水** —— 引用以半透明水滴的形式闪烁，带有悬停预览
- **藤蔓连接器** —— SVG 贝塞尔曲线将段落连接在一起
- **聊天气泡** —— AI 讨论线程从批注中浮现（当前为模拟）

## 快速开始

```bash
# 需要 Node.js >= 18 LTS
npm install
npm run dev
# 打开 http://localhost:5173/
```

## 构建

```bash
npm run build    # tsc + vite build → dist/
npm run preview # 在本地服务构建
npm run typecheck # 仅 TypeScript 检查
```

## 技术栈

| 层级 | 选择 |
|------|------|
| 框架 | React 18 + TypeScript 5.6 |
| 构建工具 | Vite 6 (esbuild) |
| 状态管理 | Zustand 5 |
| 富文本 | TipTap 2 (ProseMirror) |
| 动画 | Framer Motion 11 |
| 国际化 | i18next |
| 测试 | Vitest + @testing-library/react |
| 样式 | CSS Modules + CSS Variables |
| 许可证 | MIT |

## 项目结构

```
src/
├── components/          # 组件
│   ├── StoneSlab/       # 段落编辑器 (TipTap)
│   ├── GrapeLeaf/       # 批注显示
│   ├── DewdropCitation/ # 带有悬停预览的引用
│   ├── ChatBubble/      # 消息气泡 (基于年龄的收缩)
│   ├── ChatPanel/       # 滑入式讨论面板
│   ├── VineConnector/   # 段落间的 SVG 藤蔓
│   ├── Sidebar/         # 文档导航
│   └── EditorCanvas/    # 主编辑区域
├── i18n/                # 国际化文件
│   ├── locales/
│   │   ├── en.ts        # 英文翻译
│   │   └── zh-CN.ts     # 中文翻译
├── stores/              # Zustand 文档存储
├── styles/              # 主题系统 + 全局 CSS
└── types/               # TypeScript 接口
```

## 当前状态（如实说明）

### 已实现
- ✅ 石板段落渲染，带有石材纹理 CSS
- ✅ 石板内的 TipTap 富文本编辑（粗体、斜体）
- ✅ 葡萄叶批注（点击展开，再次点击打开聊天）
- ✅ 露水引用悬停预览（作者、标题、摘要、DOI 链接）
- ✅ 段落间的藤蔓连接器 SVG
- ✅ 基于年龄收缩动画的聊天气泡显示
- ✅ 带有文档标题编辑和段落导航的侧边栏
- ✅ 导出为 Markdown（.md 文件下载）
- ✅ 导出为 JSON（.json 文件下载）
- ✅ 从 JSON 导入（.json 文件）
- ✅ 从 Markdown 导入（.md 文件）
- ✅ 添加/删除段落
- ✅ 通过内联输入对话框添加批注
- ✅ localStorage 持久化（数据在页面刷新后保留）
- ✅ 重置为示例文档
- ✅ 清除本地草稿
- ✅ 国际化支持（英文和中文）
- ✅ 60+ 全面测试

### 模拟/占位
- ⚠️ 聊天当前是**模拟交互层**，不连接到真实的 LLM
- ⚠️ 引用当前是**仅展示**：使用硬编码的示例数据，支持引用详情的悬停预览，但不支持编辑、创建、删除或 Zotero 同步

### 未实现
- ❌ PDF 导入或渲染
- ❌ Zotero 集成
- ❌ 真实的 AI/LLM API 连接
- ❌ 文件导入（DOCX、LaTeX）
- ❌ 深色主题
- ❌ 移动端响应式布局

## 设计理念

核心思想是文档编辑不必看起来像一个空白的白色页面。通过使用有机视觉隐喻 —— 石头、叶子、藤蔓、露水 —— 写作体验变得不那么令人生畏，特别是对于那些在传统学术写作界面中挣扎的用户。

---

# GrapePaper 🍇

A grape-vine themed academic paper editor — a visual metaphor experiment.

**Version**: v0.1.20

## What It Is

GrapePaper renders academic documents using nature-inspired visuals:
- **Stone Slabs** — paragraphs appear as textured stone tablets
- **Grape Leaves** — annotations grow as leaf-shaped elements
- **Dewdrops** — citations shimmer as translucent water drops with hover preview
- **Vine Connectors** — SVG bezier curves link sections together
- **Chat Bubbles** — AI discussion threads emerge from annotations (currently mock)

## Quick Start

```bash
# Requires Node.js >= 18 LTS
npm install
npm run dev
# Open http://localhost:5173/
```

## Build

```bash
npm run build    # tsc + vite build → dist/
npm run preview # serve the build locally
npm run typecheck # TypeScript check only
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 + TypeScript 5.6 |
| Build | Vite 6 (esbuild) |
| State | Zustand 5 |
| Rich Text | TipTap 2 (ProseMirror) |
| Animation | Framer Motion 11 |
| Internationalization | i18next |
| Testing | Vitest + @testing-library/react |
| Styling | CSS Modules + CSS Variables |
| License | MIT |

## Project Structure

```
src/
├── components/
│   ├── StoneSlab/       # Paragraph editor (TipTap)
│   ├── GrapeLeaf/       # Annotation display
│   ├── DewdropCitation/ # Citation with hover preview
│   ├── ChatBubble/      # Message bubble (age-based shrinking)
│   ├── ChatPanel/       # Slide-in discussion panel
│   ├── VineConnector/   # SVG vine between sections
│   ├── Sidebar/         # Document navigation
│   └── EditorCanvas/    # Main editing area
├── i18n/                # Internationalization files
│   ├── locales/
│   │   ├── en.ts        # English translations
│   │   └── zh-CN.ts     # Chinese translations
├── stores/              # Zustand document store
├── styles/              # Theme system + global CSS
└── types/               # TypeScript interfaces
```

## Current State (Honest)

### Working
- ✅ Stone slab paragraph rendering with stone texture CSS
- ✅ TipTap rich text editing inside slabs (bold, italic)
- ✅ Grape leaf annotations (click to expand, click again to open chat)
- ✅ Dewdrop citation hover preview (authors, title, abstract, DOI link)
- ✅ Vine connector SVGs between paragraphs
- ✅ Chat bubble display with age-based shrinking animation
- ✅ Sidebar with document title editing and paragraph navigation
- ✅ Export to Markdown (.md file download)
- ✅ Export to JSON (.json file download)
- ✅ Import from JSON (.json file)
- ✅ Import from Markdown (.md file)
- ✅ Add/delete paragraphs
- ✅ Add annotations via inline input dialog
- ✅ localStorage persistence (data survives page refresh)
- ✅ Reset to sample document
- ✅ Clear local draft
- ✅ Internationalization support (English and Chinese)
- ✅ 60+ comprehensive tests

### Mock / Placeholder
- ⚠️ Chat is currently a **mock interaction layer** and does not connect to a real LLM
- ⚠️ Citations are currently **display-only**: they use hardcoded sample data, support hover preview of reference details, but do not support editing, creation, deletion, or Zotero synchronization

### Not Implemented
- ❌ PDF import or rendering
- ❌ Zotero integration
- ❌ Real AI/LLM API connection
- ❌ File import (DOCX, LaTeX)
- ❌ Dark theme
- ❌ Mobile responsive layout

## Design Philosophy

The core idea is that document editing doesn't have to look like a blank white page. By using organic visual metaphors — stone, leaves, vines, dewdrops — the writing experience becomes less intimidating, particularly for users who struggle with the traditional academic writing interface.
