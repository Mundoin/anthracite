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

## V1AI — Inventory Persistence + Authoritative Import

**Goal:** First persisted Discovery inventory pipe. Preview pipe becomes authoritative import command; records persist to JSON; App refreshes inventory on successful import.

**Pipe overview (extended from V1AH):**

```
BatchRun (in-memory)
  ↓
buildDiscoveryImportCandidates(batchRun, environmentId)
  ↓
previewDiscoveryImport(environment_id, candidates)  [V1AH: advisory, non-mutating]
  ↓ [Operator review on INTAKE RunSummaryStrip]
importDiscoveryRecords(environment_id, candidates)  [V1AI: authoritative, mutating]
  ↓ [Rust recomputes acceptance against current store state]
DiscoveryStore (JsonDiscoveryFileStore writes JSON)
  ↓
inventory_view() source_state = "real"  [now has N records]
  ↓ [App refresh callback chain]
App.tsx re-runs fetchDiscovery(activeEnvId)
  ↓
OpsConsoleMode renders new record count
```

**Persistence layer:**

- New trait: `DiscoveryStore` with `load()` and `save()` methods.
- Implementation: `NullDiscoveryStore` (V1AF/V1AH fallback) + `JsonDiscoveryFileStore` (runtime).
- File path: `<app_data_dir>/discovery_inventory.json`.
- Schema: `DiscoveryInventoryState { schema_version: 1, records: Vec<DiscoveryDeviceRecord> }`.
- Missing file → empty inventory loaded at boot.
- Corrupt JSON → empty inventory fallback (mirror Environment Engine pattern).

**Engine state upgrade:**

- `DiscoveryEngine` now holds `Mutex<Vec<DiscoveryDeviceRecord>>` + `Arc<dyn DiscoveryStore>`.
- Hydrates from store at boot (engine constructor).
- Wired in `src-tauri/src/lib.rs`: `DiscoveryEngine::with_store(Arc::new(JsonDiscoveryFileStore::new(data_dir.join("discovery_inventory.json"))))`.

**Extended record:**

- `DiscoveryDeviceRecord` gains 3 fields:
  - `device_model: DeviceModel` — canonical model carried by persisted record; no fork.
  - `source_label: Option<String>` — label for the source batch or run (e.g., "batch-2026-05-18").
  - `slice_id: Option<String>` — correlation ID across records from the same batch.

**Shared validation (new):**

- Factored: `validate_and_build_record(env_id, candidate, existing_ids, in_request_ids) → Result<DiscoveryDeviceRecord, DiscoveryImportRejection>`.
- Called by both `preview_import` (V1AH) and `import_records` (V1AI).
- Single source of truth for env-mismatch / missing-identity / duplicate-record-id rules.

**Preview behaviour update (V1AH→V1AI):**

- Preview now reads in-store record IDs as part of the duplicate check.
- Advisory honesty: operator sees what would import NOW, against current store state.
- Still non-mutating (test-guarded).

**Authoritative import command (V1AI):**

- Signature: `import_discovery_records(environment_id, candidates) → DiscoveryImportCommitResult`.
- Recomputes acceptance against current store state (import recomputes; frontend preview is purely advisory).
- Writes accepted records to in-memory inventory and calls `store.save()`.
- Returns `DiscoveryImportCommitResult` with:
  - `imported_records: Vec<DiscoveryDeviceRecord>` — newly persisted records.
  - `rejected: Vec<DiscoveryImportRejection>` — candidates that failed.
  - `summary: { total_candidates, imported_count, rejected_count, inventory_total_after }`.

**First-wins idempotency:**

- Second identical import returns `imported_count: 0, rejected_count: N`, all rejections with reason `duplicate_record_id`.
- Inventory unchanged; records already persisted.

**inventory_view behaviour:**

- Records empty → `source_state: "empty"`, message `"discovery inventory empty — no records collected"`.
- Records present → `source_state: "real"`, message `"discovery inventory has N record(s)"`.
- Scoped by `env_id` when provided (list only records matching environment); `None` returns all records.

**TS mirror (src/types/discovery.ts + src/api/discovery.ts):**

- `DiscoveryDeviceRecord` extends with 3 new fields.
- New types: `DiscoveryImportCommitSummary`, `DiscoveryImportCommitResult`.
- API wrapper: `importDiscoveryRecords(environmentId, candidates)` with camelCase invoke args.

**INTAKE surface (RunSummaryStrip):**

- "Import to Discovery" action shown ONLY after preview produced `accepted_count > 0` (or whenever importable candidates exist + env id present + run complete).
- Status line on success: `"Imported X · Rejected Y"`.
- Status line on duplicate-only re-import: `"Imported 0 · Rejected N"`.
- Wording strictly distinct from preview (`"Preview"` vs `"Import"`).
- Disabled while import is running.
- Hidden in viewer mode, without active env, or without importable candidates.

**App refresh chain:**

- `App.tsx` passes `onDiscoveryImported?: () => Promise<void>` callback into `IntakePanel`.
- After successful import, `IntakePanel` invokes callback.
- `App` re-runs `fetchDiscovery(activeEnvId)`.
- `discovery` state updates; Ops Console renders new record count when operator opens it.

**Ops Console:**

- No structural change. Adapter `toDiscoverySourceView` maps `"real"` source_state correctly via the same value-for-value mapping it already does.

**Out of scope in V1AI:**

- No update / overwrite / merge / delete semantics. First-wins on duplicate record id.
- No topology consumption (future stage).
- No polling / SSH / SNMP / live discovery.
- No BatchRunExport schema changes.
- No DataSourceState union changes.

---

## V1AK — Discovery Inventory Browser

**Goal:** First operator-facing read-only Discovery Inventory Browser surface. Honest consumption of persisted Discovery records with live source state and record detail.

**Surface placement:**

New component `src/modes/hierarchy/InventoryBrowser.tsx` (+ CSS + tests) renders inside Hierarchy mode when:
- `activeMode === "hierarchy"` AND
- `layoutView === "detail"` AND
- `detailSegment === "devices"`

Replaces only the existing `EnvironmentDetailD2` placeholder for the "devices" segment. Other detail segments (overview / sites / topology / configs / baselines / events / compliance / audit) keep seeded D2; no ModeRail/MODE_STATUS changes.

**Data consumption:**

- Reads from `App.tsx`'s existing `discovery` state (already hydrated on env change + after Discovery import via V1AG/V1AI/V1AJ refresh chain).
- Adapter `src/data/discoverySource.ts` extended with `view: DiscoveryInventoryView | null` field to carry raw records for detail rendering. Same pattern as V1AJ Topology adapter.
- Existing V1AG discoverySource tests continue passing (field-by-field assertions, not struct equality).

**DETAIL_SUBNAV count update:**

Static `"2,184"` devices count in DETAIL_SUBNAV updated to derive from live `discovery.sourceRecordCount` when `discovery.sourceState === "real"`, falling back to seeded `"2,184"` otherwise. Maintains honesty: real count when real, seeded when seeded.

**Browser behaviour (three states):**

1. **Unavailable:** `discovery.view === null` → "Discovery source is not available right now." message, no list.
2. **Empty:** `records.length === 0` → "No devices imported yet for this environment. Use INTAKE to parse configs and import them into Discovery." message, no list.
3. **Loaded:** records present → split-pane layout:
   - Header: title + `<DataSourceTag state={discovery.sourceState} />` + scope ("env-id" or "All environments")
   - Summary row: record count, total records, live message from engine
   - List pane: Hostname / Vendor / Platform / Source columns; selectable rows
   - Detail pane: dl/dt/dd format showing Record ID, Environment, Hostname, Chassis, Vendor, Platform, OS family, OS version, Source kind, Source label, Slice ID, Confidence (toFixed(2)), Last seen

**Selection and detail rendering:**

- Internal `useState<string | null>` for selected record ID, defaulting to first record.
- Snaps to first record on env switch or after refresh; snaps to `null` when records become empty.
- Missing per-record fields render as em-dash `—`. Never inferred, never invented.

**Honesty rules:**

- Uses existing `DataSourceState` / `DataSourceTag` discipline. No new state variants.
- Real values from Discovery records → rendered verbatim.
- Seeded hierarchy data outside the browser (D1 list view, other detail segments) stays demo with existing tags. No silent promotion.
- First-wins import semantics preserved. No add/edit/delete/merge in this stage.

**Strict scope-out:**

- No Rust changes (existing `get_discovery_inventory` used as-is).
- No DeviceModel schema changes.
- No parser, validator, config_detection, archive_intake, vendor_registry, BatchRunExport touches.
- No Topology engine / Topology mode body changes.
- No INTAKE, Assess, Settings, OpsConsole structural changes.
- No ModeRail / MODE_STATUS changes.
- No D1 (EnvironmentCentreD1) or hierarchy seeds changes.
- No mutation semantics (add/edit/delete/merge deferred).
- No graph viz, no virtualised list library, no new dependency.
- No DataSourceState union changes.
- No AGENTS.md / CLAUDE.md / parser-lab / `.codex/` touches.

---

## Cross-links

- `ENGINE_AND_API_BOUNDARIES.md` — Discovery section (V1AF status; V1AH + V1AI + V1AK additions)
- `HIERARCHY_HONESTY_CONTRACT.md` — DataSourceState definitions and block promotion rules
- `src-tauri/src/engines/discovery.rs` — Rust implementation (V1AF + V1AH + V1AI)
- `src-tauri/src/commands/discovery.rs` — Tauri command bindings (V1AF + V1AH + V1AI)
- `src/types/discovery.ts` — TypeScript type mirror (parallel)
- `src/api/discovery.ts` — Tauri command binding (parallel)
- `src/data/discoverySource.ts` — Frontend adapter (V1AG)
- `src/data/discoveryImport.ts` — Candidate builder (V1AH)
- `obsidian/stages/V1AH-intake-to-discovery-import-preview.md` — V1AH stage note
- `obsidian/stages/V1AI-discovery-import-persistence.md` — V1AI stage note
