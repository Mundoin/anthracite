# Findings Display Contract (V1Y)

Status: **Locked at V1Y.** This document binds the cross-mode shared
display surface for findings and summary rendering.

`FINDINGS_DISPLAY_CONTRACT_VERSION: 1`

Pair docs:

- `docs/architecture/INTAKE_SURFACE_CONTRACT.md`
- `docs/architecture/ASSESS_SURFACE_CONTRACT.md`
- `docs/architecture/VALIDATOR_ENGINE_CONTRACT.md`
- `src/types/findingsDisplay.ts` — the type surface
- `src/types/batchRun.ts` — `BatchRunSummary` / `BatchRunStatus`
- `src/types/batchRunExport.ts` — `BatchRunExportSummary` (structurally identical)

---

## Scope

The shared display surface is two components owned by the intake
module but consumed by both modes:

- `RunSummaryStrip` (`src/modes/intake/components/RunSummaryStrip.tsx`)
  — horizontal summary strip.
- `FindingsPanel` (`src/modes/intake/components/FindingsPanel.tsx`)
  — per-device findings panel.

Both render data; neither owns the data's lifecycle. Producers
(INTAKE live state, ASSESS loaded artifact) project their data into
the contract types and pass it in. The contract does not name a
caller; any future mode that renders findings consumes the same two
components under the same rules.

---

## Binding clauses

### F1. Display components are mode-aware

`RunSummaryStrip` accepts a required `mode: FindingsDisplayMode`
prop. `FindingsPanel` remains mode-agnostic — the component renders
a `ValidationReport` and has no actions to suppress, so no `mode`
prop is required on it. Adding mode-aware behavior to
`FindingsPanel` requires a contract bump (F8).

### F2. mode="author" permits actions

In author mode, `RunSummaryStrip` renders:

- `Analyse batch` button when `display.status === "idle"` and
  `onAnalyse` is supplied.
- `Re-run analysis` button when status is `complete` or
  `complete_with_failures` and `onReRun` is supplied.
- `Copy JSON` / `Copy Markdown` / `Save JSON` / `Save Markdown`
  buttons when status is terminal and the corresponding callbacks
  are supplied.
- `ExportStatusView` when `exportStatus` is supplied.

INTAKE is the only mode that passes `mode="author"` at V1Y.

### F3. mode="viewer" suppresses all actions

In viewer mode, `RunSummaryStrip` renders the counts strip and
nothing else. `Analyse`, `Re-run`, all four export-action buttons,
and `ExportStatusView` are absent regardless of which callbacks are
supplied. `onAnalyse`, `onReRun`, `disabled`, `exportStatus`, and
the export callbacks are ignored.

ASSESS is the only mode that passes `mode="viewer"` at V1Y.

### F4. Display data shape

The shared display data shape is `FindingsDisplaySummary`
(`src/types/findingsDisplay.ts`):

```ts
interface FindingsDisplaySummary {
  readonly status: BatchRunStatus;
  readonly summary: BatchRunSummary;
}
```

INTAKE passes a `BatchRun` (structurally satisfies the type because
`BatchRun` carries `status` and `summary` with the required
shapes). ASSESS passes a constructed object via
`exportAsDisplaySummary(artifact)`. The contract does NOT include
`source`, `devices`, or `epoch` — those are out of the shared
display surface's scope.

`BatchRunExportSummary` and `BatchRunSummary` are structurally
identical at V1Y; both rely on `BatchRunSeverityCounts` from
`batchRun.ts`. V1Y does not consolidate them at the type level —
the V1R export contract is locked — but it does take advantage of
their structural compatibility to retire the synthetic-`BatchRun`
adapter that V1W-R required.

### F5. Counts render verbatim

V1P-era honesty rule extended to the contract: `RunSummaryStrip`
renders counts directly from `display.summary.*`. No client-side
counting. No recomputation. No interpretation. Severity chips with
zero counts still render — the "we looked and found nothing"
signal matters.

### F6. ASSESS owns its wire-type adapter

The reshape from `BatchRunExportValidationReport` to the canonical
`ValidationReport` (the shape `FindingsPanel` consumes) lives in
`src/modes/assess/displayAdapter.ts`. The adapter:

- Is pure (no side effects, no I/O).
- Does not mutate input.
- Sets `raw_excerpt: null` on every evidence record — this is
  contract-driven, reflecting the V1R export's
  `finding_raw_excerpt: "omitted_to_avoid_raw_config_excerpt"`
  omission. Not aggregation.

The same module also exports `exportAsDisplaySummary(artifact)`,
which projects a loaded `BatchRunExport` into the
`FindingsDisplaySummary` shape `RunSummaryStrip` consumes.

INTAKE does not need an adapter; it already produces canonical
`ValidationReport` values from the validator and carries
`BatchRun` directly.

### F7. Adding actions requires contract review

Any new action surface on `RunSummaryStrip` or `FindingsPanel`
updates this contract and both mode adapters. Pull-request-grade
discipline: a stage proposal that introduces a new action must
amend F2/F3 explicitly and explain why the action is or is not
permitted in viewer mode.

### F8. Version constant

`FINDINGS_DISPLAY_CONTRACT_VERSION` is exported from
`src/types/findingsDisplay.ts` and starts at `1` at V1Y. Bumps:

- Adding a new `FindingsDisplayMode` value → bump.
- Changing `FindingsDisplaySummary` shape → bump.
- Changing what `mode="viewer"` suppresses → bump.
- Adding mode-aware behavior to `FindingsPanel` → bump.
- Comment / test-only changes → no bump.

---

## Non-goals

V1Y's contract does NOT:

- Define how findings are filtered (V1X triage owns that, scoped
  to ASSESS).
- Define how findings are persisted (no persistence in the arc).
- Define how findings are exported (V1R contract owns export shape).
- Define how findings are derived from a `DeviceModel` (the
  validator engine contract owns that).

This contract is strictly the display-surface boundary.
