# AGENTS.md — Anthracite (Codex contract)

> Pair file: [`CLAUDE.md`](./CLAUDE.md). Keep both in sync — asymmetry is a bug.
> See parent `D:\Repos\CLAUDE.md` for the cross-repo partnership protocol.

## Identity

This repo is **Anthracite v1**, a fresh build under `D:\Repos\anthracite`.
It is **not** a port, not a migration, not an extraction of `D:\Repos\_NEXUS`.
The old PyQt repo at `D:\Repos\_NEXUS` and the `ObsidianAnthracite`
vault are reference truth, never sources of code.

Stage: **V1B — Source of Truth and Architecture Map**
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

Codex's rules under this doctrine:

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

Hard gate: Anthracite V1 product coding (V1B+) starts only when
`tools/ops-readiness.ps1` reports **READY**.

## Stack (locked)

- Tauri **2** (Rust, edition 2021, MSRV 1.77)
- React 18 + TypeScript 5 + Vite 5
- Babylon.js 7 (no Three.js)
- pnpm 11 (no npm/yarn)
- Windows-first

## Hard Rules (Codex)

1. **No Python, ever.** No `.py`, no PyQt, no Python tooling.
2. **No Three.js.** All 3D/2D scene rendering through Babylon.js.
3. **Do not copy code from `D:\Repos\_NEXUS`.** That repo is reference truth
   for the *old* product, not source for *this* build.
4. **Do not inspect old repo code for product discovery in this stage.**
   `ObsidianAnthracite` already holds the product knowledge — use it.
5. **No new dependencies without Bujar's approval.** Tauri / Babylon / React
   are pinned; everything else needs sign-off.
6. **Never `git push` without explicit instruction.**
7. **Never run pnpm/cargo install of system-wide tooling without warning.**
8. **Do not run pytest. There is no pytest. There is no Python.**
9. **Always read `obsidian/ANTHRACITE_INDEX.md` before deep architectural
   work.**
10. **Product truth lives in `ObsidianAnthracite` and this repo's
    `PRODUCT.md`.**

## Operating Posture

Codex = **Admin / Ops**. Source of truth for *how* the rig is set up:
- Scaffolding new modules / configs / dependencies.
- Tauri build chain, MSVC toolchain, WebView2 plumbing.
- Long-running deterministic prep (codegen, asset prep, lockfile management).
- `tools/*.ps1` automation.

Codex also preserves the *why* without taking over Claude's product lane:
- Panel composition, cockpit information architecture.
- Topology semantics (information vs live; 2D vs 3D selectability).
- Sentinel / Cortex / Forge boundaries.
- Decision records under `obsidian/decisions/`.
- Long-form narrative in `PRODUCT.md` and stage notes.

When in doubt about architecture / intent / panel design / topology semantics →
defer to `CLAUDE.md`. When in doubt about *setup* → `AGENTS.md` wins.

## Local Helpers

- Repo workflow lives here; setup friction belongs to Codex.
- Repo-local validation / review / readiness agents live in `.claude/agents/`.
- `graphify` writes `graphify-out/graph.json` and
  `graphify-out/GRAPH_REPORT.md`; those outputs are ignored in `.gitignore`.

When in doubt about setup / ops / pipelines → `AGENTS.md` wins.
When in doubt about intent / structure → defer to `CLAUDE.md`.

## V1A Acceptance (completed baseline)

- App scaffold launches: title bar + 3 placeholder panels + center Babylon
  canvas.
- Dark cockpit theme baseline applied.
- `pnpm typecheck`, `pnpm build`, `cargo check` (in `src-tauri/`) all green.
- Docs present: `README.md`, `PRODUCT.md`, `GOALS.md`, `AGENTS.md`,
  `CLAUDE.md`.
- Obsidian vault skeleton present under `obsidian/`.
- `.agents/` initialized but git-ignored.
- No topology logic, no Sentinel logic, no Cortex logic, no Forge logic.

## AO (AgentOps) Usage

AO is **rig-scoped**. This repo owns its `.agents/`. Parent `D:\Repos\` does not.

Common per-rig commands:

```powershell
ao status                     # what's loaded, where we are
ao goals validate --json      # parse GOALS.md cleanly
ao goals measure              # run gates (needs Git Bash > WSL on PATH)
ao research "<question>"      # read-only shape check
ao plan "<scope>"             # multi-path planning
ao retro                      # after a surprise / fix / stage boundary
ao handoff                    # session boundary
```

Per-rig slash commands mirrored from `CLAUDE.md`:

- `/status` — start meaningful sessions here.
- `/inject` — pull relevant `.agents/` knowledge into context.
- `/research <question>` — read-only investigation.
- `/plan <scope>` — before multi-path or risky stages.
- `/pre-mortem <scope>` — before topology / clean-room / parity-affecting
  moves.
- `/review` — before commit when diff carries risk.
- `/retro` — after surprises or stage boundaries.
- `/handoff` — at session boundaries.

Heavy commands (`/rpi`, `/crank`, `/evolve`, `/autodev`, `/swarm`, `/codex-team`)
require an explicit stage scope from Bujar. Do not self-invoke.

When AO is used, report whether useful `.agents/` evidence was created or
reused. AO should *reduce* operator tax, not become ceremony.

Knowledge consolidation across rigs happens at parent via `ao harvest` →
`~/.agentops/`. Codex does not write `.agents/` directly outside its current rig.

## Obsidian Vault Discipline

The Obsidian vault under `obsidian/` is the long-form memory:

- `obsidian/ANTHRACITE_INDEX.md` — entry point.
- `obsidian/stages/` — one file per stage (V1A, V1B, …).
- `obsidian/decisions/` — ADR-style decisions, dated.
- `obsidian/agents/` — agent-specific notes / playbooks.
- `obsidian/build-log/` — chronological build log.
- Every stage produces `obsidian/stages/V1<x>-<slug>.md`.
- Every notable decision becomes `obsidian/decisions/YYYY-MM-DD-<slug>.md`.

After any non-trivial change Codex authors, add or update the matching note.
Update the vault as part of the work — never as a separate "doc pass".

## Validation

Before reporting a task complete, Codex runs (and reports the output of):

```powershell
pnpm typecheck
pnpm build       # or at minimum: pnpm typecheck
cd src-tauri && cargo check
tools/validate.ps1
```

Do not declare success without showing the commands' actual output.

## File Layout

See [`README.md`](./README.md). Treat that diagram as canon. If Codex adds a
new top-level folder, update the diagram in the same change.

## Pointers

- Parent contract: `D:\Repos\AGENTS.md` (and `D:\Repos\CLAUDE.md`).
- Global Codex/Claude rules: `~/.codex/*`, `~/.claude/CLAUDE.md`.
- Product truth: `PRODUCT.md`.
- Fitness spec: `GOALS.md`.
- Claude contract: `CLAUDE.md`.

## AgentOps Knowledge Flywheel

Knowledge compounds automatically across sessions:

- **MEMORY.md** is auto-loaded by your AI coding tool every session.
- **Session hooks** extract learnings, update MEMORY.md, and prune stale
  knowledge.
- **Skills** invoke flywheel commands at the right moments (no manual AO
  commands needed).

Verify the flywheel any time:

```powershell
ao flywheel status    # escape velocity check
ao status             # current knowledge inventory
```

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
