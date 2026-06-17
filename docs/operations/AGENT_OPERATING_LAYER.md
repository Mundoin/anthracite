# Anthracite Workspace Operating Layer

## Purpose

Anthracite keeps a light, current-shell operating layer: Graphify for repo
orientation, Obsidian for durable notes, and normal shell validation for repo
health. There is no daemon-based runtime contract and no workspace-terminal
automation in the current workflow.

---

## Roles

### Bujar

Product owner, final judge, final commit/push authority.

### Claude - main coding agent

Handles product-shaping work:

- architecture decisions and information design
- Tauri / React / TypeScript implementation
- Rust core implementation
- Babylon.js topology cockpit work
- major refactors

### Codex - admin / operations agent

Handles low-risk repo and tooling work:

- repo status and sanity checks
- Graphify refresh and health probes
- validation script execution
- generated-report sanity checks
- doc-index upkeep
- repo hygiene

When in doubt: setup -> Codex / AGENTS.md wins. Intent -> Claude / CLAUDE.md
wins.

---

## Tools

### Graphify - repo map + architecture radar

Outputs:

- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.json`

Use Graphify before broad source exploration, refactor planning, or dependency
tracing when the graph exists. Use it to answer:

- What files matter?
- What modules connect?
- What changed since the last graph?
- Where are risky-to-touch areas?

### Obsidian - human-readable build memory

`obsidian/` tracks:

- `stages/` - one per build stage
- `decisions/` - ADR-style, dated
- `agents/` - agent-specific notes
- `build-log/` - chronological session log

The old `ObsidianAnthracite` vault remains the old product truth archive. This
repo's `obsidian/` folder tracks the new Anthracite V1 build.

---

## Validation

Run the current repo checks before reporting a task complete:

```bash
pnpm typecheck
pnpm build
cd src-tauri && cargo check
cd src-tauri && cargo test
```

If the repo also needs a smoke run, use the desktop app command manually:

```bash
pnpm tauri:dev
```

Do not declare success without showing actual validation output.

---

## Readiness Checklist

Operate from the current shell and keep the repo clean enough to reason about:

- [ ] Git repo exists at `/home/bujar/Repos/anthracite`
- [ ] `pnpm install` succeeds when needed
- [ ] `graphify` command is on PATH
- [ ] `graphify-out/GRAPH_REPORT.md` exists when graph guidance is needed
- [ ] `graphify-out/graph.json` exists when graph guidance is needed
- [ ] `obsidian/decisions/0001-agent-operating-layer-first.md` exists

`graphify` and the shell checks are the mechanical truth. Read their output,
not memory.

---

## Failure Modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `graphify` not found | Not installed for current shell | Install or reopen the shell |
| `graphify-out/` missing | Never generated | Run `graphify .` from repo root |
| `pnpm` check fails | Dependencies or lockfile drift | Repair the repo state, then rerun |
| Validation scripts fail | Build or source regression | Fix the regression before proceeding |

---

## Exact Validation Commands

```bash
pnpm typecheck
pnpm build
cd src-tauri && cargo check
cd src-tauri && cargo test
graphify .
```

---

## Green Condition

Product coding for V1B and beyond starts only when the current repo checks are
green and the graph is current enough to navigate the work.

If validation is red, agents work on the repo state first, not on product.
