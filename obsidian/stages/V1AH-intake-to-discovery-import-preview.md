# V1AH — INTAKE → Discovery Import Preview

**Arc:** HONEST-HIERARCHY → INVENTORY-EVOLUTION (first real pipe from INTAKE to Discovery)
**Date:** 2026-05-18
**Status:** complete

---

## Objective

Build the first real pipe from INTAKE BatchRun → Discovery: deterministic preview of device import candidates, rejection evaluation, and record-ID derivation. Preview-only — no storage, no mutation, no inventory changes. Establishes the foundation for future persistence (V1AI) and topology consumption (V1AJ+).

---

## Scope in

**New files:**
- `obsidian/stages/V1AH-intake-to-discovery-import-preview.md` — this note

**Edited files:**
- `docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md` — new V1AH section (pipe diagram, rejection table, record-ID format, DeviceModel carry-through, INTAKE surface affordance, future hand-off)
- `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` — V1AH addition to Discovery section (new command, non-mutating contract, pipeline summary)
- `obsidian/ANTHRACITE_INDEX.md` — V1AH row added to stage map

**Rust implementation (already landed):**
- `src-tauri/src/engines/discovery.rs` extended with:
  - `DiscoveryImportCandidate` struct
  - `DiscoveryImportRejectionReason` enum (`missing_identity` | `environment_mismatch` | `duplicate_record_id`)
  - `DiscoveryImportRejection` struct
  - `DiscoveryImportPreviewRecord` struct
  - `DiscoveryImportSummary` struct
  - `DiscoveryImportPreview` struct
  - Engine method: `preview_import(env_id, candidates) → DiscoveryImportPreview`
- `src-tauri/src/commands/discovery.rs` adds `preview_discovery_import(environment_id, candidates)` command (registered in `src-tauri/src/lib.rs`)

**TypeScript types and API (already landed):**
- `src/types/discovery.ts` — all 5 new wire shapes mirrored
- `src/api/discovery.ts` — `previewDiscoveryImport(environmentId, candidates)` wrapper

**Frontend builder (already landed):**
- `src/data/discoveryImport.ts` exports `buildDiscoveryImportCandidates(batchRun, environmentId)`
- Tests at `src/data/__tests__/discoveryImport.test.ts`

**INTAKE surface (already landed):**
- `src/modes/intake/RunSummaryStrip.tsx` — "Preview Discovery Import" affordance in actions row
  - Visibility: BatchRun `complete` or `complete_with_failures` AND active environment id AND ≥1 importable device
  - Result line: `"X accepted · Y rejected"`
  - Wording: strictly "Preview" (never "Imported" or "Inventory updated")
  - Preview result local to INTAKE

---

## Scope out

- No persistence / inventory mutation — preview only.
- No `"Import" button with save semantics`.
- No `BatchRunExport` schema changes.
- No raw config storage in Discovery.
- No DeviceModel schema changes.
- No parser or validator changes.
- No Topology graph consumption (future stage).
- No polling, SSH/SNMP, or discovery I/O.
- No `DataSourceState` union changes.
- No cross-mode state sharing (INTAKE → OpsConsole display) — planned for future stage if Bujar decides.

---

## Design decisions

**1. Live BatchRun is the source, not BatchRunExport.**

`BatchRunExport` omits `DeviceModel` by design — it is a portable archive snapshot. The import preview **requires** in-memory `BatchRunDevice.device_model` for evaluation. Source of truth for the pipe is the live, in-memory BatchRun state.

**2. DeviceModel carries through unchanged — no Discovery-side fork.**

DeviceModel is Anthracite's canonical model for device representation. Discovery stores records that **reference** the model, not a copy. Discovery does not extend, fork, or maintain a parallel model. Model schema is unchanged in V1AH.

**3. Record-ID format is namespaced and deterministic.**

Format: `discovery::<sanitized-env-id>::<sanitized-hostname-or-candidate-id>`

Sanitization: lowercase ASCII; replace non-`[a-z0-9-]` with `-` (collapsed). Deterministic on the same input.

Example: `discovery::prod-hq::core-1a-dc01`

**4. Rejection reasons are a closed three-value enum.**

| Reason | Meaning |
|--------|---------|
| `missing_identity` | Candidate lacks hostname; cannot derive record ID |
| `environment_mismatch` | Target environment does not exist or unavailable |
| `duplicate_record_id` | Record ID already exists in inventory; first-wins |

First rejection wins. Deterministic and stable.

**5. First-wins on duplicate record IDs.**

When multiple candidates map to the same record ID, the first accepted; subsequent candidates rejected on `duplicate_record_id` reason. Deterministic within a single preview call.

**6. Preview command is non-mutating and deterministic.**

Same inputs (environment_id + candidates) → same output (DiscoveryImportPreview) every time. No side effects. `inventory_view()` is empty before AND after preview calls. Test-guarded.

**7. INTAKE surface visibility is gated.**

"Preview Discovery Import" affordance appears only when:
- BatchRun is `complete` or `complete_with_failures`
- Active environment ID is provided
- At least one importable device exists

Result line shows `"X accepted · Y rejected"`. Wording is strictly "Preview".

**8. Ops Console preview display skipped in V1AH.**

Cross-mode state sharing (INTAKE preview result → OpsConsole display) was skipped per prompt rule: "pipe matters more than cross-mode state." Preview result stays local to INTAKE. Future stage may extend if Bujar decides.

---

## Pipe contract

```
BatchRun (in-memory with DeviceModel per device)
  ↓
buildDiscoveryImportCandidates(batchRun, environmentId)
  ↓ [TS pure adapter, deterministic]
DiscoveryImportCandidate[]
  ├── candidate_id: string
  ├── hostname: string
  ├── environment_id: string
  └── device_model: DeviceModel
  ↓
previewDiscoveryImport(environment_id, candidates)
  ↓ [Rust command, deterministic, non-mutating]
DiscoveryImportPreview
  ├── accepted_records: DiscoveryImportPreviewRecord[]
  │   └── record_id: string, device_model: DeviceModel
  ├── rejections: DiscoveryImportRejection[]
  │   └── candidate_id: string, reason: DiscoveryImportRejectionReason
  └── summary: DiscoveryImportSummary
      ├── total_candidates: usize
      ├── accepted_count: usize
      └── rejected_count: usize
```

---

## Rejection evaluation logic

For each candidate in the preview call:

1. **Missing identity check:** If candidate hostname is absent or empty → reject with `missing_identity`.
2. **Environment match check:** If environment_id does not exist or is not accessible → reject with `environment_mismatch`.
3. **Duplicate check:** Derive record ID deterministically. If ID already exists in inventory → reject with `duplicate_record_id` (first-wins).
4. **Accept:** If all checks pass → accept as `DiscoveryImportPreviewRecord` with record_id and device_model.

Order is deterministic. Output is stable for identical inputs.

---

## Files changed and their purpose

| File | Change | Purpose |
|------|--------|---------|
| `docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md` | Append V1AH section | Document pipe, record-ID format, rejection enum, DeviceModel carry-through |
| `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` | Extend Discovery section | Note new `preview_discovery_import` command and non-mutating contract |
| `obsidian/ANTHRACITE_INDEX.md` | Add V1AH row | Index stage in project memory |
| `src-tauri/src/engines/discovery.rs` | 5 new structs + enum + method | Rust engine logic and types |
| `src-tauri/src/commands/discovery.rs` | New Tauri command | Wire Rust method to command surface |
| `src-tauri/src/lib.rs` | Register command | Add `preview_discovery_import` to command list |
| `src/types/discovery.ts` | 5 new wire types | TypeScript mirrors of Rust structs |
| `src/api/discovery.ts` | New API wrapper | `previewDiscoveryImport(environmentId, candidates)` |
| `src/data/discoveryImport.ts` | New builder module | `buildDiscoveryImportCandidates(batchRun, environmentId)` pure adapter |
| `src/data/__tests__/discoveryImport.test.ts` | New tests | Test candidate builder and edge cases |
| `src/modes/intake/RunSummaryStrip.tsx` | New action affordance | "Preview Discovery Import" button in actions row + result line |

---

## Validation checklist

### Determinism & Purity

- [x] `buildDiscoveryImportCandidates` is pure (no side effects, same input → same output)
- [x] `preview_import` engine method is pure (deterministic record-ID derivation, deterministic rejection logic)
- [x] Preview command is non-mutating; `inventory_view()` is empty before and after calls
- [x] Rejection order is stable within a single preview call

### Boundaries & Ownership

- [x] Source of truth for pipe is live BatchRun (with DeviceModel), not BatchRunExport
- [x] DeviceModel carries through unchanged; no Discovery-side fork or extension
- [x] Record-ID format is deterministic and namespaced: `discovery::<env>::<hostname>`
- [x] Rejection-reason enum is closed: `missing_identity`, `environment_mismatch`, `duplicate_record_id`
- [x] First-wins on duplicate record IDs

### Frontend

- [x] INTAKE RunSummaryStrip displays "Preview Discovery Import" action (gated on BatchRun status + env id + candidates)
- [x] Result line shows `"X accepted · Y rejected"` (not "Imported" or "Inventory updated")
- [x] Preview result stays local to INTAKE (no cross-mode sync in V1AH)
- [x] Wording is consistent: "Preview" only

### Documentation

- [x] `DISCOVERY_ENGINE_BOUNDARY.md` V1AH section complete (pipe diagram, rejection table, record-ID format, DeviceModel contract, future hand-off)
- [x] `ENGINE_AND_API_BOUNDARIES.md` Discovery section notes V1AH addition
- [x] `ANTHRACITE_INDEX.md` stage map includes V1AH entry
- [x] This stage note captures design decisions and scope

### Code Quality

- [x] Rust types are typed (no string-based rejection reasons)
- [x] TypeScript mirrors are faithful to Rust shapes
- [x] API wrapper uses camelCase for invoke args
- [x] Builder function is exported and tested
- [x] Tests cover happy path + rejection cases + duplicate scenario

### Tests & Builds

- [x] `cargo check` in `src-tauri/` green
- [x] `cargo test` discovery tests pass
- [x] `pnpm typecheck` green
- [x] `pnpm test` passes discovery-related tests
- [x] `pnpm build` succeeds
- [x] `tools/ops-readiness.ps1` reports READY

### Halt conditions

- [x] H1: `buildDiscoveryImportCandidates` implemented and exported
- [x] H2: `previewDiscoveryImport` API wrapper functional
- [x] H3: Rust `preview_import` engine method deterministic and non-mutating
- [x] H4: Rejection-reason enum is closed (3 values)
- [x] H5: Record-ID derivation is namespaced and deterministic
- [x] H6: DeviceModel carry-through is unchanged
- [x] H7: INTAKE RunSummaryStrip "Preview" affordance wired
- [x] H8: Result line shows `"X accepted · Y rejected"`
- [x] H9: Preview result is local to INTAKE (no OpsConsole sync in V1AH)
- [x] H10: Ops-readiness checks pass
- [x] H11: Docs complete and internally consistent

---

## Next stage (deferred to Bujar)

**V1AI (Persistence):** Implement `import_discovery_records(environment_id, preview_result)` command that mutates `inventory_view()` and persists records deterministically. First stage where Discovery inventory is no longer empty.

**Or: V1AJ (OpsConsole Preview):** Wire INTAKE preview result into OpsConsole real-time display if Bujar decides cross-mode state sharing is needed.

**Or: Topology consumption:** When Topology mode body lands, it consumes persisted Discovery records as input facts for information + live graph construction.

---

## Key learnings for next stage

- **Preview-only proved sufficient.** No storage needed to demonstrate the pipe; pure determinism is the foundation.
- **DeviceModel carry-through is clean.** No fork, no extension — the model travels intact from INTAKE through Discovery to (future) Topology.
- **Record-ID namespace + sanitization is stable.** Deterministic derivation on hostname/identity prevents collisions and makes discovery records stable across runs.
- **Ops Console surface can be partial.** V1AG proved partial integration (engine + one surface, not all blocks) is compatible with the render-all-blocks invariant. V1AH surfaces INTAKE affordance without cross-mode state, keeping the boundary clean until Topology arrives.
- **First-wins on duplicates simplifies logic.** No merge semantics, no conflict resolution — first candidate wins, later ones rejected deterministically. Matches INTAKE batch semantics.

---

## Suggested commit message

```
stage-v1ah: intake-to-discovery import preview pipe — first real pipe, deterministic record-id derivation, preview-only

Arc: HONEST-HIERARCHY → INVENTORY-EVOLUTION
- Rust: DiscoveryImportCandidate, rejection-reason enum (3 values), preview_import engine method
- TS: wire mirrors, builder, API wrapper
- INTAKE: RunSummaryStrip preview affordance + result line
- Docs: pipe contract, record-ID format, DeviceModel carry-through, future hand-off
- Deterministic: same input → same output; non-mutating; inventory_view stays empty
- FirstWins: duplicate record IDs; stable within single preview call
```
