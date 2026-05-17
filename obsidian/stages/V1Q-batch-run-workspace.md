# V1Q — Batch Run Workspace

Stage type: frontend composition (no Rust, no new commands)
Predecessor: V1P-A (INTAKE two-lane workspace)
Successor (TBD): V1R (BatchRun serialisation / export) OR V1O-C (receipt + findings export) OR V1Q-A (interactive batch sort)
Anchor: `fb57d17 stage-v1p-a: document intake workspace contract`
Date: 2026-05-17

## Summary

V1Q evolves INTAKE from "open one config" to "open many,
analyse the batch, present a deterministic per-device
picture." Adds a frontend-only `BatchRun` artifact, an
"Analyse batch" button that walks parse + receipt + validate
across every slice in the batch, per-row Stage + Findings
columns, a top RunSummaryStrip with verbatim aggregate
counts, and drill-down that reads stored per-device results
(no re-parse, no re-validate).

V1Q is composition-only over the existing five typed
commands (`splitConfigBatch`, `detectConfigPlatform`,
`parseDeviceConfig`, `projectDeviceReceipt`,
`validateDeviceModel`) plus `archiveIntake`. Zero Rust, zero
new Tauri commands, zero new wire types beyond
`src/types/batchRun.ts`. The aggregation is pure verbatim
sum/count via a single helper.

## Halt-rule trip

None. Phase work landed cleanly:
- Token additions: zero. V1P-A's `--anth-role-*` aliases
  cover every V1Q chip / rail.
- Reducer evolution: additive only; all 36 existing reducer
  tests pass untouched.
- Panel internals: only `BatchSummaryView` evolved
  (additive `Stage` + `Findings` columns + RunSummaryStrip).
  Existing markup queries continue to pass.
- V1P validator useEffect deps array: byte-identical.

## Architecture rules honored

| Prompt rule | Encoding |
|---|---|
| INTAKE only, additive | All edits live under `src/modes/intake/`, `src/types/batchRun.ts`, `docs/architecture/INTAKE_SURFACE_CONTRACT.md`, `obsidian/` |
| Frontend orchestration only | `runBatch` / `concurrencyPool` live in `src/modes/intake/orchestration/`; they compose existing TS api wrappers |
| Reducer transitions byte-identical (non-V1Q) | All 36 existing reducer tests pass untouched |
| Panel internals byte-identical | Only `BatchSummaryView` evolved; its existing rows / labels / Open button preserved (verified by existing `BatchSummaryView.test.tsx` passing) |
| Validator useEffect deps unchanged | The V1P bugfix deps array L404-L413 is byte-identical; V1Q's orchestration effect lives in its own useEffect with `[api, runEpoch]` deps |
| Determinism | `devices` always sorted by `slice_id` ASC; `summary` always equals `deriveBatchRunSummary(devices)`; no IDs, no timestamps |
| Aggregation centralised | `deriveBatchRunSummary` is the single counting surface. React components render verbatim |
| Naming discipline | No "assessment" vocabulary anywhere — locked to future ASSESS mode |
| No new hex | Zero — verified by grep |
| No new deps | `package.json` + `Cargo.toml` + lockfiles untouched |
| Concurrency: bounded with sequential fallback | `BATCH_RUN_MAX_IN_FLIGHT = 4` shipped; pool collapses cleanly at 1 |

## Files added

- `src/types/batchRun.ts` — `BatchRun`, `BatchRunDevice`, `BatchRunSummary`, `BatchRunStatus`, `DeviceStageStatus`, `DeviceStageError`, `BatchRunSource`, `BatchRunSeverityCounts`
- `src/modes/intake/orchestration/batchRunSummary.ts` — `deriveBatchRunSummary`, `deriveBatchRunStatus`
- `src/modes/intake/orchestration/concurrencyPool.ts` — `runWithBoundedConcurrency`
- `src/modes/intake/orchestration/runBatch.ts` — `runBatch`
- `src/modes/intake/components/RunSummaryStrip.tsx`
- `src/modes/intake/components/BatchRunStageCell.tsx`
- `src/modes/intake/components/BatchRunFindingsCell.tsx`
- `src/modes/intake/__tests__/batchRunSummary.test.ts` (11)
- `src/modes/intake/__tests__/runBatch.test.ts` (13 — pool + orchestrator)
- `src/modes/intake/__tests__/intakeReducer.batchRun.test.ts` (13)
- `src/modes/intake/__tests__/RunSummaryStrip.test.tsx` (8)
- `src/modes/intake/__tests__/BatchSummaryView.run.test.tsx` (9)
- `src/modes/intake/__tests__/IntakePanel.batchRun.test.tsx` (4)
- `src/modes/intake/__tests__/IntakePanel.batchRun.archive.test.tsx` (3)
- `obsidian/screenshots/V1Q/README.md`
- `obsidian/stages/V1Q-batch-run-workspace.md` — this note

## Files modified (additive only)

- `src/modes/intake/intakeTypes.ts` — `BatchData.batchRun` field; 10 new `IntakeAction` variants
- `src/modes/intake/intakeReducer.ts` — 10 new cases + helpers (`buildInitialBatchRunDevices`, `resetDeviceForRerun`, `sortDevices`, `applyDeviceUpdate`, `batchRunSourceFromState`); `SplitToBatch` + `ArchiveBatchAssembled` initialise `batchRun: null`; `DrillIntoSlice` reads stored results when present
- `src/modes/intake/IntakePanel.tsx` — `BATCH_RUN_MAX_IN_FLIGHT` constant; new useEffect (own deps `[api, runEpoch]`) orchestrating runs; `onAnalyseBatch` / `onReRunBatch` handlers; `onSelectPlatform` also dispatches `BatchRunOverrideSelected` when drilled-in; pass `batchRun` + handlers to `BatchSummaryView`
- `src/modes/intake/components/BatchSummaryView.tsx` — three optional new props (`batchRun`, `onAnalyse`, `onReRun`); `RunSummaryStrip` rendered above table when handlers supplied; two new `<td>` cells in each row when run columns active
- `src/modes/intake/intake.css` — appended `.intake-run-summary-strip*`, `.intake-run-stage*`, `.intake-run-findings*` rule blocks; all chrome via `--anth-*` + `--anth-role-*`; no new hex
- `docs/architecture/INTAKE_SURFACE_CONTRACT.md` — appended "Batch run (V1Q overlay)" section
- `obsidian/ANTHRACITE_INDEX.md` — added V1Q row

## Files untouched (per §4 halt list)

- `src-tauri/**` (entire Rust tree)
- `src/api/**`
- `src/types/networkModel.ts`, `receipt.ts`, `validator.ts`, `configBatch.ts`, `configDetection.ts`, `archiveIntake.ts`
- All panel components except `BatchSummaryView`:
  `ReceiptDisplay`, `FindingsPanel`, `ArchiveInventoryPanel`,
  `ArchiveSourceBadge`, `ArchiveOpenButton`,
  `DetectionResultView`, `ParseStatusView`,
  `PlatformOverrideSelect`, `ConfigInputArea`,
  `IntakeWorkspace`
- `src/App.tsx`, `src/components/shell/**`
- `package.json`, `pnpm-lock.yaml`, vite/ts configs
- `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`
- `docs/design/INDUSTRIAL_VISUAL_LAW.md`, `docs/design/anthracite-master/handoff/TOKENS.md`
- `src/styles/tokens.css` (no new aliases needed)

## BatchRun shape

| Field | Type | Purpose |
|---|---|---|
| `source` | `BatchRunSource` | `paste` / `file` / `archive` discriminant |
| `devices` | `ReadonlyArray<BatchRunDevice>` | Sorted by `slice_id` ASC |
| `summary` | `BatchRunSummary` | Equal to `deriveBatchRunSummary(devices)` at every transition |
| `status` | `BatchRunStatus` | `idle` / `in_progress` / `complete` / `complete_with_failures` |
| `epoch` | `number` | Monotonic counter; trigger for orchestration useEffect |

`BatchRunDevice`:

| Field | Source |
|---|---|
| `slice_id` | From `ConfigSlice.slice_id` |
| `hostname_hint` | From `SliceHint` (when `kind === "hostname_present"`) |
| `source_provenance` | From `BatchData.archiveProvenance` |
| `stage_status` | Lifecycle: pending → queued → parsing → validating → complete / failed / skipped |
| `detection_result` | From `BatchData.perSliceDetection` |
| `selected_platform` | Initially detection's `best_match`; overridden by `BatchRunOverrideSelected` |
| `is_manual_override` | Operator truth, preserved across Re-run |
| `device_model` | From `parseDeviceConfig` |
| `receipt` | From `projectDeviceReceipt` |
| `validation_report` | From `validateDeviceModel` |
| `stage_error` | From any thrown step |

## Reducer actions added (10)

| Action | Effect |
|---|---|
| `BatchRunRequested` | Initialise `batch.batchRun` from existing per-slice state; epoch += 1 |
| `BatchRunReRunRequested` | Reset every device's stage to pending; preserve `selected_platform` + `is_manual_override`; epoch += 1 |
| `BatchRunCancelled` | Set `batch.batchRun = null` |
| `BatchRunDeviceQueued` | One device → `queued` |
| `BatchRunDeviceParsing` | One device → `parsing` |
| `BatchRunDeviceValidating` | One device → `validating` + stores `device_model` + `receipt` |
| `BatchRunDeviceCompleted` | One device → `complete` + stores `validation_report` |
| `BatchRunDeviceFailed` | One device → `failed` + stores `stage_error` |
| `BatchRunDeviceSkipped` | One device → `skipped` + reason |
| `BatchRunOverrideSelected` | One device → override stored, stage reset to `pending`, parse/receipt/validation cleared |

After every per-device action, `summary` and `status` are
recomputed via `deriveBatchRunSummary` + `deriveBatchRunStatus`.

## Aggregation discipline

`deriveBatchRunSummary` is the single counting surface:

- Two single-pass loops (one for summary, one for status).
- Severity counts sum directly by `finding.severity` —
  never re-classify, never recolor, never escalate.
- Reducer invariant: `summary === deriveBatchRunSummary(devices)`
  enforced by `intakeReducer.batchRun.test.ts` "after every
  reducer transition, summary == deriveBatchRunSummary(devices)".

React components render verbatim from `batchRun.summary.*`.
The one per-cell exception (`BatchRunFindingsCell` filters
ONE device's findings into severity counts) is documented
in-file: it operates on a single device's report, not a
cross-device sum, and avoids plumbing per-device counts
through the reducer.

## Concurrency policy SHIPPED

**Bounded N=4.** `BATCH_RUN_MAX_IN_FLIGHT = 4` in
`IntakePanel.tsx`. The pool collapses cleanly at
`maxInFlight = 1` (verified by
`runBatch.test.ts` "maxInFlight=1 behaves sequentially");
the fallback to deterministic sequential is a one-line
constant change.

Rationale: jsdom tests of pool + orchestrator surfaced zero
race-prone behaviour. The V1P validator useEffect bug
discipline is replicated:
- Orchestrator effect deps array is stable: `[api, runEpoch]`.
- Cancellation via mutable closure (`cancelRef.current`)
  rather than effect re-trigger.
- Last-fired epoch tracked in a ref to prevent re-entrancy.

If a real-app race surfaces, the fallback path is:
1. Drop `BATCH_RUN_MAX_IN_FLIGHT` to `1`.
2. Update this stage note's "concurrency policy SHIPPED"
   section.
3. Re-run frontend suite — no test changes needed.

## Determinism confirmed

- `devices` sorted by `slice_id` ASC after every update
  (`intakeReducer.batchRun.test.ts` "devices array always
  sorted by slice_id").
- Same action sequence twice produces byte-identical state
  (covered structurally by the helper-equality assertion).
- `runBatch` produces identical dispatch sequence on repeat
  (`runBatch.test.ts` "deterministic per-device action
  order").
- No `Date.now()`, no `Math.random`, no `run_id`, no
  `created_at` anywhere in V1Q code (verified by file
  inspection).

## Test counts

| Suite | V1P-A baseline | V1Q new | Total |
|---|---:|---:|---:|
| Frontend (vitest) | 122 | 61 | **183** |
| Rust lib | 282 | 0 | **282** |
| Rust integration (23 binaries, summed) | unchanged | 0 | **per V1P-A** |

V1Q new tests:
- `batchRunSummary.test.ts`: 11
- `intakeReducer.batchRun.test.ts`: 13
- `runBatch.test.ts` (pool + orchestrator): 13
- `RunSummaryStrip.test.tsx`: 8
- `BatchSummaryView.run.test.tsx`: 9
- `IntakePanel.batchRun.test.tsx`: 4
- `IntakePanel.batchRun.archive.test.tsx`: 3
- Subtotal: **61**

## Regression locks confirmed

- ✅ V1O single-config (3 IntakePanel tests)
- ✅ V1O-A batch + drill-down (6 IntakePanel.batch tests)
- ✅ V1O-B archive flow + provenance badge (4 IntakePanel.archive tests)
- ✅ V1P FindingsPanel-above-Receipt (3 IntakePanel.findings tests)
- ✅ V1P validator useEffect deps array byte-identical (visual diff inspection)
- ✅ V1P-A two-lane workspace (15 IntakePanel.layout tests)
- ✅ V1P-A role-token discipline (no new hex; intake.css V1Q append uses only `--anth-*` + `--anth-role-*`)
- ✅ Existing reducer tests untouched (36 across `intakeReducer.test.ts`, `intakeReducer.batch.test.ts`, `intakeReducer.archive.test.ts`)
- ✅ Existing BatchSummaryView tests untouched (7 in `BatchSummaryView.test.tsx`)

## Named decisions

1. **Concurrency: bounded N=4 SHIPPED.** Pool collapses
   cleanly at 1; fallback is a one-line constant change.
   No race surfaced during slice-5 / slice-10 testing.
2. **Sort policy: static `slice_id` ASC.** Interactive
   column sort parked to V1Q-A. Reducer guarantees the
   order; BatchSummaryView renders in iteration order.
3. **Drill-down dispatch path: split.** Stored-results
   path (`DrillIntoSlice` reads from `batchRun.devices`)
   coexists with the legacy detect-based path (when no
   `batchRun` exists or device not yet completed).
4. **Manual override mid-batch: dual-dispatch.** When the
   operator picks a manual platform in the drilled-in
   workspace, IntakePanel dispatches BOTH `SelectPlatform`
   (existing V1O sub-state) AND `BatchRunOverrideSelected`
   (V1Q per-device storage). This keeps the V1O code path
   untouched while wiring up V1Q's operator-truth rule.
5. **Pending counts as in-flight for status derivation.**
   `deriveBatchRunStatus` includes `pending` in the
   in-progress check. This produces a brief "in_progress"
   tick immediately after `BatchRunRequested` (devices
   pending, orchestrator about to dispatch). Acceptable;
   the orchestrator's first dispatch flips to `queued`
   within a single microtask. Side-effect: post-override
   re-evaluation requires the operator to wait for the
   orchestrator to fire OR run dispatches `BatchRunReRunRequested`
   to reset everything.
6. **Override does NOT auto-restart the run.** Per prompt
   §6.4 #3 ("Re-run picks it up"). Documented in stage
   note + INTAKE_SURFACE_CONTRACT.md.
7. **No interactive ClearAll integration test.** The
   Clear button lives in `ConfigInputArea`, which is
   hidden under the batch summary. Cancellation coverage
   lives at the reducer level
   (`intakeReducer.batchRun.test.ts` "BatchRunCancelled
   removes batchRun entirely").
8. **No "absent validator wrapper" path in production.**
   The runtime DEFAULT_API always supplies
   `validateDeviceModel`. The orchestrator's
   "validate not available" branch exists for legacy
   test APIs only; production renders a normal completed
   row.

## Parked follow-ups

- **Screenshots:** 10 captures owed by Bujar after
  `pnpm tauri dev`. See `obsidian/screenshots/V1Q/README.md`.
- **V1Q-A:** interactive column sort (severity DESC,
  hostname ASC). Reducer's devices stay slice-sorted;
  sort is a render-time concern.
- **V1R:** `BatchRun` serialisation / export — the shape
  is now stable, frontend-only, ready to be the export
  artifact.
- **Performance:** 200-config archives sequential is a
  follow-up concern. Bounded N=4 covers operator-realistic
  sizes (10-50).
- **MGMT-HYG-004 (Telnet):** still parked from V1P; not
  V1Q's concern.

## Suggested commit slices

Mirror §6:

1. `stage-v1q: add BatchRun types` — `src/types/batchRun.ts`
2. `stage-v1q: add deriveBatchRunSummary helper` —
   `src/modes/intake/orchestration/batchRunSummary.ts` +
   `__tests__/batchRunSummary.test.ts`
3. `stage-v1q: extend intake reducer with BatchRun actions` —
   `src/modes/intake/intakeTypes.ts` +
   `intakeReducer.ts` +
   `__tests__/intakeReducer.batchRun.test.ts`
4. `stage-v1q: add bounded concurrency pool + runBatch` —
   `src/modes/intake/orchestration/concurrencyPool.ts` +
   `runBatch.ts` +
   `__tests__/runBatch.test.ts`
5. `stage-v1q: add RunSummaryStrip` —
   `src/modes/intake/components/RunSummaryStrip.tsx` +
   `__tests__/RunSummaryStrip.test.tsx`
6. `stage-v1q: add per-row Stage + Findings cells` —
   `src/modes/intake/components/BatchRunStageCell.tsx` +
   `BatchRunFindingsCell.tsx`
7. `stage-v1q: evolve BatchSummaryView with run columns` —
   `src/modes/intake/components/BatchSummaryView.tsx` +
   `__tests__/BatchSummaryView.run.test.tsx`
8. `stage-v1q: wire IntakePanel orchestration` —
   `src/modes/intake/IntakePanel.tsx` +
   `__tests__/IntakePanel.batchRun.test.tsx` +
   `__tests__/IntakePanel.batchRun.archive.test.tsx`
9. `stage-v1q: append batch run CSS` —
   `src/modes/intake/intake.css`
10. `stage-v1q: document batch run workspace contract` —
    `docs/architecture/INTAKE_SURFACE_CONTRACT.md` +
    `obsidian/ANTHRACITE_INDEX.md` +
    `obsidian/stages/V1Q-batch-run-workspace.md` +
    `obsidian/screenshots/V1Q/README.md`

## Next stage

Open:
- **V1R** — BatchRun serialisation / export (natural successor
  since `BatchRun` is now the stable serialisable artifact).
- **V1O-C** — receipt + findings export (alternative export
  scope at the device level rather than batch level).
- **V1Q-A** — interactive batch sort (UX polish on top of
  V1Q).
