# V1X — ASSESS Triage v1

**Status:** complete (pending Bujar review and commit)
**Date:** 2026-05-17
**Predecessor:** V1W-R — ASSESS artifact viewer
**Successor (planned):** to-be-named
**Arc:** ASSESS-FORWARD — operator triage workspace

## Why

V1W-R made ASSESS real: it could load a saved V1R BatchRun export
JSON and render it as a flat read-only viewer. For dense exports
such as the V1T 24-device mixed archive, "flat" turned into a
long scroll of device blocks with no way to focus.

V1X upgrades ASSESS from "viewer" to **operator triage surface**:
the same export, the same components, the same contract — but the
operator can now collapse clean devices, search by hostname or
rule, filter by severity, filter by rule, and switch between by-
device and by-severity rendering without leaving ASSESS.

Nothing about INTAKE, ModeRail, the hierarchy dashboard, the
validator, parsers, or Rust changed. ASSESS still consumes a file
and renders the contents honestly; V1X just adds view-only
affordances on top.

## What changed

### Pure helpers — `src/modes/assess/triage.ts`

- `deviceIdentity(d)` — derives hostname, slice, platform, vendor,
  finding count, highest-severity, isClean, hasSkippedRules.
- `defaultExpandedSliceIds(artifact)` — devices with findings
  default-expand; clean / skipped / failed devices default-collapse.
- `presentSeverityChips(artifact)` — returns the severities (and
  `clean`/`skipped` device-level chips) actually represented in
  the artifact, ordered critical→info then clean, skipped.
- `distinctRuleIds(artifact)` — sorted unique rule IDs.
- `severityChipCounts(artifact)` / `ruleIdCounts(artifact)` —
  per-chip counts derived once from the artifact (not from JSX).
- `applyTriage(artifact, filters)` — returns `VisibleDevice[]`,
  the filtered subset with already-narrowed `visibleFindings`. No
  mutation of input.
- `groupBySeverity(visible)` — re-window the visible findings into
  severity buckets for the by-severity view.

25 helper tests (`__tests__/triage.test.ts`) cover identity
derivation, default expansion, chip option derivation, finding
matching, the eight `applyTriage` cases (no-filter, severity
filter, rule filter, clean chip, skipped chip, identity search,
combined search+severity, no-mutation), severity grouping, and
`filtersAreActive`.

### Components

- `components/AssessTriageHeader.tsx` — search input, view-mode
  toggle, severity-chip row, rule-id chip row, visible-count line,
  Clear filters button.
- `components/AssessDeviceSection.tsx` — collapsible per-device
  block. Header always renders (hostname/slice/platform chips,
  finding count, highest-severity pill). Body (FindingsPanel)
  renders only when expanded.
- `components/AssessSeverityGroup.tsx` — by-severity rendering;
  rule_id + title + device identity per row, grouped under a
  severity pill heading.

### View — `components/AssessLoadedView.tsx`

Rewritten to compose the triage layer. Holds a small
discriminated-action reducer for filters + view mode and a
`useState` map for expand overrides. All counts and groupings
flow through helpers. The V1W-R `RunSummaryStrip` and
`FindingsPanel` adapters are preserved unchanged; the
ValidationReport adapter now also restricts findings to the
filtered subset.

### Documentation

- `docs/architecture/ASSESS_SURFACE_CONTRACT.md` — extended with
  V1X section binding clauses X1–X8 (triage is view-only,
  artifact immutable, counts flow through helpers, filtering
  hides not transforms, by-severity is regrouping not new
  assessment, clean/skipped semantics, no INTAKE coupling
  increase, component-scoped triage state).
- `obsidian/ANTHRACITE_INDEX.md` — V1X row added.

### Tests

- `__tests__/triage.test.ts` — 25 new helper tests.
- `__tests__/AssessLoadedView.test.tsx` — extended from 6 to 14
  tests: triage header presence, severity chip options, rule-id
  chip options, severity filter narrowing, search filtering by
  hostname, by-severity grouping, collapse/expand toggle, Clear
  filters restoration, V1W-R baseline behaviours preserved.

## Key decisions

- **Clean and skipped are device-level chips**, not finding-level
  filters. When selected with no other filter, they widen the
  visible-device set to qualifying devices; when combined with
  severity/rule filters, those filters constrain the finding set
  while the device chips remain inclusive for qualifying devices.
- **Default-expand only devices with findings.** Failed devices
  default-collapse — the operator can expand to inspect, but the
  header carries enough identity (stage_status pill, slice id) to
  triage without scrolling through expanded fault chrome.
- **Identity-only search keeps the device visible** even when no
  findings match. Combining identity-search with severity/rule
  filters re-applies the strict "must have surviving findings"
  rule.
- **Triage state stays inside `AssessLoadedView`.** No new file
  for the reducer; surface area is small enough that the reducer
  + dispatch are read alongside the view.

## Parked follow-ups

- `RunSummaryStrip` viewer-mode / hide-actions prop so ASSESS
  does not show a disabled Re-run button. (Coordinated change;
  V1Y candidate.)
- ASSESS density additions beyond V1X (per-severity-group inline
  expand, deep-link to a specific finding, multi-artifact compare).
- HOME mode IA stage (still deferred).
- Future `export_version >= 2` migration path.
- Per-rule severity-distribution mini-bars in chips.

## Gate results

| Gate | Result |
|------|--------|
| `pnpm typecheck` | 0 errors |
| `pnpm test` | (see report) |
| `pnpm build` | clean |
| `cargo check --lib` | unchanged |
| `cargo test` | unchanged |
| `tools/ops-readiness.ps1` | READY |
| Forbidden-vocab grep in `src/modes/assess/` | empty |
| Shell / intake / Rust / package.json diffs | empty |

## Pointers

- `docs/architecture/ASSESS_SURFACE_CONTRACT.md` — V1X clauses X1–X8.
- `src/modes/assess/triage.ts` — pure helpers.
- `src/modes/assess/components/AssessLoadedView.tsx` — composition.
- `obsidian/stages/V1W-R-assess-artifact-viewer.md` — predecessor.
- `obsidian/stages/V1T-mixed-archive-density-proof.md` — the
  density corpus this stage targets.
