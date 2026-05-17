# V1Y — Shared display contract for Findings + Summary

**Status:** complete (pending Bujar review and commit)
**Date:** 2026-05-17
**Predecessor:** V1X — ASSESS triage v1
**Successor (planned):** V1Z — ASSESS metadata header
**Arc:** ASSESS-FORWARD — structural cleanup

## Why

V1W-R reused `RunSummaryStrip` and `FindingsPanel` from INTAKE
under a "structural adapter" allowance: ASSESS constructed a
synthetic `BatchRun` (with null-filled per-device fields the strip
never read) and passed no-op callbacks plus `disabled={true}` to
keep the Analyse / Re-run buttons inert. The honesty held — A8
named this explicitly — but the shape was wrong: a viewer should
not pretend to be an author with disabled hands.

V1Y retires that pretense. `RunSummaryStrip` becomes mode-aware
(`author` / `viewer`); its prop shape is the narrow subset both
modes actually need (`status` + `summary`); the
synthetic-`BatchRun` adapter is deleted entirely; the
ValidationReport reshape is moved to a dedicated
`src/modes/assess/displayAdapter.ts` module with tests and is
formalised in a new architecture document.

INTAKE behaviour is byte-identical. ASSESS shows no action buttons
at all (previously: disabled Re-run hint). V1X triage state is
untouched.

## What changed

### Types — `src/types/findingsDisplay.ts`

New file. Defines `FindingsDisplayMode = "author" | "viewer"`,
`FindingsDisplaySummary { status, summary }`, and the
`FINDINGS_DISPLAY_CONTRACT_VERSION = 1` constant. Imports only
from `batchRun.ts`; no dependency on the export wire type.

### Display component — `RunSummaryStrip`

Refactored to the contract:

- Prop rename `batchRun` → `display` (typed
  `FindingsDisplaySummary | null`).
- New required `mode: FindingsDisplayMode` prop.
- `onAnalyse`, `onReRun`, `disabled` made optional.
- `mode="viewer"` suppresses Analyse, Re-run, Copy/Save
  JSON/Markdown, and ExportStatusView regardless of callbacks.
- `mode="author"` preserves every conditional branch
  byte-for-byte vs. the V1Q/V1R/V1S behaviour.

### Display component — `FindingsPanel`

Single architecture comment added near the top noting it is a
shared display surface; zero logic change.

### ASSESS adapter — `src/modes/assess/displayAdapter.ts`

New pure-function module. Exports:

- `exportAsDisplaySummary(artifact)` — projects
  `BatchRunExport` → `FindingsDisplaySummary`.
- `exportReportAsValidationReport(report, visibleFindings)` —
  reshapes `BatchRunExportValidationReport` →
  `ValidationReport`, restricting findings to the V1X visible
  subset and setting `raw_excerpt: null` (contract-driven; V1R
  omits raw excerpts).

10 tests in `displayAdapter.test.ts` cover both helpers,
including no-mutation guarantees.

### ASSESS — `AssessLoadedView.tsx`

`toBatchRun` and `toBatchRunDevice` deleted. `useMemo` for the
synthetic run and the `noop` callback deleted. New `displaySummary`
memo uses `exportAsDisplaySummary`. `RunSummaryStrip` call site
becomes `<RunSummaryStrip display={displaySummary} mode="viewer" />`.

All V1X triage state, reducer, helpers, and component composition
are unchanged.

### ASSESS — `AssessDeviceSection.tsx`

Inline `toValidationReport` and `toFinding` adapters deleted.
`FindingsPanel` call site now uses
`exportReportAsValidationReport` from `displayAdapter`.

### Documentation

- `docs/architecture/FINDINGS_DISPLAY_CONTRACT.md` — new. Clauses
  F1–F8 bind the cross-mode display surface.
- `docs/architecture/INTAKE_SURFACE_CONTRACT.md` — V1Y subsection
  added pointing to the new contract.
- `docs/architecture/ASSESS_SURFACE_CONTRACT.md` — A8 rewritten
  to reference F6 and the retired synthetic adapter.
- `obsidian/ANTHRACITE_INDEX.md` — V1Y row added.

### Tests

- `RunSummaryStrip.test.tsx` — all 8 existing tests mechanically
  renamed (`batchRun` → `display`, `mode="author"` added). 9 new
  viewer-mode tests added covering each suppressed action and
  counts-verbatim parity.
- `displayAdapter.test.ts` — 10 new tests.
- `AssessLoadedView.test.tsx` — unchanged. All 14 V1X tests pass
  byte-identical.
- All other intake / assess test files unchanged.

## Key decisions

- **Option B (prop rename to `display`).** Picked over keeping
  `batchRun` because the new prop semantics no longer reference a
  `BatchRun`. Clarity over churn. Every call site touched.
- **Path 1 (preserve evidence adapter, move + document).** The
  null-fill of `raw_excerpt` is contract-driven per V1R; that
  honest separation belongs in a named ASSESS-owned adapter
  module, not inline in a component. The alternative — teaching
  `FindingsPanel` to consume the export wire type — would have
  inverted the dependency (INTAKE owning a type from ASSESS).
- **Mode names `author` / `viewer`**, not `intake` / `assess` or
  `readonly` / `editable`. Capability constraints, not source
  names, so a future third consumer stays orthogonal to mode
  naming.

## Parked follow-ups

- **V1Z — ASSESS metadata header** (next stage in the
  ASSESS-FORWARD arc).
- **V1Z-A — parker-rule retirement** (third stage in the arc).
- **HOME mode IA** still deferred per decision 0004.
- Multi-assessment compare / switch.
- Cross-mode rendering of findings in a third mode (when one
  appears) — the contract is ready.
- Consolidating `BatchRunSummary` and `BatchRunExportSummary`
  into a single type (deliberately not done at V1Y — the V1R
  export contract is locked).

## Gate results

| Gate | Result |
|------|--------|
| `pnpm typecheck` | 0 errors |
| `pnpm test` | (see final report) |
| `pnpm build` | (see final report) |
| `cargo check --lib` | unchanged (no `src-tauri/` edits) |
| `cargo test` | unchanged (no `src-tauri/` edits) |
| `tools/ops-readiness.ps1` | (see final report) |
| Forbidden-vocab grep | empty |
| Shell / D1 / D2 / Rust / package.json diffs | empty |
| V1X `AssessLoadedView.test.tsx` byte-identical | yes |

## Pointers

- `docs/architecture/FINDINGS_DISPLAY_CONTRACT.md` — clauses F1–F8.
- `src/types/findingsDisplay.ts` — type surface.
- `src/modes/assess/displayAdapter.ts` — wire-type adapter.
- `src/modes/intake/components/RunSummaryStrip.tsx` — mode-aware
  display component.
- `obsidian/stages/V1X-assess-triage-v1.md` — predecessor.
- `obsidian/stages/V1W-R-assess-artifact-viewer.md` — origin of
  the synthetic-adapter pattern retired here.
