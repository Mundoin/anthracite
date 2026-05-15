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

## Terminals — all open idle

Every terminal initialises the repo (`Set-Location`, activate `.venv`, status
snapshot) and then **stops**. None of them auto-launches an agent, the app,
or any interactive command. Bujar starts Claude / Codex / DeepSeek / the app
manually when he chooses.

| Terminal | Purpose | Idle behaviour |
|----------|---------|----------------|
| **Anthracite — APP RUNNER**         | Dev loop seat. Runs `workspace-status.ps1` then `graphify-freshness.ps1`. | Prints `App runner ready. Start manually with: pnpm tauri:dev`. Does **not** auto-run `pnpm tauri:dev`. |
| **Anthracite — CLAUDE CODE**        | Main coding agent lane (Claude = architecture, Tauri/React/Rust, refactors, product shaping). | Prints `Claude terminal ready. Start manually with: claude`. Does **not** auto-run `claude`. |
| **Anthracite — CODEX ADMIN**        | Admin/ops agent lane (Codex = status, graph refresh, AO health, validation, low-risk docs). | Prints `Codex terminal ready. Start manually with: codex`. Does **not** auto-run `codex`. |
| **Anthracite — DEEPSEEK CLI**       | Optional builder/reviewer lane. Probed at init: `deepseek`, `deepseek-cli`, `ds`, `deepseek-v4`. | Prints `DeepSeek terminal ready. Start manually with your DeepSeek CLI command.` |
| **Anthracite — GITHUB / GIT ADMIN** | `git` / `gh` admin lane. Prints `git status --short` and `gh --version` on open. | Prints `GitHub/Git admin terminal ready. Run git/gh commands manually.` No interactive `gh` command. |

Only the App Runner runs `graphify-freshness.ps1`, on purpose — preventing
several terminals from launching Graphify in parallel.

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

Tracked source inputs:

- Code/docs roots: `src/`, `src-tauri/`, `docs/`, `obsidian/`
- Curated `.agents/` subpaths only: `.agents/README.md`,
  `.agents/learnings/`, `.agents/patterns/`, `.agents/findings/`,
  `.agents/decisions/`, `.agents/planning-rules/`, `.agents/council/`,
  `.agents/runs/`
- Top-level config/docs: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
  `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `AGENTS.md`,
  `CLAUDE.md`, `PRODUCT.md`, `GOALS.md`, `README.md`

**Excluded from freshness** (AO runtime / churn — must not force Graphify
refresh on every workspace open): `.agents/ao/`, `.agents/knowledge/`,
`.agents/pool/`, `.agents/defrag/`, `.agents/signals/`,
`.agents/handoff/stop-*.md`, `.agents/handoff/auto-*.json`.

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
