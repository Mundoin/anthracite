# V1D — Environment Selection Persistence

- **Date:** 2026-05-15
- **Status:** Complete
- **Obeys:** `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` §4 (deterministic-only), §6
  (engine/API first), §11 (non-negotiables — Rust owns truth).
  `ENGINE_AND_API_BOUNDARIES.md` — Environment Engine row, test requirement
  *"cold-start reads the last active environment deterministically"*.
  `BUILD_SEQUENCE.md` — Environment Engine persistence step.

## Goal

Make the Environment Centre remember the selected environment across app
restarts. Rust Environment Engine remains authoritative; React displays
state and asks Rust to change it. No new surfaces, no new modes, no new
vendor or inventory work.

## What landed

### Rust — `EnvironmentStore` boundary
- `EnvironmentStore` trait (`load` / `save`) + `EnvironmentState`
  on-disk shape (`{ "active_environment_id": "..." }`).
- `NullStore` — no-op, used by `EnvironmentEngine::new()` and tests that
  do not care about persistence.
- `JsonFileStore` — JSON file persistence with parent-directory creation,
  malformed-file tolerance (treated as "no saved id").

### Rust — Engine hydration + write-through
- `EnvironmentEngine::with_store(Arc<dyn EnvironmentStore>)` hydrates the
  active selection from the store at construction.
- Fallback rules (deterministic):
  1. Saved id present and in catalogue → use it.
  2. Saved id missing, unreadable, or stale → first environment in
     catalogue (`env-core-eu1`).
- `set_active`: validate id is in the catalogue, persist through the
  store, then update in-memory state. If persistence fails, in-memory
  state is left unchanged.

### Rust — Tauri wiring
- `lib.rs` boots through `.setup(|app| ...)`. Resolves
  `app.path().app_data_dir()`, creates it best-effort, constructs
  `JsonFileStore` at `<app_data_dir>/environment.json`, then
  `app.manage(EnvironmentEngine::with_store(...))`.
- Stage label in `ping` Pong bumped `V1C` → `V1D`.
- Commands (`list_environments`, `get_active_environment`,
  `set_active_environment`) unchanged at the boundary — persistence is
  invisible to TS, which is the point.

### TypeScript — no API change required
- `src/api/environment.ts` and `src/components/HomeEnvironmentCentre.tsx`
  already call `getActiveEnvironment()` on mount. Now that call returns
  whatever Rust hydrated from disk, so the persisted selection lights up
  automatically. No TS changes needed beyond confirming the existing
  load path is sufficient.

## Tests (Rust)

`cargo test --lib` — 11 / 11 passing. New cases:

- `hydrate_falls_back_to_first_when_no_saved_id`
- `hydrate_uses_valid_saved_id`
- `hydrate_stale_saved_id_falls_back_to_first`
- `set_active_persists_valid_id_through_store`
- `invalid_set_active_does_not_persist_or_mutate_state`
- `json_file_store_round_trips_through_engine` (file-backed: clean boot
  → set → reboot → hydrated; corrupt file → fallback)

V1C invariants kept (`list_is_deterministic`, default active, set-active
success / error, network-scope totals).

## Persistence shape

Path: `<app_data_dir>/environment.json` (Tauri-resolved, Windows-first
target is `%APPDATA%\com.anthracite.app\environment.json` or similar
identifier-based path).

Shape (pretty-printed):

```json
{
  "active_environment_id": "env-lab-zrh"
}
```

Forward-compat: `EnvironmentState` uses `Option<String>` and serde
defaults so missing fields don't break loads. Future fields can be added
without invalidating older files.

## Validation

- `cargo check` — green.
- `cargo test --lib` — 11/11 green.
- `pnpm typecheck` — green.
- `pnpm build` — green (150.04 kB JS, 6.25 kB CSS).
- `tools/ops-readiness.ps1` — **READY** (13/13 gates).

## Out of scope (kept for later)

- AAA / RBAC / Audit Engine wiring.
- Inventory, discovery, monitoring, topology.
- Real environment catalogue (still the V1C demo set).
- Visual redesign, ASSESS top-bar surface.
- Babylon-based topology rendering.

## Notes for future agents

- Persistence boundary is **per engine**. When the next engine needs
  state, mirror this trait shape (`load`/`save` over a small typed
  document) — do not introduce a shared "settings" engine.
- File store tolerates malformed JSON by falling back. If a future
  schema migration is needed, version the document (`schema_version`
  field) and read it explicitly before deserialising.
- Rust is authoritative. TS never reads or writes the JSON file
  directly. Anything that wants persisted environment state goes through
  the typed commands.
