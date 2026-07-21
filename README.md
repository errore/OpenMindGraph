# OpenMindGraph

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/) [![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/) [![React Flow](<https://img.shields.io/badge/React%20Flow-12-FF0072>)](https://xyflow.com/) [![Tauri](https://img.shields.io/badge/Tauri-2-FFC131)](https://v2.tauri.app/)

**Visualize your brainstorming. Let LLM think with you.**

把头脑风暴画出来，让 LLM 帮你一起想。

> A local-first, node-graph-driven LLM divergent thinking editor.
> Like Lego for conversation trees — branch, fold, connect, explore freely.
>
> 一个本地优先、节点图驱动的 LLM 发散思维编辑器。
> 像拼乐高一样组合你的对话思路——分支、折叠、连线、自由探索。
>
> **Status / 当前状态**: Early stage, core features usable. 早期迭代中，核心功能可用。

<p align="center">
  <a href="https://github.com/errore/OpenMindGraph/releases/latest">
    <img src="https://img.shields.io/github/v/release/errore/OpenMindGraph?style=for-the-badge&label=Download%20Latest%20/%20下载最新版&color=2ea44f" alt="Download Latest Release" />
  </a>
  <br>
  <a href="https://github.com/errore/OpenMindGraph/releases/latest/download/OpenMindGraph_0.1.0_x64-setup.exe">
    <img src="https://img.shields.io/badge/Windows-x64_Setup-0078D7?style=flat-square&logo=windows" alt="Windows Installer" />
  </a>
  <a href="https://github.com/errore/OpenMindGraph/releases/latest/download/OpenMindGraph_0.1.0_x64.dmg">
    <img src="https://img.shields.io/badge/macOS-Apple_Silicon_%2F_Intel-333333?style=flat-square&logo=apple" alt="macOS DMG" />
  </a>
  <a href="https://github.com/errore/OpenMindGraph/releases/latest/download/OpenMindGraph_0.1.0_x86_64.AppImage">
    <img src="https://img.shields.io/badge/Linux-x86_64_AppImage-E95420?style=flat-square&logo=linux" alt="Linux AppImage" />
  </a>
  <a href="https://github.com/errore/OpenMindGraph/releases/latest/download/openmindgraph_0.1.0_amd64.deb">
    <img src="https://img.shields.io/badge/Linux-.deb_(Ubuntu%2FDebian)-CC0033?style=flat-square&logo=debian" alt="Linux .deb" />
  </a>
</p>

---

## Why this tool / 为什么要有这个工具

If you've ever felt these when chatting with LLM — this is for you.
和 LLM 聊天时你大概也遇到过这些感觉：

- Want to branch in another direction without polluting the current conversation / 聊到一半想走另一个方向，但不想污染当前对话
- AI lists 10 ideas, you want to deep-dive into just 1 / AI 列出 10 个点子，你只想深挖其中 1 个
- Jumping between topics, scrolling through endless history / 反复在几个话题间跳转，翻聊天记录翻到头疼
- Want to save the complete thought map, not just a wall of text / 想把这次探索的完整思路保存下来，而不是一团文本

OpenMindGraph turns the **node graph** into your thinking canvas. Each node is a conversation, a note, or a prompt template — drag to connect ideas. Want another direction? Just pull a new connection. Need to organize? Collapse a group into a subgraph.

OpenMindGraph 把**节点图**当作思考的画布。每个节点是一次对话、一段笔记或一个提示词模板，拖拽连线就能串联思路。想往另一个方向走？拉一条新连线就行。想整理？把一组节点折叠成一个子图。

---

## Quick start / 快速上手

```bash
# Install dependencies / 安装依赖
pnpm install

# Browser dev mode / 浏览器模式开发
pnpm dev

# Desktop app / 桌面应用
pnpm tauri:dev
```

Open `localhost:5173`, click the gear icon to configure your LLM, and start chatting.

浏览器打开 `localhost:5173`，点齿轮图标配置 LLM 就能开聊。

---

## Node types / 它长什么样

The canvas has several building blocks you can drag and connect:

画布上有几种"积木块"（节点），拖过来就能用：

| Node / 积木                                                        | What it does / 干什么用的                                                                                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **ChatNode / 对话节点**                                      | Chat with LLM like a normal conversation window; message history stays in the node. 像普通聊天窗口一样和 LLM 对话，消息历史保留在节点里    |
| **TextNode / 文本节点**                                      | Paste notes, excerpts, ideas — no model calls. 贴一段笔记、摘录、灵感碎片，不调用模型                                                     |
| **TemplateNode / 模板节点**                                  | Prompt templates with`{{placeholder}}`, auto-filled from upstream input. 写一个带 `{{占位}}` 的提示词模板，自动填充上游输入            |
| **SummaryNode / 总结节点**                                   | Summarize upstream chat content into a concise paragraph. 把上游聊过的东西总结成一段话                                                     |
| **SubgraphNode(Not Available Now) / 子图节点（当前不可用）** | Fold a group of nodes into one; LLM auto-generates a summary. Double-click to expand. 把一组节点折叠起来，LLM 自动生成摘要。双击展开看细节 |

Nodes have **input ports** (left) and **output ports** (right). Drag from an output to an input to chain their context together.

节点左端是**输入口**，右端是**输出口**。从一个节点的输出口拖到另一个节点的输入口，就把它们的上下文穿起来了。

---

## Tech stack / 技术栈

| Layer / 层           | Choice / 选型                                        |
| -------------------- | ---------------------------------------------------- |
| Monorepo             | pnpm workspaces                                      |
| Language / 语言      | TypeScript 5.8 (strict mode)                         |
| Frontend / 前端      | React 19 + Vite 6                                    |
| Canvas / 画布        | React Flow (xyflow) v12                              |
| Desktop / 桌面壳     | Tauri v2 (Rust native backend)                       |
| State / 状态管理     | React Flow hooks + Zustand (settings only)           |
| Persistence / 持久化 | IndexedDB via Dexie.js 4 (auto-save, 200ms debounce) |
| LLM Proxy / LLM 代理 | Rust Tauri commands (`chat_stream`, SSE streaming) |
| Validation / 校验    | Zod                                                  |
| Linting              | ESLint flat config + Prettier                        |
| Testing / 测试       | Vitest                                               |

---

## Requirements / 需要什么环境

| Tool / 工具 | Version / 版本                                         |
| ----------- | ------------------------------------------------------ |
| Node.js     | >= 20                                                  |
| pnpm        | >= 9                                                   |
| Rust        | Optional — only needed for desktop build / 桌面版需要 |

Browser mode doesn't need Rust — just `pnpm dev`.

浏览器模式不需要 Rust，直接 `pnpm dev` 就能跑。

---

## Project structure / 项目结构速览

```
openmindgraph/
├── packages/
│   ├── core/                         # Types + Zod schemas (shared)
│   │   └── src/                      # 类型定义 + Zod 校验（前后端共享）
│   │       ├── types/index.ts        # TypeScript type definitions
│   │       └── schema/index.ts       # Zod runtime validation schemas
│   │
│   └── frontend/                     # React SPA + Tauri desktop shell
│       │                             # 前端 + Tauri 桌面壳
│       ├── src/                      # React UI
│       │   ├── main.tsx              # Entry point
│       │   ├── canvas/               # Canvas UI (React Flow instance, nodes…)
│       │   │   ├── Canvas.tsx
│       │   │   ├── Topbar.tsx
│       │   │   └── nodes/            # Node type components / 节点类型组件
│       │   ├── nodes/                # Shared node infrastructure / 共享节点基础设施
│       │   ├── persistence/          # Auto-save / restore via Dexie
│       │   ├── services/             # LLM streaming service
│       │   ├── store/                # Zustand settings store
│       │   └── settings/             # Settings modal & LLM popover
│       └── src-tauri/                # Rust backend (LLM proxy, config, mock mode)
│           └── src/                  # Rust 后端（LLM 代理、配置）
```

## Commands / 常用命令

| Command / 命令       | What it does / 用途                                  |
| -------------------- | ---------------------------------------------------- |
| `pnpm dev`         | Vite dev server @`localhost:5173` / 前端开发服务器 |
| `pnpm build`       | Type-check + Vite production build / 生产构建        |
| `pnpm typecheck`   | `tsc -b` across all packages / 类型检查            |
| `pnpm test`        | Vitest / 运行测试                                    |
| `pnpm lint`        | ESLint / 代码检查                                    |
| `pnpm format`      | Prettier / 格式化                                    |
| `pnpm tauri:dev`   | Tauri desktop dev mode / 桌面应用开发模式            |
| `pnpm tauri:build` | Tauri production build / 桌面应用生产构建            |

> Use `tsc -b` (not plain `tsc`) — the project uses composite TypeScript project references.

---

## Architecture / 架构特性

- **React SPA + optional Tauri shell** — same SPA runs in both browser and desktop; LLM calls always route through native Rust. 同一套 SPA 支持浏览器与桌面，LLM 调用走 Rust 原生层
- **Manual per-node execution** — each node runs via its play button; upstream changes show a stale indicator but never auto-trigger. 每个节点手动运行，上游变更显示过期提示但永不自动触发
- **Subgraph = isolated React Flow instance** — with its own undo/redo stack, navigated via breadcrumbs. 子图拥有独立的撤销/重做栈和视口，面包屑导航
- **Typed pin system** — handles are color-coded (text/json/code/image), connections validated by type; single-connection pins replace on reconnect. 引脚按数据类型着色，连接时类型校验，单连接引脚自动替换
- **MCP** — `MCPProvider` TS interface defined; mock-first, real implementation coming in M3

## Roadmap / 路线图

- **M0** ✅ Scaffolding — Vite + React Flow / 脚手架搭建
- **M1** ✅ Core loop — ChatNode + connections + LLM + auto-save / 核心闭环
- **M2** 🔄 Multi-node — TemplateNode, TextNode, SubgraphNode / 多节点系统
- **M3** ⏳ MCP integration / MCP 集成
- **M4** ⏳ Polish — RouterNode, CodeNode, plugin system / 打磨完善

## License / 许可

[MIT](LICENSE) © 2026 ErrorWings
