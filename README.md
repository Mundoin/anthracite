# Anthracite

> Living network intelligence cockpit. Local-first desktop app for network engineers.
> Topology is the crown jewel.

Stage **V1A — Ground Zero Repo Factory**. Fresh build from scratch. Not a migration.

---

## Stack

| Layer        | Choice                           |
|--------------|----------------------------------|
| Shell        | [Tauri 2](https://v2.tauri.app/) (Rust + WebView2) |
| Frontend     | React 18 + TypeScript 5          |
| Bundler      | Vite 5                           |
| 3D engine    | [Babylon.js 7](https://www.babylonjs.com/) (not Three.js) |
| Backend lang | Rust (edition 2021)              |
| Package mgr  | pnpm 11                          |
| Target OS    | Windows-first                    |

**Forbidden:** Python, PyQt, Three.js, code copied from `D:\Repos\_NEXUS`.

---

## Prerequisites

- Node.js 20+ (24 verified)
- pnpm 11+ (`npm install -g pnpm` if missing)
- Rust 1.77+ via rustup
- Tauri 2 system deps:
  - Windows: WebView2 (ships with Win11)
  - Visual Studio Build Tools (MSVC) — Rust toolchain
- Optional: Git Bash on PATH (project-wide quirk on this machine)

---

## Quickstart

```powershell
pnpm install
pnpm tauri:dev       # full desktop app
# — or —
pnpm dev             # web-only preview at http://localhost:1420
```

Other scripts:

```powershell
pnpm typecheck       # tsc --noEmit
pnpm lint            # ESLint
pnpm build           # frontend build only
pnpm tauri:build     # full installer/bundle (release)
```

---

## Repo layout

```
anthracite/
├─ src/                     React + Babylon.js frontend
│  ├─ App.tsx               Cockpit shell (title + 4 panels)
│  ├─ BabylonCanvas.tsx     Babylon scene placeholder (V1A)
│  └─ App.css               Dark cockpit theme
├─ src-tauri/               Rust + Tauri 2 backend
│  ├─ src/                  Rust source
│  ├─ capabilities/         Tauri permission manifests
│  └─ tauri.conf.json       App config
├─ obsidian/                Project memory / knowledge vault
│  ├─ ANTHRACITE_INDEX.md
│  ├─ stages/  decisions/  agents/  build-log/
├─ .agents/                 AgentOps per-rig state (git-ignored)
├─ tools/                   PowerShell automation
│  ├─ status.ps1
│  └─ validate.ps1
├─ AGENTS.md                Codex ops contract
├─ CLAUDE.md                Claude architecture contract
├─ GOALS.md                 Fitness spec (AO)
├─ PRODUCT.md               Product truth
└─ README.md                This file
```

---

## V1A acceptance

- [x] App launches via `pnpm tauri:dev`.
- [x] Title bar shows `ANTHRACITE`.
- [x] Babylon canvas occupies center area (dark empty scene).
- [x] Left panel: Topology / Layers placeholder.
- [x] Right panel: Inspector / Sentinel / Cortex placeholder.
- [x] Bottom panel: Events / Agents / Build placeholder.
- [x] No real topology logic yet.

---

## Pointers

- [`PRODUCT.md`](./PRODUCT.md) — what Anthracite is and why.
- [`GOALS.md`](./GOALS.md) — fitness gates.
- [`AGENTS.md`](./AGENTS.md) — Codex contract.
- [`CLAUDE.md`](./CLAUDE.md) — Claude contract.
- [`obsidian/ANTHRACITE_INDEX.md`](./obsidian/ANTHRACITE_INDEX.md) — vault entry point.
