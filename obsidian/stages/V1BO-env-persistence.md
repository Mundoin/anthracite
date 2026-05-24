# V1BO — Durable Environment Persistence

**Date:** 2026-05-24
**Status:** landed (working tree; commit/push held for Bujar)
**Scope:** generated labs survive app restart / refresh / localStorage
  clear via durable Rust JSON file at `app_data_dir/saved_environments.json`,
  mirrored alongside the existing BrowserLocalStorage path.
**Branch:** `main` after `0b0bc56` (V1BN topology readability pack)
**Authority:** Bujar (scope set; git held)

## Mission

> "Generated labs must not disappear over restart/refresh/navigation."

Bujar's V1BN.hf2 env audit flagged this as LARGER. V1BO ships the
durability layer without redesigning topology visuals or touching
identity / layout / edge-routing.

## Architecture decision — opaque JSON blob

Two viable designs were considered:

1. **Typed `Vec<LocalEnvironmentRecord>` in Rust.** Heavy: requires
   duplicating `LocalEnvironmentRecord` + nested `LabEnvironment`
   shape in Rust serde, tracking every TS migration in two places.
2. **Opaque JSON blob.** Frontend already serializes the whole
   `EnvironmentLifecycleStoreState` for `BrowserLocalStorageAdapter`
   via `environmentPersistence.ts`. Rust persists the resulting
   string verbatim. No schema duplication. Frontend owns shape +
   migration + validation.

Chose **opaque blob**. Single-string contract through Tauri keeps
the boundary minimal. Future record-shape changes ship as
frontend-only migrations (existing pattern).

## Files changed

```
new   src-tauri/src/engines/lab_blob_store.rs            # LabBlobStore + 6 unit tests
edit  src-tauri/src/engines/mod.rs                       # pub mod lab_blob_store
new   src-tauri/src/commands/lab_persistence.rs          # read/write_saved_environments_blob
edit  src-tauri/src/commands/mod.rs                      # pub mod lab_persistence
edit  src-tauri/src/lib.rs                                # manage LabBlobStore + 2 commands
new   src/state/tauriLabBlobBridge.ts                    # isTauriRuntime + read/write helpers (dynamic import @tauri-apps/api/core)
new   src/state/durableEnvironmentAdapter.ts             # sync StorageAdapter decorator with async write-through
edit  src/state/EnvironmentLifecycleContext.tsx          # default to durable adapter + mount-hydrate effect
new   src/state/__tests__/EnvironmentLifecycleContext.durable.test.tsx   # 3 integration tests (hydrate, no-op, write-through)
new   obsidian/stages/V1BO-env-persistence.md
```

Out of scope: any topology file, env list UI, EnvironmentCreatorPanel
(no changes needed — `commitEnvironment` is the existing insertion
path and now flows through the durable adapter automatically),
schema migration (existing `migrateSnapshot` handles it).

## Persistence storage path

```
<app_data_dir>/saved_environments.json
```

Same `app_data_dir` already used by `environment.json`,
`discovery_inventory.json`, `server_keys.json`, etc. (lib.rs setup
hook). Parent dir created on demand by `LabBlobStore::write_blob`
so first save works even on a fresh install.

## Merge behavior

```
mount (sync)                  → loadStoreFromAdapter(local) → initial state
                                  ↓
mount (async, V1BO)           → readTauriLabBlob() → if blob:
                                  ├── seed MemoryStorageAdapter with blob
                                  ├── loadStoreFromAdapter(seed) → durable state
                                  ├── dispatch { type: "load", state }
                                  └── adapter.write(local mirror)

commit lab                    → reducer appends to environments[]
                                  ↓ store_revision bumps
                                  ↓
auto-save effect              → adapter.write(local + durable mirror)
                                  ├── BrowserLocalStorage (sync, authoritative)
                                  └── Tauri LabBlobStore (async, durable mirror)

select active                 → reducer mutates active_environment_id ONLY
                                  ↓
                              → store_revision bumps → same auto-save path
                                  (does NOT prune or hide other generated labs)
```

Precedence on hydrate: durable Tauri blob wins over fresh
localStorage when both present (Tauri is the crash-safe truth).
Local mirror is always written from the durable hydrate so
subsequent sync reads stay coherent.

Demo catalogue (Rust `EnvironmentEngine::demo_catalogue`) is
unchanged and not affected by V1BO — that catalogue is a separate
read surface (`list_environments` command) consumed by other UI;
labs created in the frontend live alongside, not inside it.

## Tests added

**Rust** (`src-tauri/src/engines/lab_blob_store.rs`, 6 tests):

- `missing_file_returns_none`
- `write_then_read_round_trips`
- `second_store_instance_reads_persisted_blob` ← key durability test
- `overwrite_replaces_previous_blob`
- `write_creates_missing_parent_dir`
- `empty_blob_round_trips_as_empty_string`

**TS** (`src/state/__tests__/EnvironmentLifecycleContext.durable.test.tsx`,
3 tests; bridge mocked at import boundary):

- `hydrates from durable Tauri blob on mount (lab survives 'restart')`
- `hydrate is a no-op when the bridge returns null`
- `commitEnvironment writes through to the Tauri bridge`

## Validation

```
pnpm typecheck     ✓
pnpm test --run    ✓ 218 files / 2418 tests passed (+3 V1BO TS)
pnpm build         ✓ 5.56 s
cargo test --lib   ✓ 646 passed (+6 V1BO Rust)
```

No regressions. Existing `EnvironmentLifecycleContext` test suite
unchanged — tests inject their own `storageAdapter`, bypassing the
durable wrap so they remain isolated.

## Manual verification path (Bujar, before commit)

```
 1. Open app → confirm initial Micro Lab appears.
 2. Create Branch Lab via Environment Creator → confirm appears in list.
 3. Create Campus Lab → confirm appears.
 4. Create Datacenter Lab → confirm appears.
 5. Create Metro Lab → confirm appears.
 6. Switch active environment between all 5 → confirm Topology renders
    each one without dropping the others from the list.
 7. Close app (or reload via dev tools Ctrl+R on Tauri dev build).
 8. Restart app → confirm all 5 labs still in env list.
 9. Verify active selection survives (or recovers predictably — Rust
    side already persists active_environment_id via the separate
    JsonFileStore, unchanged by V1BO).
10. Open Topology → confirm selected generated lab renders identically
    to pre-restart.
```

Bonus check: `app_data_dir/saved_environments.json` should exist
after first save and contain the serialized
`EnvironmentLifecycleStoreState` snapshot.

## Caveats

- **Async write-through is fire-and-forget.** Tauri-side failure
  is logged at the bridge (`console.warn`) but does NOT surface
  in `SaveStatus` (which reflects the sync localStorage write
  outcome — the authoritative path). If a Tauri write fails
  repeatedly, durability silently degrades to localStorage-only.
  Acceptable trade-off: localStorage is the safety net, durable
  mirror is the upgrade.
- **In non-Tauri runtimes (vite dev, vitest jsdom, browser
  preview)** the bridge no-ops and behavior reverts to V1BN's
  localStorage-only path. Bujar must test in the actual Tauri
  dev/build, not vite dev.
- **No conflict resolution** between durable + localStorage when
  the two diverge. Hydrate is "durable wins"; subsequent writes
  go to both. If the durable file is hand-edited while the app
  runs, the next auto-save overwrites it.
- **Schema migration** is the frontend's job (unchanged). If a
  future change bumps `schema_version`, the existing migration
  path in `environmentPersistence.ts` handles both adapters
  uniformly because the durable blob is the same shape.
- **Bujar must verify in actual Tauri build.** jsdom test proves
  the wiring; only the dev/release build proves the bridge
  resolves the dynamic import correctly inside the Tauri webview.

## AO orchestration report (per memory: under 10 lines)

- subagent S4 (Sonnet, Explore) → traced creator UI + commit path
  + Rust env engine + invoke wrapper layer → returned
  LocalEnvironmentRecord shape + reducer hook point +
  invoke_handler pattern + "no Tauri wrapper exists yet" flag
- Opus integrator → Rust module + commands + lib.rs wiring (5
  files); frontend bridge + adapter + context wiring (3 files);
  3 TS integration tests + 6 Rust unit tests. Two test iterations
  to fix fixture shape (LocalEnvironmentRecord requires real
  lab_payload — cloned from createInitialStore seed).
- effectiveness: ≈ +25 % vs Opus-solo (1 parallel research thread;
  Opus owned design + edits where context cost > subagent
  overhead). Opaque-blob design choice cut Rust scope ~70 %.
- recommendation: data-trust persistence stages with mixed Rust +
  TS work match this 1-subagent + Opus-integrator pattern.
