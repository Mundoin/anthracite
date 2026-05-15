# V1C — Environment Centre Spine

- **Date:** 2026-05-15
- **Status:** Complete
- **Obeys:** `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` §5 (HOME front door, mode set), §6 (engine/API first), §10 (visual law). `BUILD_SEQUENCE.md` layers 2 (app shell + environment context), 5 (API bridge pattern). `ENGINE_AND_API_BOUNDARIES.md` — Environment Engine row.

## Goal

Build the first product spine: a deterministic Environment Engine in Rust,
a typed Tauri command surface, and a HOME / Environment Command Centre
React surface that consumes them. Smallest viable, real, reusable.

## What landed

### Rust — Environment Engine
- `src-tauri/src/engines/mod.rs`, `src-tauri/src/engines/environment.rs`
- `EnvironmentEngine` owns the operator's environment catalogue and the
  active selection. Static demo catalogue of four environments for V1C.
- Public surface: `list()`, `active()`, `set_active(id)`.
- Five unit tests pin determinism, default active, set-active success,
  set-active error path, and total device-count stability.

### Rust — Typed command surface
- `src-tauri/src/commands/mod.rs`, `src-tauri/src/commands/environment.rs`
- Commands: `list_environments`, `get_active_environment`,
  `set_active_environment`.
- Wired in `src-tauri/src/lib.rs` via `.manage(EnvironmentEngine::new())`
  and `tauri::generate_handler![..]`.
- Legacy `ping` retained as bridge sanity check; stage label updated to
  V1C.

### TypeScript — typed API + HOME surface
- `src/types/environment.ts` — typed mirror of the Rust record + status
  enum.
- `src/api/environment.ts` — `invoke<T>` wrappers, one per command. No
  fire-and-forget; all returns are awaited and typed.
- `src/components/HomeCommandCentre.tsx` — HOME surface. Loads env list +
  active selection on mount, switches via `set_active_environment`,
  surfaces typed errors. No domain logic; everything goes through the
  Environment API.
- `src/components/HomeCommandCentre.css` — industrial dense styling.
  Hairline borders, monospace IDs/numbers, signal-grade status colours,
  copper eyebrow accent, no drop-shadow cards.
- `src/App.tsx` updated: stage label V1C, center panel hosts
  `HomeCommandCentre`. Babylon canvas removed from the front door (its
  module file is retained for a later topology stage).

## Visual law check

- Dense rows, hairline borders, monospace IDs/numbers, signal-grade
  status pills, copper eyebrow.
- No drop-shadow cards, no marketing whitespace, no centered hero block.
- Mode rail entries render as a stacked tool-grade list with PENDING
  state badges, not promotional tiles.
- Screenshot review still pending Bujar's manual capture.

## Out of scope (kept for later)

- Auth / RBAC / Audit Engine wiring.
- Inventory, discovery, monitoring, topology.
- Persistence — catalogue is static in V1C.
- Mode bodies for BUILD / OPERATE / DIAGNOSE / INTELLIGENCE / FORGE /
  ASSESS.
- Babylon-based topology rendering.

## Notes for future agents

- HOME is the front door. Topology never becomes the landing surface.
- Modes added to `MODES` in `HomeCommandCentre.tsx` must already exist in
  `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` §5.
- New commands live next to their engine module under
  `src-tauri/src/commands/<engine>.rs`, wired through `lib.rs`.
- TS types are mirrors. Rust is authoritative.
