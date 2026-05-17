# V1P-A — INTAKE Visual Hierarchy and Companion Workspace

Stage type: visual / system-layout overlay (additive React + CSS only)
Predecessor: V1P (Validator Engine)
Successor (TBD): V1O-C (export) OR V1Q (second rule pack) OR V1P-B (mode rail tune)
Anchor: `3f4e0bd docs: update agent operating guidance`
Date: 2026-05-17

## Summary

V1P-A reshapes the INTAKE single-device and drilled-in views into a
two-lane workspace inspired by Arista CloudVision-class enterprise
network tooling. Operator decisions (Config Input, Detection,
Parse Status, Manual Override) land in a **work lane** on the
left; engine truth (FindingsPanel, ReceiptDisplay, validator
banners) lands in an **answer lane** on the right, separated by a
1px hairline seam. When no parse exists yet, the answer lane
renders a workstation-chrome empty state (`RESULT — (awaiting
parse)`) so the screen always reads as two surfaces, not one
column with dead horizontal space.

Batch summary (V1O-A) and archive inventory (V1O-B) stay
full-width. Drilling into a slice or archive entry transitions
back into the two-lane workspace. Below ~1100px viewport, the
workspace collapses to a single vertical stack via media query
— pure CSS, no JS layout logic, no content hidden.

V1P-A is **composition-only**: zero reducer edits, zero useEffect
edits (the V1P validator-trigger bug-fix deps array is
byte-identical), zero panel-internal markup edits, zero new Rust,
zero new dependencies. Lane chrome wraps existing panel
components; semantic accent rails are owned by the wrapper.

## Halt-rule trip

**Phase A — `--copper` token missing in runtime tokens.css.**
Halted on `src/styles/tokens.css` per V1P-A §12 missing-token
clause. Resumed via Architect's Phase-A resume prompt: added one
copper alias (`--anth-copper: var(--anth-warn)` — V1E-C/E/F/G
already treats copper and amber as one hue with two semantic
slots) plus eleven semantic role aliases (`--anth-role-*`). No
new hex value introduced anywhere in the codebase (verified by
grep src/ for new hex literals after the change — count 0).

## Architecture rules honored

| Prompt rule | How it's encoded |
|---|---|
| INTAKE only, additive | All edits live under `src/modes/intake/` + `src/styles/tokens.css` + `docs/architecture/INTAKE_SURFACE_CONTRACT.md` + `obsidian/` |
| Reducer byte-identical | `intakeReducer.ts` untouched; `intakeReducer.test.ts` (14 tests) + batch (13) + archive (9) green untouched |
| Panel internals byte-identical | `ConfigInputArea`, `DetectionResultView`, `ParseStatusView`, `PlatformOverrideSelect`, `FindingsPanel`, `ReceiptDisplay`, `BatchSummaryView`, `ArchiveInventoryPanel`, `ArchiveSourceBadge`, `ArchiveOpenButton` untouched |
| Validator useEffect untouched | Deps array `[api, state.batch, state.detection, state.device, state.isManualOverride, state.selectedPlatform, state.source, state.status]` byte-identical vs V1P (V1P runtime bugfix preserved) |
| No new tokens with new hex | One alias of an existing hex (copper → warn) + 11 semantic-role aliases. Zero new hex in the codebase |
| Token discipline | All lane-item rails reference `--anth-role-*` semantic tokens only; never raw `--anth-{info,warn,err,ok,copper}` |
| Existing per-panel rails preserved | intake.css L54, L100, L553 (`.intake-section__header`, `.intake-input__header`, `.intake-drilldown__header` border-left rails) byte-identical; wrapper rail supersedes via absolute positioning + z-index |
| Batch + archive inventory stay full-width | Workspace gated on `!showBatchSummary && state.batchStatus !== "splitting"` |
| ArchiveSourceBadge stays in drilled chrome | Provenance badge remains inside `intake-drilldown__crumbs`, NOT moved into a lane-item wrapper (V1O-B contract preserved) |
| No new deps | `package.json` + `pnpm-lock.yaml` + `Cargo.toml` + `Cargo.lock` untouched |

## Files added

- `src/modes/intake/components/IntakeWorkspace.tsx` — two-lane primitive + private `IntakeWorkspaceEmptyAnswer`
- `src/modes/intake/__tests__/IntakeWorkspace.test.tsx` — 7 tests
- `src/modes/intake/__tests__/IntakePanel.layout.test.tsx` — 14 tests (10 distinct cases; severity test is a `.each` over 5 mixes)
- `obsidian/screenshots/V1P-A/README.md` — screenshot gate + visual-law checklist (captures owed by Bujar)
- `obsidian/stages/V1P-A-intake-visual-hierarchy.md` — this note

## Files modified (additive only)

- `src/styles/tokens.css` — appended: comment block, 1 copper alias, 11 `--anth-role-*` semantic aliases
- `src/modes/intake/intake.css` — appended: workspace grid, lane containers, seam, empty-state chrome, lane-item rail-only wrapper, 9 accent classes, narrow-width media query. **No existing rule edited.** Rails L54/L100/L553 byte-identical
- `src/modes/intake/IntakePanel.tsx` — replaced JSX return block; added `workLane` + `answerLane` JSX fragments and two local helpers (`parseStatusAccentClass`, `findingsAccentClass`). All `useReducer` / `useEffect` / `useCallback` blocks byte-identical
- `docs/architecture/INTAKE_SURFACE_CONTRACT.md` — appended "Workspace layout (V1P-A overlay)" section
- `obsidian/ANTHRACITE_INDEX.md` — added V1P-A row

## Files untouched (per §4 halt list)

- `src-tauri/**` (entire Rust tree)
- `src/api/**`, `src/types/**`
- `src/modes/intake/intakeTypes.ts`
- `src/modes/intake/intakeReducer.ts`
- All panel components (internal markup byte-identical)
- `src/App.tsx`, `src/components/shell/**`
- `package.json`, `pnpm-lock.yaml`, `vite.config.*`, `tsconfig*.json`
- `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`
- `docs/design/INDUSTRIAL_VISUAL_LAW.md`, `docs/design/anthracite-master/handoff/TOKENS.md`

## Lane assignment

| Existing panel              | Lane    | Accent class                              | Token role                       |
|-----------------------------|---------|-------------------------------------------|----------------------------------|
| `ConfigInputArea`           | work    | `intake-lane-item--accent-input`          | `--anth-role-input-bytes`        |
| `DetectionResultView`       | work    | `intake-lane-item--accent-engine`         | `--anth-role-engine-analysis`    |
| `ParseStatusView`           | work    | derived via `parseStatusAccentClass`      | `severity-clean`/`fault`/`status-running`/`neutral-chrome` |
| `PlatformOverrideSelect`    | work    | `intake-lane-item--accent-operator`       | `--anth-role-operator-choice`    |
| Validating banner           | answer  | `intake-lane-item--accent-running`        | `--anth-role-status-running`     |
| ValidatorFailed banner      | answer  | `intake-lane-item--accent-fault`          | `--anth-role-severity-fault`     |
| `FindingsPanel`             | answer  | derived via `findingsAccentClass`         | `severity-fault`/`warn`/`clean`  |
| `ReceiptDisplay`            | answer  | `intake-lane-item--accent-truth`          | `--anth-role-truth-projection`   |
| `BatchSummaryView`          | full    | n/a (full-width, no workspace)            | n/a                              |
| `ArchiveInventoryPanel`     | full    | n/a (full-width, no workspace)            | n/a                              |
| `ArchiveSourceBadge`        | header  | n/a (stays in drilled-in chrome)          | n/a                              |
| `ArchiveOpenButton` (bar)   | header  | n/a (stays in toolbar strip above ws)     | n/a                              |

## Accent rail mapping (final)

See `docs/architecture/INTAKE_SURFACE_CONTRACT.md` §"Workspace
layout (V1P-A overlay)" → "Accent rail mapping" for the binding
table. Consumer CSS references `--anth-role-*` tokens only.

## Empty-state chrome

```html
<div class="intake-workspace__empty"
     role="status"
     aria-label="Awaiting parse">
  <div class="intake-workspace__empty-eyebrow">RESULT</div>
  <div class="intake-workspace__empty-body">(awaiting parse)</div>
</div>
```

CSS: `min-height: 180px` so the panel has presence; eyebrow uses
11px / `letter-spacing: 0.22em` / `--anth-text-3`; body uses
`--anth-font-mono` / `--anth-text-3`. No icons, no marketing
copy, no illustrations.

## Narrow-width collapse

Breakpoint: `@media (max-width: 1100px)`. Grid collapses from
`minmax(0, 1fr) 1px minmax(0, 1fr)` to `minmax(0, 1fr)`; seam is
display-none; lane padding zeroed. Regression covered by
`IntakeWorkspace.test.tsx` (DOM order asserted; CSS media query
relies on browser engine).

## Test counts

| Suite | V1P baseline | New | Total |
|-------|-------------:|----:|------:|
| Frontend (vitest) | 107 | 14 (IntakeWorkspace 7 + IntakePanel.layout 7-case file with 14 tests because severity is `.each` over 5 + manual override + idle + parsed + batch + drilled + archive batch + archive drilled + no-findings-in-batch + reducer-byte-id) | 121 → 121 confirmed |
| Rust lib | 282 | 0 | 282 |
| Rust integration | 100 | 0 | 100 |

Frontend total: **121** (verified by `pnpm test --run`).

## Regression locks confirmed

- V1O single-config: 3 IntakePanel tests green untouched
- V1O-A multi-config + drill-down: 6 IntakePanel.batch tests green untouched
- V1O-B archive flow + provenance badge: 4 IntakePanel.archive tests green untouched
- V1P FindingsPanel-above-Receipt: covered by both
  `IntakePanel.findings.test.tsx` (3 tests, untouched) and new
  `IntakePanel.layout.test.tsx` ("single-device parsed renders
  Findings above Receipt in answer lane")
- V1P validator useEffect bugfix: deps array byte-identical; no
  cancellation-race regression possible
- V1P reducer transitions: `IntakePanel.layout.test.tsx`
  "reducer transitions byte-identical vs V1P (no behaviour
  change in V1P-A)" runs a known action sequence and asserts
  final state field-for-field

## Named decisions

1. **`--anth-copper` added to runtime `tokens.css` as alias of
   `--anth-warn`.** Doctrine (TOKENS.md and V1E-C/E/F/G stage
   notes) already names copper as the operator-selection accent;
   runtime catches up. No new hex.
2. **Eleven `--anth-role-*` semantic aliases added.** Consumer
   CSS uses roles, not primitives. Forward-compatible with new
   vendors and rule packs. Adding a new role means aliasing an
   existing primitive — no consumer churn.
3. **Lane-item wrapper rail supersedes existing per-panel
   `--anth-info` rail.** No edit to existing rules; wrapper rail
   takes precedence via absolute positioning + `z-index: 1`.
   Visually a recoloring of an existing rail position, not a
   net-new rail.
4. **Lane-item wrapper has NO border of its own.** Inner panel
   components retain their existing hairline border + radius +
   shadow chrome. The wrapper contributes only the absolute rail.
   Avoiding a visible double-border was the deciding factor;
   prompt §6.3 anticipated this with "Replace placeholders with
   actual values you READ from the current intake.css".
5. **`ArchiveOpenButton` bar stays ABOVE the workspace as
   toolbar chrome**, not inside the work lane. Prompt §0 listed
   work-lane contents as Config Input → Detection → Manual
   Override → Parse Status only; the archive toolbar is global
   and not a panel.

## Parked follow-ups

- Screenshots: 10 captures owed by Bujar after `pnpm tauri dev`.
  See `obsidian/screenshots/V1P-A/README.md`. Visual-law gate
  applies per capture.
- Optional V1P-B: tune mode rail to mirror the two-lane
  composition language; out of V1P-A scope.
- MGMT-HYG-004 (Telnet) still parked from V1P; unaffected by
  V1P-A.

## Suggested commit slices

Mirror §6:

1. `stage-v1p-a: add semantic role tokens` —
   `src/styles/tokens.css`
2. `stage-v1p-a: add IntakeWorkspace primitive` —
   `src/modes/intake/components/IntakeWorkspace.tsx` +
   `src/modes/intake/__tests__/IntakeWorkspace.test.tsx`
3. `stage-v1p-a: append workspace + accent rail CSS` —
   `src/modes/intake/intake.css`
4. `stage-v1p-a: wrap intake panels in two-lane workspace` —
   `src/modes/intake/IntakePanel.tsx`
5. `stage-v1p-a: add intake layout regression tests` —
   `src/modes/intake/__tests__/IntakePanel.layout.test.tsx`
6. `stage-v1p-a: document workspace layout contract` —
   `docs/architecture/INTAKE_SURFACE_CONTRACT.md` +
   `obsidian/ANTHRACITE_INDEX.md` +
   `obsidian/stages/V1P-A-intake-visual-hierarchy.md` +
   `obsidian/screenshots/V1P-A/README.md`

## Next stage

Open: V1O-C (receipt + findings export) vs V1Q (second rule
pack) vs V1P-B (mode rail tune). V1P-A leaves all three reachable.
