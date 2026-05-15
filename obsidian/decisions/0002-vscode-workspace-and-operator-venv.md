# 0002 — VS Code Operator Workspace and Operator .venv

- **Date:** 2026-05-15
- **Status:** Accepted
- **Stage:** V1A — Ground Zero Repo Factory (operator support, not product code)
- **Authors:** Bujar, Claude

## Decision

Create a repo-local VS Code workspace (`anthracite.code-workspace`) and a
local `.venv` at `D:\Repos\anthracite\.venv` to give Bujar one-click working
terminals for: Claude Code, Codex, DeepSeek CLI, GitHub/git admin, and the
App Runner. Add an AST-only Graphify freshness guard
(`tools\graphify-freshness.ps1`) that the App Runner terminal invokes on
startup.

## Reason

- Reduce operator tax. Every required CLI launches in a labelled terminal
  with the right `cwd`, the `.venv` activated, and a status snapshot already
  printed.
- Preserve Claude budget for high-value coding. Codex and DeepSeek get
  dedicated lanes so cheaper/admin work does not consume Claude turns.
- Keep the partnership protocol explicit at the seat itself: Claude = main
  coding agent, Codex = admin/ops, DeepSeek = optional builder/reviewer.
- Make graph freshness an operator-side concern, not an agent-side one. The
  App Runner refreshes the AST graph once on workspace open so any agent
  that consults `graphify-out/` sees current data without manual steps.

## Constraints

- `.venv` is **operator tooling only**, never product runtime. Anthracite
  product runtime stays Tauri v2 + React + TypeScript + Rust.
- `.venv` is gitignored (already covered by `.gitignore`).
- No Python application code, no Python dependency management, no
  `requirements.txt` / `pyproject.toml` added by this decision.
- Graphify freshness uses `graphify update .` (AST-only). No semantic / LLM
  pipeline. No Gemini / Google API key dependency.
- `graphify-out/` stays gitignored.
- Only the App Runner runs `graphify-freshness.ps1` on startup, to avoid
  several terminals launching Graphify in parallel.
- No changes to `_NEXUS`. No new git remote. No commit triggered by this
  decision.

## Alternatives considered

- **Tasks.json instead of restored terminals.** Rejected: tasks would not
  give a persistent terminal seat per CLI; Bujar wants always-on lanes.
- **Global `.venv` in user profile.** Rejected: per-repo `.venv` keeps
  operator state colocated and disposable.
- **Run Graphify on every restored terminal.** Rejected: race + thrash. App
  Runner is the natural single owner.

## Consequences

- New files: `anthracite.code-workspace`, `tools/graphify-freshness.ps1`,
  `docs/operations/WORKSPACE_OPERATOR_SETUP.md`, this decision record.
- Updated: `tools/workspace-status.ps1` now reports `graph.json` presence and
  timestamp (still read-only).
- `tools/workspace-init.ps1` already in place from prior session covers
  `.venv` creation and tool/DeepSeek probing.
- Operator workflow becomes: `code .\anthracite.code-workspace` →
  five labelled terminals up → graph fresh → ready.
