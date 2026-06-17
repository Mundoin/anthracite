# CLAUDE.md - Anthracite (Claude contract)

> Pair file: [`AGENTS.md`](./AGENTS.md). Keep both in sync - asymmetry is a
> bug.

## Identity

This is **Anthracite v1** - a fresh build at `/home/bujar/Repos/anthracite`.
Not a migration. Not an extraction. The old PyQt repo at `D:\Repos\_NEXUS`
and the `ObsidianAnthracite` vault are reference truth, never sources of code.

Current stage: **V1B - Source of Truth and Architecture Map**.

## Source of Truth

Before proposing any stage, plan, PR, or refactor, read:

- `docs/architecture/ANTHRACITE_V1_SOURCE_OF_TRUTH.md`
- `docs/architecture/MODES_AND_ENGINES_MAP.md`
- `docs/architecture/ENGINE_AND_API_BOUNDARIES.md`
- `docs/architecture/BUILD_SEQUENCE.md`
- `docs/design/INDUSTRIAL_VISUAL_LAW.md`
- `docs/architecture/STACK_DECISION_TAURI_PROBATION.md`

Claude's rules under this doctrine:

1. Read `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` before proposing stages.
2. Never invent modes - the mode set is fixed there.
3. Never assume product structure beyond these docs.
4. Never create Claude/Codex prompts unless Bujar asks.
5. Every stage proposal must name the source-of-truth sections it obeys.
6. Product logic must be deterministic.
7. Modes are surfaces over engines. No mode-private engine for shared
   capability.

## Roles

- **Bujar** - product owner, final judge, sole commit/push authority.
- **Claude** - main coding agent. Architecture, Tauri / React / TypeScript /
  Babylon / Rust implementation, major refactors, product-shaping decisions.
- **Codex** - admin / operations agent. Repo status, Graphify refresh,
  validation scripts, generated-report sanity, low-risk docs/index upkeep,
  repo hygiene.

## Stack

- Tauri 2 + Rust (edition 2021, MSRV 1.77)
- React 18 + TypeScript 5
- Vite 5
- Babylon.js 7
- pnpm 11
- Windows-first product development, with current repo ops performed from the
  local shell on Linux/CachyOS

## Guidelines

1. No Python.
2. No PyQt.
3. No Three.js. Babylon.js owns all scene rendering.
4. Product truth lives in `ObsidianAnthracite` and this repo's `PRODUCT.md`.
5. Never push without explicit instruction.
6. Dependencies need Bujar approval.
7. Always read `obsidian/ANTHRACITE_INDEX.md` before deep architectural work.

## Operating Posture

Source of truth for why this rig is built the way it is:

- panel composition, cockpit information architecture
- topology semantics (information vs live; 2D vs 3D selectability)
- Sentinel / Cortex / Forge boundaries
- decision records under `obsidian/decisions/`
- long-form narrative in `PRODUCT.md` and stage notes

## Local Helpers

- Repo workflow, setup friction, and validation helpers live in `tools/`.
- `graphify` writes `graphify-out/graph.json` and
  `graphify-out/GRAPH_REPORT.md`; those outputs are ignored in `.gitignore`.

When in doubt about setup / ops / pipelines -> defer to `AGENTS.md`.
When in doubt about intent / structure -> `CLAUDE.md` wins.

## V1A Acceptance

- App scaffold launches: title bar + 3 placeholder panels + center Babylon
  canvas.
- Dark cockpit theme baseline applied.
- `pnpm typecheck`, `pnpm build`, and `cargo check` all green.
- Docs present: `README.md`, `PRODUCT.md`, `GOALS.md`, `AGENTS.md`,
  `CLAUDE.md`.
- Obsidian vault skeleton present under `obsidian/`.
- No topology logic, no Sentinel logic, no Cortex logic, no Forge logic.

## Obsidian Vault Discipline

- Entry point: `obsidian/ANTHRACITE_INDEX.md`.
- Every stage produces `obsidian/stages/V1<x>-<slug>.md`.
- Every notable decision becomes `obsidian/decisions/YYYY-MM-DD-<slug>.md`.
- Agent-specific running notes live under `obsidian/agents/`.
- Chronological build log under `obsidian/build-log/`.

Claude updates the vault as part of the work - never as a separate doc pass.

## File Layout

See [`README.md`](./README.md). That diagram is canon.

## Pointers

- Parent contract: `/home/bujar/Repos/CLAUDE.md`.
- Product truth: `PRODUCT.md`.
- Fitness spec: `GOALS.md`.
- Codex contract: `AGENTS.md`.

## graphify

This project has a knowledge graph at `graphify-out/` with god nodes,
community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when
  `graphify-out/graph.json` exists.
- Use `graphify path "<A>" "<B>"` for relationships.
- Use `graphify explain "<concept>"` for focused concepts.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead
  of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when
  query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current.

## Project Map

Anthracite has a generated project map for planning and stage orientation.

- Source data: `parser-lab/_project_status_map/anthracite-status-map-source.json`
- Generator: `tools/project-map/build-project-map.mjs`
- Generated visual: `docs/project-map/anthracite-project-map.html`

Claude role:

- Check the project map or its source before proposing a major stage,
  roadmap turn, architecture fork, or next-arc decision.
- Use it to understand what is landed, current, prep-only, deferred, halted,
  and still open for Bujar/Vale decision.
- After landing a stage or changing roadmap/safety/deferred boundaries, mention
  whether the project-map source should be refreshed.
- Treat the generated HTML as a visual readout, not the product source of
  truth.
- Keep project-map refreshes separate from product implementation commits
  unless Bujar explicitly asks to bundle them.
- When source data changes and Bujar wants the visual refreshed, regenerate
  with:

```powershell
node tools/project-map/build-project-map.mjs
```
