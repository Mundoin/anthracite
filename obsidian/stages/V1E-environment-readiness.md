# V1E — Environment Lifecycle States + Readiness Summary

- **Date:** 2026-05-15
- **Status:** Complete
- **Obeys:** `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` §4 (deterministic-only),
  §6 (engine/API first), §11 (Rust owns truth, no mode-private engines).
  `ENGINE_AND_API_BOUNDARIES.md` — Environment Engine row.

## Goal

Make the Environment Centre show deterministic environment readiness,
owned by Rust. React only displays.

## What landed

### Rust — readiness model
- `EnvironmentLifecycleState` enum: `ready | degraded | offline | incomplete`.
- `EnvironmentReadiness` struct: active id/name, lifecycle state,
  catalogue totals (environments, devices, healthy/degraded/offline/
  unknown counts), short deterministic message.
- `EnvironmentEngine::readiness()` — pure projection: catalogue totals
  aggregate over every record; lifecycle and message derive from active
  env status (Healthy→Ready, Degraded→Degraded, Offline→Offline,
  Unknown→Incomplete; None→Incomplete with explicit message).

### Rust — command surface
- `commands::environment::get_environment_readiness` (typed Tauri
  command) wraps `engine.readiness()`.
- Registered in `lib.rs` invoke handler. Stage label `V1D` → `V1E`.

### TypeScript — typed API + surface
- `src/types/environment.ts` — adds `EnvironmentLifecycleState` and
  `EnvironmentReadiness` mirrors.
- `src/api/environment.ts` — `getEnvironmentReadiness()`.
- `src/components/HomeEnvironmentCentre.tsx` — fetches readiness on
  mount alongside list + active, re-fetches after a successful
  `setActiveEnvironment`, renders a compact `readiness-band` between
  header and body.
- `src/components/HomeEnvironmentCentre.css` — new `.readiness-band`
  rules: 2-column grid (status + message left, 6-cell metrics right),
  left-border state colour, monospace tabular numbers, hairline
  borders. Dense, industrial, no card chrome.

## Tests (Rust)

`cargo test --lib` — 15 / 15 passing. New cases:

- `readiness_for_default_active_environment_is_ready`
- `readiness_updates_after_active_environment_changes` (Healthy →
  Degraded → Unknown/Incomplete transitions)
- `readiness_counts_remain_deterministic_across_calls` (catalogue-wide
  counts don't drift with active selection)
- `stale_persistence_hydrates_fallback_and_readiness_follows_fallback`

V1C / V1D invariants kept (11 prior tests still pass).

## Validation

- `cargo check` — green.
- `cargo test --lib` — 15/15 green.
- `pnpm typecheck` — green.
- `pnpm build` — green (151.74 kB JS, 7.72 kB CSS, 277 ms).
- `tools/ops-readiness.ps1` — **READY** (13/13).

## Out of scope (kept for later)

- Real inventory / discovery / monitoring (catalogue still static demo).
- Auth / RBAC / Audit Engine wiring.
- ASSESS top-bar surface (still deferred).
- Topology, deeper mode bodies, visual redesign.

## Notes for future agents

- Readiness is a **pure projection** over engine-owned state. Same rule
  applies to every later engine: expose deterministic snapshots via a
  typed command, never derive them in React.
- Lifecycle mapping is intentionally tight (4 states). New states
  require updating both Rust enum and TS mirror.
- Re-fetch readiness whenever Rust state changes (selection switch,
  future inventory mutations). The component owns the orchestration of
  these refetches; the engine stays passive.
