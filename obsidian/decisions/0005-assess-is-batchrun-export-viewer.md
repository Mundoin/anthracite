# 0005 — ASSESS in V1W-R is scoped as a Batch Run export viewer

**Date:** 2026-05-17
**Status:** accepted
**Stage:** V1W-R
**Supersedes:** —
**Superseded by:** —

## Context

The `assess` ModeId has existed in `src/components/shell/ModeRail.tsx`
since the shell first shipped, sitting in the Governance group with
the `IcoAssess` icon and no implementation. The semantics of
"Assessment" were never pinned: it could have been an Assessment
Engine, an Assessment Run orchestrator, a compliance dashboard, or
a viewer of saved artifacts.

V1R landed the deterministic Batch Run export JSON
(`BatchRunExport`). V1S landed the file-save bridge. With both in
place, a saved export is a portable, viewable artifact — but
nothing in the UI consumes it.

## Decision

In V1W-R, `assess` is narrowly defined as a **read-only viewer of
a V1R BatchRun export JSON file**. The mode loads one file via
`window.showOpenFilePicker`, validates it against the
`BatchRunExport` contract, and renders it through the existing
intake `FindingsPanel` and `RunSummaryStrip` components.

The broader concepts — Assessment Engine, AssessmentRun,
AssessmentReport, Compliance Engine, Reporting Engine — remain
**reserved** and are not introduced. None of those names may
appear in V1W-R source.

## Rationale

- The artifact already exists (V1R) and is already saveable (V1S).
  A viewer closes the smallest loop without inventing new
  contracts.
- Reusing `FindingsPanel` and `RunSummaryStrip` keeps the rendering
  honesty rules intact: the components own their own counts and
  presentation; ASSESS only feeds them already-validated JSON.
- Naming `assess` for a viewer avoids reserving the word for a
  future engine prematurely; if an Assessment Engine ships later,
  this viewer is the operator-facing reading-room next to it, not
  a competitor for the name.
- Narrow scope ships in a single stage and does not depend on any
  Rust change, capability change, or new dependency.

## Constraints (binding)

- No "Assessment Engine," "AssessmentRun," "assessment_run," or
  "AssessmentReport" in V1W-R source (see
  `ASSESS_SURFACE_CONTRACT.md` A8 and the grep gate in §8 of the
  V1W-R prompt).
- No edits to `FindingsPanel` or `RunSummaryStrip` props (A8).
- No aggregation, recomputation, or invented values (A1, A2).
- No persistence (A4); no re-export (A5).
- `export_version 1` only (A6).

## Revisit when

- A real Assessment Engine is on the table. The viewer either
  stays alongside (as the artifact reader) or graduates into a
  fuller workspace; the choice is that stage's, not this one's.
- Multi-artifact compare / switch views are scoped.
- An export format bump (`export_version: 2`) lands.

## Pointers

- `docs/architecture/ASSESS_SURFACE_CONTRACT.md` — clauses A1–A8.
- `src/types/batchRunExport.ts` — V1R contract this viewer
  consumes.
- `obsidian/decisions/0004-home-mode-deferred-to-nav-stage.md` —
  paired decision deferring HOME.
- `obsidian/stages/V1W-R-assess-artifact-viewer.md` — stage note.
