# Anthracite V1 — Operator Workspace Setup

Purpose: give Bujar a single VS Code window where all CLIs needed to operate
Anthracite are one click away as restored terminals. **Operator convenience
only.** Anthracite product runtime stays Tauri v2 + React + TypeScript + Rust.

The local `.venv` is **operator tooling consistency** — never product runtime.
No Python application code lives in this repo and none will be added.

---

## How to open

```powershell
code D:\Repos\anthracite\anthracite.code-workspace
```

First-time / re-bootstrap (creates `.venv` if missing, prints tool versions,
probes DeepSeek CLI):

```powershell
powershell -ExecutionPolicy Bypass -File tools\workspace-init.ps1
```

Status snapshot at any time (read-only):

```powershell
powershell -ExecutionPolicy Bypass -File tools\workspace-status.ps1
```

The workspace requires the `EthanSK.restore-terminals` extension (recommended
in the workspace file) for the auto-restored terminals to fire on open.

---

## Terminals

| Terminal | Purpose |
|----------|---------|
| **Anthracite — APP RUNNER**       | Run app and dev loop. Runs `workspace-status.ps1` then `graphify-freshness.ps1`. Last line reminds: `pnpm tauri:dev`. |
| **Anthracite — CLAUDE CODE**      | Claude Code session. Claude = main coding agent (architecture, Tauri/React/Rust, refactors, product shaping). |
| **Anthracite — CODEX ADMIN**      | Codex session. Codex = admin/ops agent (status, graph refresh, AO health, validation, low-risk docs). |
| **Anthracite — DEEPSEEK CLI**     | Optional builder/reviewer terminal. Probed at init under common names: `deepseek`, `deepseek-cli`, `ds`, `deepseek-v4`. If none resolves, terminal opens idle. |
| **Anthracite — GITHUB / GIT ADMIN** | `git` and `gh` admin lane. Prints `git status --short` and `gh --version` on open. |

Each terminal: `Set-Location` → activate `.venv` → run `workspace-status.ps1` →
start the relevant CLI. The App Runner is the only terminal that also runs
`graphify-freshness.ps1`, on purpose — preventing several terminals from
launching Graphify in parallel.

---

## Graphify freshness guard

`tools\graphify-freshness.ps1` is an **AST-only** freshness check. It never
runs the full semantic / LLM pipeline and never requires Gemini/Google API
keys.

Logic:

- If `graphify-out\graph.json` is missing → `[YELLOW]` run `graphify update .`
- If any tracked source input is newer than `graph.json` → `[YELLOW]` run `graphify update .`
- Otherwise → `[GREEN]` current
- If `graphify` is missing or update fails / times out → `[RED]`

Tracked source inputs: `src/`, `src-tauri/`, `docs/`, `obsidian/`,
`.agents/**/*.md`, plus `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
`tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `AGENTS.md`,
`CLAUDE.md`, `PRODUCT.md`, `GOALS.md`, `README.md`.

Runtime: ~90s timeout. Full output goes to a per-run log under `$env:TEMP\graphify-freshness-YYYYMMDD-HHMMSS.log`.

`graphify-out/` remains gitignored.

---

## Constraints

- `.venv` is gitignored. It is not product runtime. Do not add app code there.
- No Python dependency management is introduced.
- No new GitHub remote, no commits, no pushes triggered by this setup.
- `_NEXUS` is not touched.
- Workspace terminals do **not** auto-run `pnpm tauri:dev`. They print the
  reminder so Bujar starts it deliberately.
