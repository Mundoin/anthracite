# AGENTS.md - Anthracite (Codex contract)

> Pair file: [`CLAUDE.md`](./CLAUDE.md). Keep both in sync - asymmetry is a
> bug.

## Identity

This repo is **Anthracite v1**, a fresh build under `/home/bujar/Repos/anthracite`.
It is not a port, not a migration, and not an extraction of `D:\Repos\_NEXUS`.
The old PyQt repo at `D:\Repos\_NEXUS` and the `ObsidianAnthracite` vault are
reference truth, never sources of code.

Stage: **V1B - Source of Truth and Architecture Map**.

## Source of Truth

Before proposing any stage, plan, refactor, or architecture turn, read:

- `docs/architecture/ANTHRACITE_V1_SOURCE_OF_TRUTH.md`
- `docs/architecture/MODES_AND_ENGINES_MAP.md`
- `docs/architecture/ENGINE_AND_API_BOUNDARIES.md`
- `docs/architecture/BUILD_SEQUENCE.md`
- `docs/design/INDUSTRIAL_VISUAL_LAW.md`
- `docs/architecture/STACK_DECISION_TAURI_PROBATION.md`

Codex rules under this doctrine:

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

- Tauri 2 (Rust, edition 2021, MSRV 1.77)
- React 18 + TypeScript 5 + Vite 5
- Babylon.js 7 (no Three.js)
- pnpm 11 (no npm/yarn)
- Windows-first product development, with current repo ops performed from the
  local shell on Linux/CachyOS

## Hard Rules

1. No Python, ever.
2. No Three.js.
3. Do not copy code from `D:\Repos\_NEXUS`.
4. Do not inspect old repo code for product discovery in this stage.
5. No new dependencies without Bujar's approval.
6. Never push without explicit instruction.
7. Never run system-wide tooling installs without warning.
8. Do not run pytest.
9. Always read `obsidian/ANTHRACITE_INDEX.md` before deep architectural work.
10. Product truth lives in `ObsidianAnthracite` and this repo's `PRODUCT.md`.

## Operating Posture

Codex is admin / ops. Source of truth for how the rig is set up:

- scaffolding new modules / configs / dependencies
- Tauri build chain, MSVC toolchain, WebView2 plumbing
- long-running deterministic prep
- `tools/` automation

Codex also preserves the why without taking over Claude's product lane:

- panel composition, cockpit information architecture
- topology semantics (information vs live; 2D vs 3D selectability)
- Sentinel / Cortex / Forge boundaries
- decision records under `obsidian/decisions/`
- long-form narrative in `PRODUCT.md` and stage notes

When in doubt about architecture / intent / panel design / topology semantics
-> defer to `CLAUDE.md`. When in doubt about setup -> `AGENTS.md` wins.

## Local Helpers

- Repo workflow lives here; setup friction belongs to Codex.
- Repo-local validation / review / readiness helpers live in `tools/`.
- `graphify` writes `graphify-out/graph.json` and
  `graphify-out/GRAPH_REPORT.md`; those outputs are ignored in `.gitignore`.

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

The Obsidian vault under `obsidian/` is the long-form memory:

- `obsidian/ANTHRACITE_INDEX.md` - entry point.
- `obsidian/stages/` - one file per stage (V1A, V1B, ...).
- `obsidian/decisions/` - ADR-style decisions, dated.
- `obsidian/agents/` - agent-specific notes / playbooks.
- `obsidian/build-log/` - chronological build log.
- Every stage produces `obsidian/stages/V1<x>-<slug>.md`.
- Every notable decision becomes `obsidian/decisions/YYYY-MM-DD-<slug>.md`.

After any non-trivial change Codex authors, add or update the matching note.
Update the vault as part of the work - never as a separate doc pass.

## Validation

Before reporting a task complete, Codex runs the relevant checks and reports
the output:

- `pnpm typecheck`
- `pnpm build`
- `cd src-tauri && cargo check`
- `cd src-tauri && cargo test`

Do not declare success without showing the commands' actual output.

## File Layout

See [`README.md`](./README.md). Treat that diagram as canon. If Codex adds a
new top-level folder, update the diagram in the same change.

## Pointers

- Parent contract: the repo root `CLAUDE.md` and `AGENTS.md` pair.
- Product truth: `PRODUCT.md`.
- Fitness spec: `GOALS.md`.
- Claude contract: `CLAUDE.md`.

## graphify

This project has a knowledge graph at `graphify-out/` with god nodes,
community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `graphify` skill before doing
anything else.

Rules:

- For codebase questions, first run `graphify query "<question>"` when
  `graphify-out/graph.json` exists.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead
  of raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or
  when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current.

## Project Map

Anthracite has a generated project map for operator and agent orientation.

- Source data: `parser-lab/_project_status_map/anthracite-status-map-source.json`
- Generator: `tools/project-map/build-project-map.mjs`
- Generated visual: `docs/project-map/anthracite-project-map.html`

Codex role:

- Use the project map/source when doing repo-status, roadmap, or stage
  orientation work.
- After a landed stage, major prep corpus, roadmap change, deferred-boundary
  change, or safety-boundary change, mention whether the project-map source
  should be refreshed.
- Treat the generated HTML as a visual readout, not the product source of
  truth.
- Keep project-map refreshes separate from product implementation commits
  unless Bujar explicitly asks to bundle them.
- When source data changes and Bujar wants the visual refreshed, regenerate
  with:

```powershell
node tools/project-map/build-project-map.mjs
```
