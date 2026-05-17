# Assess Surface Contract (V1W-R)

Status: **Locked at V1W-R**. This document binds the operator-facing
`ASSESS` mode to the V1R Batch Run export contract. Any change to the
rules below requires its own revision stage.

Pair docs:
- `docs/architecture/INTAKE_SURFACE_CONTRACT.md` — the producer of the
  export artifact `ASSESS` consumes.
- `src/types/batchRunExport.ts` — authoritative shape of the V1R
  `BatchRunExport` JSON.
- `docs/architecture/VALIDATOR_ENGINE_CONTRACT.md` — finding semantics
  preserved end-to-end.

---

## Scope

V1W-R is the second user-facing surface. It exposes the existing
`assess` ModeId — previously a Governance affordance with no
implementation — as a **read-only viewer of a saved V1R BatchRun
export JSON file**. It does not introduce an Assessment Engine, an
AssessmentRun, an AssessmentReport, or any new wire contract. The
artifact is the file; the surface is the reader.

V1W-R is intentionally narrow:

- one file open at a time
- stateless: no persistence, no recents, no history
- one early-return branch in `App.tsx` (`activeMode === "assess"`)
- no edits to `ModeRail`, `AppShell`, intake module, validator,
  parsers, or any Rust engine
- no new ModeId; the `assess` ModeId already existed

`home` mode is explicitly deferred (see decision
`obsidian/decisions/0004-home-mode-deferred-to-nav-stage.md`).

---

## Engine boundary

V1W-R consumes a file, not an engine. The contract surface is:

| Source | Format | Producer |
|--------|--------|----------|
| Operator-selected file | V1R `BatchRunExport` JSON | INTAKE Batch Run export (V1R) saved by V1S |

The file is read via `window.showOpenFilePicker` (File System Access
API), mirroring the V1S `saveToFile` pattern. No Tauri command is
added. No Rust code participates.

Validation accepts:
- `export_version === 1`
- `kind === "batch_run_export"`
- All nine top-level `BatchRunExport` fields present
- `summary` has all eight count fields plus `severity_counts` with
  five severity keys
- `devices` is an array (may be empty)
- `generated_by.app_name === "Anthracite"`

Anything else fails with a specific `LoadErrorReason`.

---

## Binding clauses

### A1. ASSESS does not invent fields

Every rendered value derives from a single field in the loaded
`BatchRunExport`. No derived strings, no synthesised counts, no
inferred status text. Filename in the sub-line is the only value not
originating in the JSON; it is the picker's `File.name`.

### A2. ASSESS does not aggregate

No `.filter`, `.reduce`, `.groupBy`, or `.map(...).length` over
`devices` or `findings` to produce a displayed value. The summary
counts shown come from `summary.*` verbatim. Severity chips come
from `summary.severity_counts.*` verbatim. Per-device finding
counts and severity tallies inside `FindingsPanel` come from the
device's own `validation_report.findings`, which is read by the
existing intake `FindingsPanel` — that component owns its own
honest tally and is not modified by V1W-R.

### A3. ASSESS does not fabricate identity

The artifact has no name beyond its source filename. The filename
is not parsed, interpreted, normalised, hashed, or used to infer
batch identity. Devices render in `devices[]` order; no re-sort, no
re-group, no synthetic device IDs.

### A4. ASSESS does not persist

Closing the assessment, refreshing the app, or navigating to
another mode returns the viewer to its empty state. No
`localStorage`, no `IndexedDB`, no in-memory cache across reducer
resets. The artifact lives in the reducer for the duration of the
session it was opened in; nothing more.

### A5. ASSESS is read-only on the artifact

No editing, no in-place annotation, no re-validation, no
re-export, no save-as. The viewer cannot modify the file or what
it represents.

### A6. ASSESS consumes export_version 1 only

Files with `export_version !== 1` return
`reason: "wrong_export_version"` with a specific message. Forward
compatibility for `export_version: 2+` is a future stage's
responsibility; V1W-R is the floor.

### A7. ASSESS errors are visible and specific

A load failure is shown with a typed reason
(`read_failed | invalid_json | wrong_export_version | wrong_kind |
shape_mismatch`) and the underlying message. There is no silent
fallback to the empty state when a file load fails; the operator
must explicitly retry or close. Cancellation of the picker is the
one exception — it returns to the empty state silently because no
load was attempted.

### A8. ASSESS reuses FindingsPanel and RunSummaryStrip under the shared display contract

The viewer consumes `FindingsPanel` and `RunSummaryStrip` from the
intake module per `docs/architecture/FINDINGS_DISPLAY_CONTRACT.md`.
`RunSummaryStrip` receives `mode="viewer"`, which suppresses all
action buttons (Analyse, Re-run, Copy/Save JSON/Markdown,
ExportStatusView). The wire-type adapter
(`BatchRunExportValidationReport` → `ValidationReport`) lives in
`src/modes/assess/displayAdapter.ts` per F6; it is pure,
deterministic, and contract-driven (raw excerpts are null-filled
because the V1R export omits them).

The V1W-R synthetic-`BatchRun` adapter is retired by V1Y. ASSESS
no longer constructs a synthetic `BatchRun`; it passes a
`FindingsDisplaySummary` projection of the loaded artifact via
`exportAsDisplaySummary`.

A future change to either component's props must coordinate via
this contract and `FINDINGS_DISPLAY_CONTRACT.md`.

---

## Out of scope (parked)

- Multi-assessment compare / switch view.
- Assessment Engine, AssessmentRun, AssessmentReport.
- Top-bar status indicator.
- HOME mode (deferred — see decision 0004).
- Mode-rail keyboard shortcuts.
- URL routing / deep-linking.
- Re-export / save-as.

---

## V1X — operator triage layer (extends V1W-R)

V1X upgrades ASSESS from "viewer" to "operator triage surface"
without changing the underlying contract. The loaded artifact is
still the V1R `BatchRunExport` JSON; ASSESS still produces no new
artifacts and still does not persist anything. V1X adds view-only
affordances: search, severity-chip filters, rule-id chip filters,
per-device collapse/expand, and a by-device / by-severity view
toggle.

The following clauses bind V1X. They extend (do not relax) A1–A8.

### X1. Triage is view-only

Filtering, grouping, and collapse/expand state live in component
state. They never persist (no `localStorage`, no `sessionStorage`,
no `IndexedDB`, no URL query params, no cookies). Refreshing the
app, switching modes, or closing the assessment clears all triage
state — A4 still binds.

### X2. The loaded artifact is immutable

Triage helpers in `src/modes/assess/triage.ts` consume the loaded
`BatchRunExport` as read-only input. They must not mutate any
field of the artifact or any nested object. Tests assert this via
`JSON.stringify` round-trip equivalence.

### X3. Counts flow through tested pure helpers

Every chip count, every visible-device count, and every visible-
finding count derives from a helper in `triage.ts` that has unit
tests. JSX must not introduce ad-hoc `.filter`/`.reduce`
expressions to compute displayed numbers. Whole-artifact totals
shown by `RunSummaryStrip` continue to come from
`artifact.summary.*` directly (A2 unchanged).

### X4. Filtering hides rows; it never transforms

Visible findings are a subset (by identity) of the artifact's
findings. The helper returns the same `BatchRunExportFinding`
references the artifact already held. No re-keying, no rule-id
rewrites, no severity recolouring, no recommendation rewrites,
no synthetic merged rows.

### X5. By-severity view is a regrouping, not a new assessment

The by-severity view re-windows the same visible-findings list
into severity buckets via `groupBySeverity(visible)`. Severities
appear in canonical order (critical, high, medium, low, info);
buckets with zero rows are omitted. No new totals are produced;
per-bucket counts are the literal `rows.length` of each group.
"By severity" does not invent an assessment score, a verdict, or
any cross-severity narrative.

### X6. Honest empty-filter and chip vocabulary

When filters hide a device that has findings, the device is
hidden. When filters hide every device, the view shows an
explicit "No devices match the current filters." line — never a
silent empty grid. When the operator activates the `Clean` chip,
clean devices become visible per the chip's documented semantics:
a clean device has `stage_status === "complete"`, a present
`validation_report`, zero findings, and zero `skipped_rules`. The
`Skipped` chip filters to devices that have at least one
`skipped_rule` in their validation report. Search matches only
JSON-backed identity strings (hostname / slice / platform /
vendor / archive name / entry path) and finding strings
(rule_id / title); it does not parse, fuzzy-match, or stem.

### X7. INTAKE coupling does not increase in V1X

V1X reuses `FindingsPanel` and `RunSummaryStrip` exactly the way
V1W-R did (A8). It does not import additional intake internals
beyond those two display components. The adapter that reshapes
`BatchRunExportValidationReport` into `ValidationReport` now also
restricts findings to the filtered subset, but the reshape rules
are unchanged.

### X8. Triage state is component-scoped

ASSESS triage state lives inside `AssessLoadedView` (a small
discriminated-action reducer for filters + view mode, a `useState`
map for expand overrides). The reducer is pure; it never imports
the loader or the artifact panel. It is intentionally not
extracted to its own file — the surface area is small enough that
co-location is honest.

---

## V1Z — metadata + version-aware loading (extends V1W-R, X)

V1Z adds an artifact metadata header and tightens export-version
messaging. The loaded artifact is still the V1R `BatchRunExport`
JSON; ASSESS still produces no new artifacts, still does not
persist anything, and still does not migrate between export
versions. V1Z surfaces JSON-backed metadata so the operator can
answer: which file did I load, which export version, which
validator / rule-pack / parser versions, which platforms.

Clauses Z1–Z6 bind V1Z. They extend (do not relax) A1–A8 and
X1–X8.

### Z1. Metadata is JSON-backed and display-only

Every metadata row surfaced by `AssessMetadataHeader` traces to a
field on the loaded `BatchRunExport` (or to the loader-provided
filename). Helpers in `src/modes/assess/metadata.ts` derive
metadata rows and platform/parser groups; the helpers are pure
and tested for input immutability (no mutation of the artifact).

Banned in V1Z:

- inferred network state
- generated freshness, risk, or assessment scores
- mocked or seeded metadata when the artifact lacks the field
- inferring platform from filename

### Z2. Missing metadata renders honestly

When an optional metadata field is absent on the artifact (empty
version array, no platform on a device, no parser version on a
validation report), the metadata header renders the configured
`MISSING_METADATA_LABEL` ("not recorded") or an equivalent
explicit string ("parser version not recorded",
"unknown platform"). The label is centralised so the operator
sees absence consistently. Silent omission is permitted only
when the contract says the field is normally absent — and even
then must be documented here.

### Z3. ASSESS rejects unsupported export versions

`SUPPORTED_EXPORT_VERSIONS` is a frontend-local constant
exported from `src/modes/assess/metadata.ts`. The loader
(`loadBatchRunJson.ts`) consults it: a parsed `export_version`
that is not a number, or not in the list, fails with
`LoadErrorReason: "wrong_export_version"`. The operator-facing
error message names the found version, the expected version(s),
and the action ("regenerate the export from the current
Anthracite build"). No silent coercion, no best-effort
acceptance of future versions.

Adding a new value to `SUPPORTED_EXPORT_VERSIONS` is an explicit
V1-arc decision that requires updating this clause; ASSESS does
not auto-accept higher versions.

### Z4. ASSESS does not migrate export versions

V1Z does not transform a non-supported export into a supported
one. There is no migration path. The remedy is regeneration
upstream (INTAKE produces V1R export; ASSESS consumes it).

### Z5. Version comparison is literal-only

The metadata header renders artifact-carried `validator_versions`,
`rule_pack_versions`, `parser_versions`, and `registry_versions`
verbatim. ASSESS does not call any of them "stale", "outdated",
or "current" unless a frontend-local constant exists to support
that literal comparison. At V1Z the only literal comparison is
`export_version`; the loader applies the comparison and produces
the unsupported-version error.

Validator / rule-pack / parser versions are not compared because
no reliable frontend constant exists for them. Surfacing them as
artifact metadata is honest visibility, not freshness inference.

### Z6. Metadata header is part of artifact trust

`AssessMetadataHeader` sits between the assessment page header
and the summary strip in `AssessLoadedView`. It is the
operator's first read of what they just loaded. Adding new
metadata rows requires:

- the field exists on `BatchRunExport`,
- the helper that derives the row is tested for the
  present-and-absent cases,
- this section is updated to enumerate the new row's source.
