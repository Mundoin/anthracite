# Discovery Engine Boundary

The Discovery Engine owns the future device inventory boundary. It is a connected-but-empty
spine in V1AF, deterministic, producing only typed evidence. No I/O, no vendor polling,
no topology logic.

---

## Why this document exists

The Environment, Discovery, INTAKE, and Topology engines have a layered contract.
This document defines the ownership boundary between them, the semantics of
Discovery's output state, and the planned stages of device-backed inventory evolution.

---

## Ownership table

**Discovery owns:**
- Device inventory records (deterministic storage and retrieval; no fetch/poll yet)
- Discovery run metadata (status, timestamps, scope evidence)
- Typed evidence snapshots (never freeform text)
- Device model references as inventory record wrapper

**Discovery does NOT own:**
- Devices themselves (INTAKE produces DeviceModel; Discovery wraps and stores only)
- Topology adjacency (Topology Engine owns graph; Discovery supplies input facts)
- Vendor capability model (Vendor Model Engine owns; Discovery references only)
- Live state or snapshots (Monitoring / Polling Engine owns; Discovery records received facts)
- Environment definitions or active selection (Environment Engine owns)

**Environment Engine owns (unchanged):**
- Environment definitions
- Active environment selection
- Environment-scoped configuration

**INTAKE owns (existing, unchanged):**
- Parser surface (config input, line parsing)
- DeviceModel construction from config evidence (parser-side)
- Receipt generation (validation findings from a single config)
- Batch run coordination (multiple configs, one result per config)

**Topology Engine owns (future):**
- Graph construction from Discovery/DeviceModel-backed inventory
- Graph rendering directives (never sent to Babylon)
- Information topology vs live topology semantics

---

## DataSourceState semantics (frontend)

From `HIERARCHY_HONESTY_CONTRACT.md`:

- `"demo"` — placeholder data, not from a live source. User-facing disclosure in place.
- `"empty"` — live source connected, zero records. No placeholder, no error.
- `"unavailable"` — capability missing (e.g., vendor model not populated).
- `"not_connected"` — source engine not wired or connection failed. Placeholder surface only.

**Discovery's posture in V1AF:**
- Discovery returns `source_state = "empty"` deterministically in `inventory_view()`.
- No network I/O, no vendor polling, no topology parsing.
- No fake device seeding. Initial state is empty, not demo.
- `DataSourceState` frontend type is unchanged; Discovery never extends it.
- Frontend block is seeded `demo`; when populated with real inventory, it will flip to `empty` or `unavailable` as appropriate.

---

## V1AF status: connected-but-empty spine

**Implementation:**
- Rust module: `src-tauri/src/engines/discovery.rs`
- Method: `inventory_view(environment_id: Option<&str>) -> DiscoveryInventoryView`
- Returns: `{ source_state: "empty", records: [], message: "discovery inventory empty — no records collected" }`
- Tauri command: `get_discovery_inventory(environment_id?: string)`
- TS mirror: `src/types/discovery.ts` and `src/api/discovery.ts` (parallel write)

**Deterministic contract:**
- No I/O, no side effects, no randomness.
- Given the same environment ID (or None), always returns the same typed view.
- Command boundary is typed; no string interpolation or loose JSON.

**No future gates on V1AF:**
- No device seeding (demo or otherwise).
- No DeviceModel field on record yet (wrapper only, fields reserved).
- No `runDiscovery` / `latestFacts` / `evidence` surface (future).

---

## Future stages: inventory evolution plan

**Phase 1: INTAKE import (future).**
- Config batch run produces array of DeviceModel.
- Manual import surface allows operator to save run → Discovery as inventory records.
- Each record wraps a DeviceModel; Discovery stores deterministically.
- `source_state` stays `"empty"` until first import.

**Phase 2: Live discovery polling (future).**
- Discovery owns polling schedule and interval management.
- Typed discovery rules per vendor (vendor-agnostic rule syntax, vendor-specific implementations).
- Polling produces new facts, appended to run (immutable past facts, latest run head).
- `source_state` transitions to `"empty"` ↔ `"unavailable"` based on poll success.

**Phase 3: Manual inventory curation (future).**
- Operator surface to add, edit, delete inventory records directly.
- All edits produce an audit trail tied to Operator identity.
- Discovery remains the source of truth; all inventory writes route through it.

---

## V1AG — Frontend Wiring

**Frontend adapter (`src/data/discoverySource.ts`):**

New module exports `toDiscoverySourceView(view?: DiscoveryInventoryView, error?: Error): DiscoverySourceView`:

```typescript
type DiscoverySourceView = {
  sourceState: DataSourceState;  // "empty" | "unavailable" | "not_connected"
  environmentId?: string;
  totalRecords: number;
  message: string;
  isEmpty: boolean;
}
```

Mapping rules:

| Input | Output sourceState | Behavior |
|-------|-----|----------|
| `view` with `source_state = "empty"` | `"empty"` | Pass through; `isEmpty = true`, `totalRecords = 0` |
| `view` with any DiscoverySourceState | `"empty"` \| `"unavailable"` | Pass through; `isEmpty` per records array |
| `view = null, error = null` | `"not_connected"` | Engine not wired; no surface in OpsConsoleMode yet |
| `view = null, error != null` | `"unavailable"` | Fetch failed; surface error message |

**Discovery never returns `"demo"`.** The adapter never synthesizes demo data.

**App-side fetch policy:**

- `src/App.tsx` calls `getDiscoveryInventory(activeEnvironmentId)` once per active-environment selection change.
- No polling. No timers. One-shot fetch on selection change only.
- Result passed into `OpsConsoleMode` as `discoverySourceView` prop.
- Fetch failure (null view + error) surfaces as `sourceState = "unavailable"` in Ops Console; no silent degradation to demo.

**Ops Console surface (`src/modes/opsConsole/OpsConsoleMode.tsx`):**

- New "Discovery Inventory" read-only section renders `DiscoverySourceView`.
- Displays: `<DataSourceTag state={view.sourceState} />`, scope (environment ID), state label, record count (0 in V1AG), and engine's stable message.
- Real engine state, not static `MODE_STATUS` values. Hierarchy aggregate (`sourceState = "demo"`) remains untouched.
- Tests cover all three mapping cases (empty, unavailable, not_connected).

**Hierarchy contract unchanged in V1AG:**

Discovery surfaces only through Ops Console in V1AG. Adding a `discoveryInventory` key to `HierarchyView.sourceStateByBlock` would create a rendered block with no visual surface (not rendered in any mode body yet). Per the v1AG prompt decision rule, document-skip is cleaner: hierarchy aggregate `sourceState` stays `"demo"`, and Inspector identity real-promotion (from V1AE) remains the only hierarchy boundary flip in V1AG. Hierarchy block entries (`D1`–`D8`) remain seeded demo, waiting for future mode bodies (Topology, Monitor, Operate) to wire their own inventory surfaces. Discovery's ownership boundary is intact; the frontend integration is partial and will deepen once mode bodies land.

**DataSourceState contract:**

- No new `DataSourceState` variants in V1AG. The type remains: `"demo"` | `"empty"` | `"unavailable"` | `"not_connected"`.
- No DeviceModel field added to Discovery's inventory record struct. No fake device seeding. No SSH/SNMP/polling changes.
- Frontend receives typed `DiscoverySourceView` mapped cleanly from the engine's response. State transitions are honest and deterministic.

---

## Cross-links

- `ENGINE_AND_API_BOUNDARIES.md` — Discovery section (V1AF status appended)
- `HIERARCHY_HONESTY_CONTRACT.md` — DataSourceState definitions and block promotion rules
- `src-tauri/src/engines/discovery.rs` — Rust implementation
- `src/types/discovery.ts` — TypeScript type mirror (parallel)
- `src/api/discovery.ts` — Tauri command binding (parallel)
- `INTAKE_PARSER_CONTRACT.md` — DeviceModel spec (when written)
- `src/data/discoverySource.ts` — Frontend adapter (V1AG)
