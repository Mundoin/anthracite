# V1W-R — ASSESS Artifact Viewer

**Status:** complete (pending Bujar review and commit)
**Date:** 2026-05-17
**Predecessor:** V1U — DIAG-HYG Rule Pack v1 + Cisco NX-OS Parser
**Successor (planned):** to-be-named
**Supersedes:** V1W (halted — see "Halt lesson" below)

## Why

V1R landed the deterministic Batch Run export JSON. V1S landed
save-to-file. The export was portable but nothing in the UI could
consume it. V1W-R closes that loop by making the existing `assess`
ModeId — which had no implementation since the shell first shipped
— a **read-only viewer of a saved V1R Batch Run export**.

Nothing about Assessment Engines, AssessmentRuns, AssessmentReports,
or new orchestration is added. The viewer reuses the intake
`FindingsPanel` and `RunSummaryStrip` components unchanged. Zero
Rust changes, zero new dependencies, zero shell edits.

## Halt lesson

The original V1W proposal was halted before any file edit because
its premise contradicted repo state. V1W assumed ModeRail had one
row (INTAKE) and the app root rendered INTAKE directly. In reality
ModeRail had 11 ModeIds in 4 groups, the `assess` ModeId already
existed, and the app root rendered a full hierarchy / D1 / D2
environments dashboard.

The Architect re-scoped to V1W-R: add ASSESS as a new mode module
under `src/modes/assess/`, give the pre-existing `assess` ModeId a
real implementation via one early-return branch in `App.tsx`,
defer HOME to a dedicated navigation-IA stage (decision 0004), and
narrow ASSESS to a Batch Run export viewer (decision 0005).

The halt itself surfaced two things worth keeping: the value of
evidence-based pre-implementation halts, and the importance of
Architect proposals being grounded in current repo state rather
than imagined shells.

## What changed

### New ASSESS module — `src/modes/assess/`

- `assessTypes.ts` — discriminated union `AssessState`
  (`empty | loading | loaded | error`) + tagged `AssessAction` union
  + `LoadErrorReason` union.
- `assessReducer.ts` — pure reducer, illegal transitions return
  prior state reference (V1O discipline).
- `loadBatchRunJson.ts` — FSA `showOpenFilePicker` bridge + pure
  `validateBatchRunExport` shape validator.
- `AssessPanel.tsx` — orchestrator, owns `useReducer`, dispatches
  to the loader. Tests inject the loader via prop.
- `components/AssessEmptyState.tsx` — single primary button + one
  helper line.
- `components/AssessLoadedView.tsx` — filename sub-line + Close
  button + `RunSummaryStrip` (synthetic `BatchRun` adapter) +
  per-device `FindingsPanel` (validation-report adapter).
- `components/AssessErrorView.tsx` — specific typed reason +
  message + Try-another-file + Close.
- `assess.css` — minimal scoped styling, reuses `--anth-role-*`
  tokens and `intake-btn` button family.
- `__tests__/` — 6 test files: reducer, loader validation,
  empty state, error view, loaded view, panel.

### App root — single early-return branch added

- `src/App.tsx` — `AssessPanel` imported alongside `IntakePanel`;
  one `if (activeMode === "assess")` block added immediately after
  the existing intake branch, with identical AppShell wiring
  (crumbs `Governance · Assess`, static status cells matching
  intake's pattern).

### Types

- `src/types/fileSystemAccess.d.ts` — added the missing
  `showOpenFilePicker` types and `FileSystemFileHandle.getFile()`
  while leaving the existing save types intact.

### Documentation

- `docs/architecture/ASSESS_SURFACE_CONTRACT.md` — new contract,
  binding clauses A1–A8.
- `docs/architecture/INTAKE_SURFACE_CONTRACT.md` — one-line note
  that `FindingsPanel` and `RunSummaryStrip` are also consumed by
  ASSESS as read-only viewers.
- `obsidian/decisions/0004-home-mode-deferred-to-nav-stage.md` —
  HOME explicitly deferred.
- `obsidian/decisions/0005-assess-is-batchrun-export-viewer.md` —
  `assess` ModeId scope narrowed to a viewer.
- `obsidian/ANTHRACITE_INDEX.md` — V1W-R row added.

## Key decisions

- HOME deferred to a dedicated navigation-IA stage
  (decision 0004).
- `assess` ModeId is a viewer of V1R export JSON, not an
  Assessment Engine (decision 0005).
- V1W-R does not edit the shell (`ModeRail`, `AppShell`), the
  hierarchy dashboard, the intake module, the validator, any
  parser, or any Rust file.

## Parked follow-ups

- HOME mode IA stage.
- Multi-assessment compare / switch view.
- ASSESS sort / filter UI.
- Assessment Engine, AssessmentRun, AssessmentReport.
- Top-bar status indicator.
- Mode-rail keyboard shortcuts.
- Mode transition animation.
- ASSESS re-export / save-as.
- Forward-compat for `export_version >= 2`.

## Pointers

- `docs/architecture/ASSESS_SURFACE_CONTRACT.md`
- `obsidian/decisions/0004-home-mode-deferred-to-nav-stage.md`
- `obsidian/decisions/0005-assess-is-batchrun-export-viewer.md`
- `src/types/batchRunExport.ts` (V1R contract)
- `src/modes/intake/IntakePanel.tsx` (pattern reference)
