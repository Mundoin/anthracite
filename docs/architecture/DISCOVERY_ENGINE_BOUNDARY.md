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

## V1AH — INTAKE → Discovery Import Preview

**Goal:** First real pipe from INTAKE BatchRun to Discovery — preview only, no mutation.

**Pipe overview:**

```
BatchRun (in-memory, includes DeviceModel per device)
  ↓
buildDiscoveryImportCandidates(batchRun, environmentId)
  ↓ [TS adapter: deterministic, pure]
DiscoveryImportCandidate[]
  ↓
previewDiscoveryImport(environment_id, candidates)
  ↓ [Rust command: deterministic, non-mutating]
DiscoveryImportPreview
  ├── accepted_records: DiscoveryImportPreviewRecord[]
  ├── rejections: DiscoveryImportRejection[]
  └── summary: DiscoveryImportSummary
```

**Why live BatchRun, not BatchRunExport?**

`BatchRunExport` intentionally omits `DeviceModel` — it is a portable JSON snapshot for archival and sharing. The import preview **requires** the in-memory `BatchRunDevice.device_model` to evaluate candidates and build the canonical model that will be stored. Source of truth for the pipe is the live BatchRun state, not the export.

**Preview-only contract:**

- `preview_discovery_import(environment_id, candidates)` is deterministic and non-mutating.
- No records are written to Discovery inventory.
- `inventory_view()` returns empty before AND after preview calls.
- Preview command may be called repeatedly on the same candidates; output is stable.
- Preview result is local to INTAKE; no cross-mode state sharing (INTAKE → OpsConsole) in V1AH.

**Rejection-reason enum (closed):**

| Reason | Meaning |
|--------|---------|
| `missing_identity` | Candidate lacks a hostname or identity key; cannot derive record ID |
| `environment_mismatch` | Candidate's target environment does not exist or is unavailable |
| `duplicate_record_id` | Record ID already exists in Discovery inventory; first-wins, later candidates rejected |

First rejection wins; subsequent candidates with the same ID are rejected on the `duplicate_record_id` reason.

**Record-id derivation (deterministic, namespaced):**

Format: `discovery::<sanitized-env-id>::<sanitized-hostname-or-candidate-id>`

Sanitization rule: lowercase ASCII; replace non-`[a-z0-9-]` with `-` (collapsed; `---` → `-`).

Example:
- Environment: `PROD-HQ` → `prod-hq`
- Hostname: `core-1a.dc01` → `core-1a-dc01`
- Full ID: `discovery::prod-hq::core-1a-dc01`

**DeviceModel carry-through:**

- DeviceModel is the canonical model for device representation in Anthracite V1.
- Discovery does **not** maintain a parallel DeviceModel fork.
- The model is constructed by INTAKE's parser; Discovery stores records that **reference** the model unchanged.
- DeviceModel schema is not extended in V1AH.
- No DeviceModel field is added to Discovery's inventory record struct.

**INTAKE surface (RunSummaryStrip affordance):**

- "Preview Discovery Import" action appears in the existing actions row, **only when:**
  - BatchRun is `complete` or `complete_with_failures`
  - Active environment ID is provided
  - At least one importable device exists in the run
- Result line: `"X accepted · Y rejected"`
- Wording is strictly "Preview" — never "Imported" or "Inventory updated"
- Preview result stays local to INTAKE; no sync to Ops Console in V1AH

**Future stages:**

- **V1AI (or later):** Persistence — actual import command that **mutates** `inventory_view()` and stores records deterministically.
- **Future Topology:** Consumes **persisted** Discovery records (not INTAKE receipts directly) as input facts for graph construction.
- **Future OpsConsole:** May display cross-mode preview result, pending Bujar decision.

**Rust additions:**

- `src-tauri/src/engines/discovery.rs`:
  - `DiscoveryImportCandidate` struct (hostname, environment_id, device_model)
  - `DiscoveryImportRejectionReason` enum (missing_identity, environment_mismatch, duplicate_record_id)
  - `DiscoveryImportRejection` struct (candidate_id, reason)
  - `DiscoveryImportPreviewRecord` struct (record_id, device_model)
  - `DiscoveryImportSummary` struct (total_candidates, accepted_count, rejected_count)
  - `DiscoveryImportPreview` struct (accepted_records, rejections, summary)
  - Engine method: `preview_import(environment_id, candidates) → DiscoveryImportPreview`
- `src-tauri/src/commands/discovery.rs`:
  - `preview_discovery_import(environment_id, candidates) → DiscoveryImportPreview` command

**TypeScript types and API:**

- `src/types/discovery.ts` — mirrors all 5 new wire shapes (Candidate, RejectionReason, Rejection, PreviewRecord, ImportPreview, Summary)
- `src/api/discovery.ts` — `previewDiscoveryImport(environmentId, candidates)` wrapper

**Frontend builder:**

- `src/data/discoveryImport.ts` exports `buildDiscoveryImportCandidates(batchRun, environmentId): DiscoveryImportCandidate[]` (pure adapter, deterministic)
- Tests at `src/data/__tests__/discoveryImport.test.ts`

---

## Cross-links

- `ENGINE_AND_API_BOUNDARIES.md` — Discovery section (V1AF status; V1AH `preview_discovery_import` appended)
- `HIERARCHY_HONESTY_CONTRACT.md` — DataSourceState definitions and block promotion rules
- `src-tauri/src/engines/discovery.rs` — Rust implementation (V1AF + V1AH)
- `src-tauri/src/commands/discovery.rs` — Tauri command bindings (V1AF + V1AH)
- `src/types/discovery.ts` — TypeScript type mirror (parallel)
- `src/api/discovery.ts` — Tauri command binding (parallel)
- `src/data/discoverySource.ts` — Frontend adapter (V1AG)
- `src/data/discoveryImport.ts` — Candidate builder (V1AH)
- `obsidian/stages/V1AH-intake-to-discovery-import-preview.md` — stage note
