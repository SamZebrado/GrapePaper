# GrapePaper 🍇

A grape-vine themed academic paper editor — a visual metaphor experiment.

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
| Styling | CSS Modules + CSS Variables |

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

### Mock / Placeholder
- ⚠️ AI chat responses are **simulated** — no real LLM API connected
- ⚠️ Citations use **hardcoded sample data** — no Zotero integration

### Not Implemented
- ❌ PDF import or rendering
- ❌ Zotero integration
- ❌ Real AI/LLM API connection
- ❌ File import (DOCX, LaTeX)
- ❌ Dark theme
- ❌ Mobile responsive layout

## Design Philosophy

The core idea is that document editing doesn't have to look like a blank white page. By using organic visual metaphors — stone, leaves, vines, dewdrops — the writing experience becomes less intimidating, particularly for users who struggle with the traditional academic writing interface.
