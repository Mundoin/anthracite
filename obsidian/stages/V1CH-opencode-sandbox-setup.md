# V1CH — OpenCode Sandbox Setup

**Date:** 2026-06-04
**Branch:** `opencode-anthracite-sandbox`
**Author:** OpenCode orchestrator (setup-only patch)

## Purpose

Prepare Anthracite for OpenCode integration by correcting AgentOps git policy and
adding minimal OpenCode configuration. No product runtime changes.

## Changes

### `.agents/` fully git-ignored

`.agents/` is now fully ignored by Git. AO remains active as local runtime
infrastructure, but no `.agents/` content is tracked. Durable knowledge is
promoted into:

- `docs/operations/`
- `obsidian/`
- `AGENTS.md`
- `CLAUDE.md`
- `GOALS.md`
- `PRODUCT.md`

### `.gitignore` cleanup

Replaced contradictory partial `.agents/` rules (tracked-markdown-wiki commentary,
runtime-churn split, duplicate final blocks) with a single clear block:

```gitignore
# AgentOps / AO runtime state
# AO owns this directory locally. Durable knowledge is promoted into tracked
# docs/operations/, obsidian/, AGENTS.md, CLAUDE.md, GOALS.md, or PRODUCT.md.
/.agents/
.agents/
```

### Graphify freshness no longer references `.agents/`

`tools/graphify-freshness.ps1` no longer scans curated `.agents/` subpaths.
Tracked source inputs are now:

- Code/docs roots: `src/`, `src-tauri/`, `docs/`, `obsidian/`
- Top-level config/docs: `package.json`, lockfiles, tsconfig/vite config,
  `AGENTS.md`, `CLAUDE.md`, `PRODUCT.md`, `GOALS.md`, `README.md`

### Workspace operator setup updated

`docs/operations/WORKSPACE_OPERATOR_SETUP.md` no longer lists `.agents/` as a
tracked source input for Graphify freshness.

### OpenCode config

Added `opencode.jsonc` — intentionally minimal, conservative repo-local config.
Uses only known-valid schema fields: `shell`, `plugin`, `agent`, `lsp`.
No custom policy objects or invented schema keys.

Specialist routing, safety policy, stack rules, and agent contracts live in
`AGENTS.md`, `CLAUDE.md`, global OpenCode config, and operator prompts —
not in `opencode.jsonc`.

## Validation

- [x] `git ls-files .agents` returns empty (nothing tracked)
- [x] `tools/validate.ps1` passes
- [x] No product runtime code modified
- [x] No `.agents/` created or initialised
