# AGENTS.md — Anthracite (Codex contract)

> Pair file: [`CLAUDE.md`](./CLAUDE.md). Keep both in sync — asymmetry is a bug.
> See parent `D:\Repos\CLAUDE.md` for the cross-repo partnership protocol.

## Identity

This repo is **Anthracite v1**, a fresh build under `D:\Repos\anthracite`.
It is **not** a port, not a migration, not an extraction of `D:\Repos\_NEXUS`.

Stage: **V1A — Ground Zero Repo Factory** (scaffold only, amended with the
Agent Operating Layer gate — see `docs/operations/AGENT_OPERATING_LAYER.md`).

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

## Stack (locked for v1)

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

## Operating Posture

Codex = **Admin / Ops**. Source of truth for *how* the rig is set up:
- Scaffolding new modules / configs / dependencies.
- Tauri build chain, MSVC toolchain, WebView2 plumbing.
- Long-running deterministic prep (codegen, asset prep, lockfile management).
- `tools/*.ps1` automation.

When in doubt about architecture / intent / panel design / topology semantics →
defer to `CLAUDE.md`. When in doubt about *setup* → `AGENTS.md` wins.

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

Heavy commands (`/rpi`, `/crank`, `/evolve`, `/autodev`, `/swarm`, `/codex-team`)
require an explicit stage scope from Bujar. Do not self-invoke.

Knowledge consolidation across rigs happens at parent via `ao harvest` →
`~/.agentops/`. Codex does not write `.agents/` directly outside its current rig.

## Obsidian Vault

The Obsidian vault under `obsidian/` is the long-form memory:

- `obsidian/ANTHRACITE_INDEX.md` — entry point.
- `obsidian/stages/` — one file per stage (V1A, V1B, …).
- `obsidian/decisions/` — ADR-style decisions, dated.
- `obsidian/agents/` — agent-specific notes / playbooks.
- `obsidian/build-log/` — chronological build log.

After any non-trivial change Codex authors, add or update the matching note.

## Validation

Before reporting a task complete, Codex runs (and reports the output of):

```powershell
pnpm typecheck
pnpm build       # or at minimum: pnpm typecheck
cd src-tauri && cargo check
tools/validate.ps1
```

Do not declare success without showing the commands' actual output.

## File Layout (authoritative)

See [`README.md`](./README.md). Treat that diagram as canon. If Codex adds a
new top-level folder, update the diagram in the same change.

## Pointers

- Parent contract: `D:\Repos\AGENTS.md` (and `D:\Repos\CLAUDE.md`).
- Global Codex/Claude rules: `~/.codex/*`, `~/.claude/CLAUDE.md`.
- Product truth: `PRODUCT.md`.
- Fitness spec: `GOALS.md`.
