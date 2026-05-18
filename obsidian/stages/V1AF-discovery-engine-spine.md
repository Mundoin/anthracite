# V1AF — Discovery Engine Spine

**Arc:** NEW STAGE — opens discovery / inventory / topology work (pre-arc)
**Date:** 2026-05-18
**Status:** complete

---

## Objective

Implement Discovery Engine as a connected-but-empty spine. The engine owns the
future device inventory boundary and defines the contract between INTAKE
(device-model production), Discovery (storage/retrieval), and Topology (graph
construction). No I/O, no vendor polling, no topology logic yet.

---

## Scope in

**New files:**
- `src-tauri/src/engines/discovery.rs` — `DiscoveryEngine` with `inventory_view()` method
- `src/types/discovery.ts` — `DiscoveryInventoryView`, `DiscoverySourceState` types
- `src/api/discovery.ts` — `get_discovery_inventory(environment_id?: string)` Tauri binding
- `docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md` — ownership boundary, DataSourceState semantics, phases
- `obsidian/stages/V1AF-discovery-engine-spine.md` — this note

**Edited files:**
- `src-tauri/src/engines/mod.rs` — discovery module wired into engine roster
- `src-tauri/src-tauri/lib.rs` — `get_discovery_inventory` command registered
- `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` — V1AF status block appended to Discovery section
- `obsidian/ANTHRACITE_INDEX.md` — V1AF row added to stage map

---

## Scope out

- No device seeding (demo or otherwise).
- No INTAKE changes. No parser changes. DeviceModel structure unchanged.
- No Topology Engine wiring. No topology mode body.
- No `ModeRail` changes. No mode body built. No `DataSourceState` frontend changes.
- `DataSourceState` type unchanged. Discovery never extends it.
- No live polling, no SSH/SNMP, no vendor discovery rules yet.
- No `runDiscovery`, `latestFacts`, `evidence` surface (future).

---

## Design decisions

**Connected-but-empty, not demo.** Initial `source_state = "empty"` (zero records, live
source, no placeholder). This is semantically different from `"demo"` (fake seed data,
user disclosure required). Discovery's posture is: "inventory is real but currently has
zero records."

**Engine-local `DiscoverySourceState` narrower than frontend `DataSourceState`.**
The Rust engine returns `DiscoverySourceState` ("empty" only in V1AF). The frontend
`DataSourceState` has four values: demo, empty, unavailable, not_connected. Discovery
will map to "empty" / "unavailable" in future; `not_connected` is for unbuilt modes
and skipped capability gates.

**DeviceModel wrapper record, not unwrapped.** Discovery inventory records are
`{ deviceModel: DeviceModel, discovered_at: timestamp, source: "intake"|"polling"|"manual", ... }`.
The record wraps a DeviceModel reference but does not fork the model. INTAKE produces
DeviceModel; Discovery stores deterministically.

**No DeviceModel field on record yet in V1AF.** The wrapper struct reserves space;
the Rust implementation is a skeleton only. V1AF proves the boundaries. Phase 1
(INTAKE import) adds the actual DeviceModel field and import surface.

**Deterministic boundary with Environment.** `inventory_view(environment_id?)` accepts
optional environment scoping. With Some(id), records filtered to that environment.
With None, all records. Filtered result is deterministic; same ID always returns
same records.

---

## Tauri command contract

```
get_discovery_inventory(environment_id?: string) → DiscoveryInventoryView
```

**Response shape:**
```typescript
{
  source_state: "empty",
  records: [],
  message: "discovery inventory empty — no records collected"
}
```

**No parameters, no pagination, no filtering in V1AF.** Command is intentionally
minimal. Filtering by environment happens engine-side. Future phases add
`filter` / `pagination` parameters.

---

## ENGINE_AND_API_BOUNDARIES.md — Discovery update

V1AF status block appended to the Discovery Engine section:
- Implementation confirmed (Rust + TS)
- Command defined (`get_discovery_inventory`)
- Returns deterministic empty view
- No discovery I/O yet; `runDiscovery` / `latestFacts` / `evidence` surface future
- Link to `DISCOVERY_ENGINE_BOUNDARY.md`

---

## HIERARCHY_HONESTY_CONTRACT.md — unchanged

Discovery engine landing does NOT flip any hierarchy blocks in V1AF.
Frontend remains seeded demo. Mode bodies (topology, operate) are future.
No `DataSourceState` changes.

---

## Halt conditions — status

- DF1 `inventory_view()` returns deterministic empty view ✓
- DF2 No device seeding ✓
- DF3 `DiscoverySourceState` defined (Rust enum, narrower than `DataSourceState`) ✓
- DF4 Tauri command registered and callable ✓
- DF5 TS types mirror Rust types ✓
- DF6 DeviceModel wrapper struct shape defined (fields reserved, not used yet) ✓
- DF7 Environment scoping contract in place ✓
- DF8 `cargo check` green in `src-tauri/` ✓
- DF9 `pnpm typecheck` green ✓
- DF10 `DISCOVERY_ENGINE_BOUNDARY.md` links all relevant files ✓
- DF11 No DataSourceState type extension ✓
- DF12 No demo seeding ✓

---

## Key learnings for next stage

- Discovery is the inventory owner. INTAKE produces models; Discovery stores them.
- Topology consumes Discovery records, not INTAKE receipts. Clear boundary.
- Environment scoping in V1AF is a placeholder; future phases refine filter depth.
- `source_state = "empty"` is honest about initial state. No fake data, no disclosure UI burden.
- Frontend hierarchy blocks remain seeded demo until a mode body ships. No early state transitions.
- DeviceModel wrapper is the contract point for future import/polling phases.

---

## Suggested commit message

```
stage-v1af: discovery engine spine — connected-but-empty inventory boundary
```
