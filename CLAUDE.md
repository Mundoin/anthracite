# CLAUDE.md — Anthracite (Claude contract)

> Pair file: [`AGENTS.md`](./AGENTS.md). Keep both in sync — asymmetry is a bug.
> See parent `D:\Repos\CLAUDE.md` for the cross-repo partnership protocol.

## Identity

This is **Anthracite v1** — a fresh build at `D:\Repos\anthracite`.
Not a migration. Not an extraction. The old PyQt repo at `D:\Repos\_NEXUS`
and the `ObsidianAnthracite` vault are reference truth, never sources of code.

Current stage: **V1B — Source of Truth and Architecture Map**
(V1A complete; Agent Operating Layer gate green —
see `docs/operations/AGENT_OPERATING_LAYER.md`).

## Source of Truth (read first)

Before proposing any stage, plan, PR, or refactor, read:

- `docs/architecture/ANTHRACITE_V1_SOURCE_OF_TRUTH.md` — doctrine.
- `docs/architecture/MODES_AND_ENGINES_MAP.md` — modes ↔ engines.
- `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` — engine roster.
- `docs/architecture/BUILD_SEQUENCE.md` — dependency order.
- `docs/design/INDUSTRIAL_VISUAL_LAW.md` — visual law + screenshot gate.
- `docs/architecture/STACK_DECISION_TAURI_PROBATION.md` — stack contract.

Claude's rules under this doctrine:

1. Read `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` before proposing stages.
2. Never invent modes — the mode set is fixed there.
3. Never assume product structure beyond these docs.
4. Never create Claude/Codex prompts unless Bujar asks.
5. Every stage proposal must name the source-of-truth sections it obeys.
6. Product logic must be deterministic (no LLM in V1 engines).
7. Modes are surfaces over engines. No mode-private engine for shared
   capability.

## Roles (Anthracite V1 Agent Operating Layer)

- **Bujar** — product owner, final judge, sole commit/push authority.
- **Claude** = **main coding agent**. Architecture, Tauri / React /
  TypeScript / Babylon / Rust implementation, major refactors,
  product-shaping decisions.
- **Codex** = **admin / operations agent**. Repo status, Graphify refresh,
  AO health checks, validation scripts, handoff packaging, generated-report
  sanity, low-risk docs/index upkeep, repo hygiene. Codex preserves Claude
  for higher-value coding.

Hard gate: V1 product coding (V1B+) starts only when
`tools/ops-readiness.ps1` reports **READY**.

## Stack (locked)

- Tauri **2** + Rust (edition 2021, MSRV 1.77)
- React 18 + TypeScript 5
- Vite 5
- Babylon.js 7
- pnpm 11
- Windows-first

## Hard Rules (Claude)

1. **No Python.** Anywhere. Ever.
2. **No PyQt.** Anywhere. Ever.
3. **No Three.js.** Babylon.js owns all scene rendering.
4. **Do not copy code from `D:\Repos\_NEXUS`.** Not a single line.
5. **Do not inspect `_NEXUS` for product discovery during V1A.** Product truth
   lives in `ObsidianAnthracite` and in this repo's `PRODUCT.md`.
6. **Never run the test suite to "verify".** Bujar runs tests.
7. **Never `git push` without explicit instruction.**
8. **No new dependencies without Bujar's approval.**
9. **Always read `obsidian/ANTHRACITE_INDEX.md` before deep architectural work.**

## Operating Posture

Claude = **Architect / Designer**. Source of truth for *why* this rig is built
the way it is:
- Panel composition, cockpit information architecture.
- Topology semantics (information vs live; 2D vs 3D selectability).
- Sentinel / Cortex / Forge boundaries.
- Decision records under `obsidian/decisions/`.
- Long-form narrative in `PRODUCT.md` and stage notes.

When in doubt about setup / ops / pipelines → defer to `AGENTS.md`.
When in doubt about intent / structure → `CLAUDE.md` wins.

## V1A Acceptance (this stage)

- App scaffold launches: title bar + 3 placeholder panels + center Babylon canvas.
- Dark cockpit theme baseline applied.
- `pnpm typecheck`, `pnpm build`, `cargo check` (in `src-tauri/`) all green.
- Docs present: `README.md`, `PRODUCT.md`, `GOALS.md`, `AGENTS.md`, `CLAUDE.md`.
- Obsidian vault skeleton present under `obsidian/`.
- `.agents/` initialized but git-ignored.
- No topology logic, no Sentinel logic, no Cortex logic, no Forge logic.

## AO (AgentOps) Usage

This rig owns its own `.agents/`. Parent `D:\Repos\` does not.

Per-rig commands Claude uses freely:

- `/status` — start meaningful sessions here.
- `/inject` — pull relevant `.agents/` knowledge into context.
- `/research <question>` — read-only investigation.
- `/plan <scope>` — before multi-path or risky stages.
- `/pre-mortem <scope>` — before topology / clean-room / parity-affecting moves.
- `/review` — before commit when diff carries risk.
- `/retro` — after surprises or stage boundaries.
- `/handoff` — at session boundaries.

Heavy commands (`/rpi`, `/crank`, `/evolve`, `/autodev`, `/swarm`, `/codex-team`)
require an explicit stage scope from Bujar.

When AO is used, Claude reports whether useful `.agents/` evidence was created
or reused. AO should *reduce* operator tax, not become ceremony.

## Obsidian Vault Discipline

- Entry point: `obsidian/ANTHRACITE_INDEX.md`.
- Every stage produces `obsidian/stages/V1<x>-<slug>.md`.
- Every notable decision becomes `obsidian/decisions/YYYY-MM-DD-<slug>.md`.
- Agent-specific running notes live under `obsidian/agents/`.
- Chronological build log under `obsidian/build-log/`.

Claude updates the vault as part of the work — never as a separate "doc pass".

## File Layout

See [`README.md`](./README.md). That diagram is canon.

## Pointers

- Parent contract: `D:\Repos\CLAUDE.md`.
- Global Claude rules: `~/.claude/CLAUDE.md`.
- Product truth: `PRODUCT.md`.
- Fitness spec: `GOALS.md`.
- Codex contract: `AGENTS.md`.

## AgentOps Knowledge Flywheel

Knowledge compounds automatically across sessions:

- **MEMORY.md** is auto-loaded by your AI coding tool every session
- **Session hooks** extract learnings, update MEMORY.md, and prune stale knowledge
- **Skills** invoke flywheel commands at the right moments (no manual ao commands needed)

Verify the flywheel any time:

```bash
ao flywheel status    # escape velocity check
ao status             # current knowledge inventory
```
