# V1AI — Discovery Import Persistence

**Arc:** INVENTORY-EVOLUTION (first persisted Discovery inventory pipe)
**Date:** 2026-05-18
**Status:** complete

---

## Objective

Turn the V1AH preview-only pipe into the first authoritative, persisted Discovery inventory pipe. Implement `DiscoveryStore` trait, JSON persistence layer, extended `DiscoveryDeviceRecord`, shared validation, and authoritative import command. App refreshes inventory on successful import. Discovery inventory is no longer empty after first import.

---

## Scope in

**New files:**
- `obsidian/stages/V1AI-discovery-import-persistence.md` — this note

**Edited files:**
- `docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md` — new V1AI section (persistence pipe, DiscoveryStore trait, import command, App refresh callback, extended record fields, INTAKE import action, source_state transitions)
- `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` — V1AI addition to Discovery section (new `import_discovery_records` command, persistence contract, first-wins idempotency)
- `obsidian/ANTHRACITE_INDEX.md` — V1AI row added to stage map

**Rust implementation:**
- `src-tauri/src/engines/discovery.rs`:
  - `DiscoveryStore` trait: `load() → DiscoveryInventoryState` and `save(state) → Result<()>`
  - `NullDiscoveryStore` — V1AF/V1AH fallback, always empty
  - `JsonDiscoveryFileStore` — runtime, reads/writes `<app_data_dir>/discovery_inventory.json`
  - `DiscoveryInventoryState { schema_version: 1, records: Vec<DiscoveryDeviceRecord> }`
  - `DiscoveryDeviceRecord` extended: `device_model: DeviceModel`, `source_label: Option<String>`, `slice_id: Option<String>`
  - Factored validator: `validate_and_build_record(env_id, candidate, existing_ids, in_request_ids) → Result<DiscoveryDeviceRecord, DiscoveryImportRejection>`
  - Updated `preview_import` to use shared validator and read in-store record IDs
  - Engine method: `import_records(env_id, candidates) → DiscoveryImportCommitResult`
  - `DiscoveryImportCommitResult { imported_records, rejected, summary: { total_candidates, imported_count, rejected_count, inventory_total_after } }`
  - Engine constructor hydrates from store at boot
  - `inventory_view` now returns `source_state = "real"` when records present
- `src-tauri/src/commands/discovery.rs`:
  - `import_discovery_records(environment_id, candidates) → DiscoveryImportCommitResult` command
  - Registered in `src-tauri/src/lib.rs`

**TypeScript types and API:**
- `src/types/discovery.ts` — `DiscoveryDeviceRecord` extends with 3 new fields; adds `DiscoveryImportCommitSummary`, `DiscoveryImportCommitResult`
- `src/api/discovery.ts` — `importDiscoveryRecords(environmentId, candidates)` wrapper with camelCase args

**Frontend:**
- `src/modes/intake/RunSummaryStrip.tsx` — "Import to Discovery" action (parallel to "Preview")
  - Visibility: gated on preview `accepted_count > 0` + env id + run complete
  - Status line: `"Imported X · Rejected Y"` or `"Imported 0 · Rejected N"` on duplicate re-import
  - Wording strictly "Import" (distinct from "Preview")
  - Disabled while running
- `src/modes/intake/IntakePanel.tsx` — receives `onDiscoveryImported?: () => Promise<void>` callback prop
  - Invokes callback after successful import
- `src/App.tsx` — passes callback into IntakePanel; callback re-runs `fetchDiscovery(activeEnvId)`
  - Ops Console re-renders with new record count when operator opens it

**Tests:**
- Rust: `cargo test` covers import command acceptance logic, first-wins idempotency, store fallback on corrupt JSON
- TS: `pnpm test` covers builder, import API wrapper, INTAKE action visibility

---

## Scope out

- No update / overwrite / merge / delete semantics in V1AI. First-wins only.
- No cross-environment merge or deduplication.
- No topology consumption (future stage).
- No polling / SSH / SNMP / live discovery.
- No BatchRunExport schema changes.
- No DataSourceState union changes.
- No import from saved export JSON file.
- No broad UI redesign beyond RunSummaryStrip import action.
- No import history or audit trail in V1AI (future).

---

## Design decisions

**1. Extend `DiscoveryDeviceRecord` rather than fork.**

`DiscoveryDeviceRecord` gains `device_model: DeviceModel` field. Discovery stores the canonical model directly, not a copy or reference. No parallel DeviceModel fork. Model travels intact from INTAKE → Discovery → (future) Topology.

**2. Persistence pattern mirrors EnvironmentStore exactly.**

`DiscoveryStore` trait with `load()` / `save()` methods. Concrete: `JsonDiscoveryFileStore` at `<app_data_dir>/discovery_inventory.json`. Schema-versioned from day one (`schema_version: 1`). Corruption fallback to empty inventory (same pattern as Environment Engine).

**3. Shared `validate_and_build_record` used by both preview and import.**

Single source of truth for env-mismatch / missing-identity / duplicate-record-id rules. No copy-paste divergence between V1AH preview and V1AI import logic. Both call the same validator.

**4. Preview reads in-store record IDs for advisory honesty.**

V1AH preview now reads current inventory state as part of duplicate check. Operator sees what would import NOW, against current store. Still non-mutating; honest preview.

**5. Import recomputes acceptance server-side.**

Frontend preview result is purely advisory. Rust `import_records` recomputes acceptance against current store state before writing. No "trust me bro" — import validates independently.

**6. First-wins on duplicate record ID. No update/overwrite/merge in V1AI.**

Second identical import returns `imported_count: 0, rejected_count: N`, all rejections with reason `duplicate_record_id`. Inventory unchanged. Future stages may add mutation modes.

**7. App refresh callback chain rather than cross-mode state polling.**

After successful import, `IntakePanel` invokes `onDiscoveryImported()` callback. `App` re-runs `fetchDiscovery(activeEnvId)`. `discovery` state updates. Ops Console renders new record count. Explicit callback avoids polling; clear ownership boundary.

**8. INTAKE import action wording strictly distinct from preview.**

Preview: `"Preview Discovery Import"` result line: `"X accepted · Y rejected"`.
Import: `"Import to Discovery"` result line: `"Imported X · Rejected Y"` or `"Imported 0 · Rejected N"`.
Wording clarity prevents operator confusion.

---

## Pipe contract

```
BatchRun (in-memory)
  ↓
buildDiscoveryImportCandidates(batchRun, environmentId)
  ↓ [TS pure adapter]
DiscoveryImportCandidate[]
  ↓
previewDiscoveryImport(environment_id, candidates)
  ↓ [Rust, non-mutating, reads store for duplicate check]
DiscoveryImportPreview
  ├── accepted_records: DiscoveryImportPreviewRecord[]
  ├── rejections: DiscoveryImportRejection[]
  └── summary: DiscoveryImportSummary
  ↓ [Operator review on INTAKE RunSummaryStrip]
  ↓
importDiscoveryRecords(environment_id, candidates)
  ↓ [Rust, mutating, recomputes acceptance against current store]
DiscoveryStore (JsonDiscoveryFileStore writes JSON)
  ├── loaded at boot
  ├── saved after import
  └── path: <app_data_dir>/discovery_inventory.json
  ↓
inventory_view(environment_id?)
  ├── source_state: "real" (if records present) or "empty"
  ├── records: Vec<DiscoveryDeviceRecord>
  └── message: "discovery inventory has N record(s)" or "empty — no records collected"
  ↓ [App refresh callback]
App.tsx fetchDiscovery(activeEnvId)
  ↓
OpsConsoleMode renders new record count
```

---

## Files changed and their purpose

| File | Change | Purpose |
|------|--------|---------|
| `docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md` | Append V1AI section | Document persistence pipe, store trait, extended record, import command, App callback chain |
| `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` | Extend Discovery section | Note new `import_discovery_records` command and persistence contract |
| `obsidian/ANTHRACITE_INDEX.md` | Add V1AI row | Index stage in project memory |
| `src-tauri/src/engines/discovery.rs` | DiscoveryStore trait + implementations, extended DiscoveryDeviceRecord, shared validator, import_records method | Rust persistence layer and import logic |
| `src-tauri/src/commands/discovery.rs` | New `import_discovery_records` command | Wire Rust method to command surface |
| `src-tauri/src/lib.rs` | Register `import_discovery_records` command | Add to command list |
| `src/types/discovery.ts` | Extend DiscoveryDeviceRecord, add DiscoveryImportCommitSummary and DiscoveryImportCommitResult | TypeScript mirrors |
| `src/api/discovery.ts` | New `importDiscoveryRecords(environmentId, candidates)` wrapper | API surface |
| `src/modes/intake/RunSummaryStrip.tsx` | New "Import to Discovery" action + status line | INTAKE import affordance |
| `src/modes/intake/IntakePanel.tsx` | Accept `onDiscoveryImported` callback prop, invoke on import success | Callback plumbing |
| `src/App.tsx` | Pass `onDiscoveryImported` callback to IntakePanel, re-run `fetchDiscovery(activeEnvId)` | App refresh chain |

---

## Validation checklist

### Determinism & Purity

- [x] `validate_and_build_record` is pure (no side effects, same input → same output)
- [x] `import_records` engine method is deterministic (recomputes acceptance, writes persistently)
- [x] First-wins on duplicate record ID is stable
- [x] DiscoveryStore load/save contract is deterministic

### Boundaries & Ownership

- [x] Discovery owns inventory writes (no other engine mutates)
- [x] DeviceModel is canonical (no fork, no extension in Discovery)
- [x] Extended record carries all necessary fields (device_model, source_label, slice_id)
- [x] Persistence file is versionable schema (`schema_version: 1`)
- [x] Missing/corrupt file → safe empty fallback

### Frontend

- [x] INTAKE RunSummaryStrip displays "Import to Discovery" action (gated on preview accepted_count > 0)
- [x] Result line shows `"Imported X · Rejected Y"` or `"Imported 0 · Rejected N"`
- [x] Wording is consistent: "Import" only (distinct from "Preview")
- [x] Disabled while import running; hidden in viewer mode / no env / no candidates
- [x] App callback chain invokes `onDiscoveryImported` → re-runs `fetchDiscovery`

### Persistence

- [x] DiscoveryStore trait abstracts load/save
- [x] JsonDiscoveryFileStore writes to `<app_data_dir>/discovery_inventory.json`
- [x] Schema versioning in place from day one
- [x] Engine hydrates from store at constructor
- [x] Corrupt JSON → fallback to empty (no crash)

### Documentation

- [x] `DISCOVERY_ENGINE_BOUNDARY.md` V1AI section complete (pipe, store, import command, callback chain, source_state transitions)
- [x] `ENGINE_AND_API_BOUNDARIES.md` Discovery section notes V1AI addition
- [x] `ANTHRACITE_INDEX.md` stage map includes V1AI entry
- [x] This stage note captures design decisions and scope

### Code Quality

- [x] Rust types are typed (no string-based state)
- [x] TypeScript mirrors are faithful to Rust shapes
- [x] API wrapper uses camelCase for invoke args
- [x] Preview and import use shared validator (no duplicate logic)
- [x] Tests cover happy path + rejection cases + duplicate re-import + corrupt file fallback

### Tests & Builds

- [x] `cargo check` in `src-tauri/` green
- [x] `cargo test` discovery tests pass (~16 new tests for store, import, idempotency)
- [x] `pnpm typecheck` green
- [x] `pnpm test` passes discovery-related tests (~25+ new tests for import action, callback, API)
- [x] `pnpm build` succeeds
- [x] `tools/ops-readiness.ps1` reports READY

### Halt conditions

- [x] H1: `DiscoveryStore` trait implemented with `load()` / `save()` methods
- [x] H2: `JsonDiscoveryFileStore` persists to `<app_data_dir>/discovery_inventory.json`
- [x] H3: `DiscoveryInventoryState { schema_version: 1, records: Vec<DiscoveryDeviceRecord> }` schema in place
- [x] H4: `DiscoveryDeviceRecord` extended with `device_model`, `source_label`, `slice_id`
- [x] H5: Shared `validate_and_build_record` used by both preview and import
- [x] H6: `import_discovery_records(env_id, candidates) → DiscoveryImportCommitResult` command implemented
- [x] H7: First-wins on duplicate record ID; second import returns `imported_count: 0`
- [x] H8: `inventory_view` returns `source_state = "real"` when records present
- [x] H9: INTAKE RunSummaryStrip "Import to Discovery" action wired with `"Imported X · Rejected Y"` status line
- [x] H10: App callback chain (`onDiscoveryImported` → `fetchDiscovery` → re-render) functional
- [x] H11: Missing/corrupt JSON file → fallback to empty inventory (no crash)
- [x] H12: Ops-readiness checks pass
- [x] H13: Docs complete and internally consistent

---

## Strategic checkpoint

After V1AI, the Discovery/INTAKE inventory import and persistence pipe is **complete and working**. Operator can preview candidates, import with one action, and see persisted inventory reflected in Ops Console. Recommended pause for strategic direction decision:

- **V1AJ (OpsConsole Preview Display):** Wire INTAKE preview result into OpsConsole real-time display if Bujar decides cross-mode state sharing is needed (skipped in V1AH, still optional).
- **V1AK (Topology Consumption):** When Topology mode body lands, consume persisted Discovery records as input facts for information + live graph construction.
- **V1AL (Discovery Mutation Semantics):** Future stage adds update / merge / delete record semantics (not in V1AI).
- **V1AM (Live Discovery / Polling):** Future stage adds SSH/SNMP/vendor-specific live discovery (not in V1AI).

---

## Key learnings for next stage

- **Persistence on first import is safe.** DiscoveryStore pattern mirrors EnvironmentStore cleanly; fallback on corruption is sufficient.
- **Shared validation prevents divergence.** Single `validate_and_build_record` used by both preview (advisory) and import (authoritative) keeps logic DRY and honest.
- **App callback chain is cleaner than polling.** Explicit `onDiscoveryImported` callback avoids ambient state-polling; ownership is clear.
- **First-wins scales.** No merge/update complexity needed yet. Idempotent re-import (all rejects on `duplicate_record_id`) is deterministic and operator-friendly.
- **Source state transitions are honest.** `source_state = "real"` appears only when records truly exist. Frontend adapter cost is minimal.

---

## Suggested commit message

```
stage-v1ai: discovery inventory persistence + authoritative import — first persisted inventory

Arc: INVENTORY-EVOLUTION
- Rust: DiscoveryStore trait + JsonDiscoveryFileStore (schema v1); extended DiscoveryDeviceRecord (device_model, source_label, slice_id)
- Import: import_discovery_records command (authoritative, recomputes acceptance, persists, App refreshes)
- Validator: shared validate_and_build_record (used by both preview + import)
- INTAKE: RunSummaryStrip "Import to Discovery" action + status line (distinct wording from Preview)
- Persistence: <app_data_dir>/discovery_inventory.json; schema-versioned; fallback on corruption
- Store: Hydrated at boot; First-wins on duplicate record ID; Second import returns imported_count: 0
- Callback: App callback chain (IntakePanel → onDiscoveryImported → fetchDiscovery → re-render)
- Docs: DISCOVERY_ENGINE_BOUNDARY V1AI section, ENGINE_AND_API_BOUNDARIES V1AI addition
```
