# Anthracite Operator Workspace Setup

Purpose: give Bujar a simple current-shell workflow for Anthracite without
relying on VS Code workspace terminals or archived helper scripts. This is
operator convenience only. Anthracite product runtime stays Tauri v2 + React +
TypeScript + Rust.

The local `.venv`, when present, is operator tooling consistency. It is not
Anthracite product runtime.

## How to open

```bash
cd /home/bujar/Repos/anthracite
```

Status snapshot at any time:

```bash
git status --short
```

## Current workflow

- Start the app manually with `pnpm tauri:dev` when a desktop smoke is needed.
- Use `graphify .` or `graphify update .` when the graph should be refreshed
  after source changes.
- Keep repo ops in the current shell; do not rely on restored terminal layouts
  or archived helper scripts.

## Constraints

- No app/dev server is started automatically by docs or helper wiring.
- No dependency install is performed by docs or helper wiring.
- No commit or push is performed by docs or helper wiring.
- External actions remain human-approved.
- Anthracite remains local-first; AI and external providers are optional
  workers, not sources of truth.
