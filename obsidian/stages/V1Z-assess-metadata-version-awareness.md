# V1Z — ASSESS metadata + version-aware loading

**Status:** complete (pending Bujar review and commit)
**Date:** 2026-05-17
**Predecessor:** V1Y — Shared findings display contract
**Successor (planned):** to-be-named
**Arc:** ASSESS-FORWARD — operator triage workspace

## Why

After V1Y, ASSESS could load a V1R BatchRun export, render the
findings honestly through the shared display contract, and let
the operator triage devices. What it could not answer: *which
artifact did I load?* The page header showed only the filename
sub-line. The summary strip showed counts. Versions, source,
parser inventory, supported-version status — none surfaced.

V1Z adds a metadata header between the page header and the
summary strip, plus a tightened loader message for unsupported
`export_version`. Both are JSON-backed; neither invents network
state, freshness, risk, or score.

The loader already rejected `export_version !== 1` (test
coverage existed). V1Z keeps the acceptance contract identical
but extracts `SUPPORTED_EXPORT_VERSIONS` as a frontend-local
constant, replaces the V1W-R-era message string with a
forward-looking one, and adds tests for the new message format
and non-numeric versions.

## What changed

### Pure helpers — `src/modes/assess/metadata.ts`

New module. Exports:

- `SUPPORTED_EXPORT_VERSIONS: ReadonlyArray<number> = [1]` —
  the single literal version comparison ASSESS performs.
- `isExportVersionSupported(v: unknown): boolean` — type-safe
  membership check.
- `describeSource(artifact)` — plain text for `paste` / `file` /
  `archive` source variants.
- `parserPlatformGroups(artifact)` — groups devices by
  `(platform_id, vendor)` and collects the distinct
  `validation_report.context.parser_version` strings per group;
  devices without `selected_platform` form a single
  "unknown-platform" bucket; preserves insertion order.
- `metadataRows(artifact, filename)` — emits the nine baseline
  metadata rows for the header. Optional version rows return
  `value: null` when the artifact's arrays are empty so the
  consumer can render "not recorded".
- `MISSING_METADATA_LABEL = "not recorded"` — centralised
  honest-absence string.

21 helper tests in `__tests__/metadata.test.ts` cover the
supported/unsupported version flag, the three source variants,
empty/single/multi-device grouping, multiple parser versions in
the same group, absent platform, absent parser version, row
labels, multi-version array formatting, and a no-mutation
guarantee.

### Component — `src/modes/assess/components/AssessMetadataHeader.tsx`

New component. Receives `artifact` + `filename` and renders:

- a "Metadata" label,
- a definition-list of the nine `metadataRows`,
- a "Platforms" list with one row per `parserPlatformGroup`
  (`<platform_id> · parser vN · M devices` or appropriate
  fallback strings for absent data).

10 component tests cover supported-version rendering, missing
optional rows, multi-version display, generated_by formatting,
the three source variants surfacing through to render, the
Platforms section's appearance, parser-version-absent fallback,
and the unknown-platform bucket.

### View — `src/modes/assess/components/AssessLoadedView.tsx`

`<AssessMetadataHeader artifact={artifact} filename={filename} />`
is wired in between the page header and the `assess-loaded__summary`
container (lines 188–190 in the V1Y layout). All V1Y / V1X
behaviour preserved: same `RunSummaryStrip mode="viewer"`, same
triage reducer, same per-device sections.

### Loader — `src/modes/assess/loadBatchRunJson.ts`

- Imports `SUPPORTED_EXPORT_VERSIONS` + `isExportVersionSupported`
  from `metadata.ts`.
- Replaces the literal `parsed.export_version !== 1` check with
  `!isExportVersionSupported(parsed.export_version)` — same
  acceptance contract, no behaviour change.
- Rewrites the `wrong_export_version` message:
  - mentions found version
  - mentions expected version(s)
  - drops the V1W-R reference
  - adds "regenerate the export from the current Anthracite
    build" guidance.

### Tests — loader

Two new tests in `loadBatchRunJson.test.ts`:

- message-format assertion (contains "found 7", "expected v1",
  matches `/regenerate the export/i`, does not contain
  "V1W-R");
- non-numeric `export_version` value is rejected with
  `wrong_export_version` (covers the type-guard branch).

Existing 12 loader tests pass byte-identical.

### CSS — `src/modes/assess/assess.css`

Added `.assess-loaded__metadata*` rules (panel + heading +
definition-list grid + missing-field italic + platforms list).
Reuses existing `--anth-*` tokens; no new tokens introduced.
Neutral steel/graphite/white tone per V1X-B discipline; no
warning colour applied even on missing values.

### Documentation

- `docs/architecture/ASSESS_SURFACE_CONTRACT.md` — extended
  with V1Z section binding clauses Z1–Z6 (metadata is
  JSON-backed and display-only, missing-metadata honesty,
  rejection of unsupported export versions, no migration,
  literal-only version comparison, metadata header is part of
  artifact trust).
- `obsidian/ANTHRACITE_INDEX.md` — V1Z row added.
- `docs/architecture/FINDINGS_DISPLAY_CONTRACT.md` — NOT
  updated (V1Z does not touch display-contract semantics; the
  metadata header is an ASSESS-only addition and the shared
  display surface is unchanged).

## Key decisions

- **Export version display format `"1 (supported)"` / `"X (unsupported)"`** —
  not `"v1"`. Avoids a literal-text collision with the
  `validator_versions: [1]` row's `"v1"` rendering and signals
  the supported/unsupported state on the same line, no second
  badge needed.
- **`SUPPORTED_EXPORT_VERSIONS` lives in `metadata.ts`**, not in
  the loader. Keeps the constant adjacent to the helpers that
  consume it; the loader imports both names. Single source.
- **No validator/rule-pack/parser version comparison.** Surfacing
  them is honest visibility (Z5). Claiming any is "current" or
  "stale" would require importing Rust constants into frontend
  or maintaining a duplicated table — neither was acceptable at
  V1Z.
- **Filename appears twice (page-header sub-line + metadata
  row).** Mild redundancy preserved deliberately to avoid
  changing the V1W-R page-header convention; two existing tests
  updated to scope their filename assertion (`getAllByText
  length >= 1`).
- **Platform grouping uses `(platform_id, vendor)` key**, not
  just `platform_id`. Lets a device with `vendor` but no
  `platform_id` (rare but possible per the wire type) get a
  meaningful bucket label.

## Parked follow-ups

- **Hierarchy seed-data honesty gap** — real, separate issue.
  Belongs to a post-ASSESS-FORWARD-arc planning stage. V1Z does
  not address it.
- **Validator/rule-pack version freshness comparison** — would
  need a frontend-local "current" constant table maintained
  alongside Rust truth. Out of scope.
- **`omitted` block visibility** — could surface as a
  small transparency note ("raw config omitted by default", etc.)
  in a future stage; intentionally not added at V1Z to keep the
  metadata header compact.
- **Timestamp metadata** — V1R `omitted.timestamps:
  "omitted_for_determinism"` deliberately excludes timestamps;
  V1Z does not invent one. If a future export version carries
  generation timestamp, add a row then.
- **Multi-artifact compare/switch** — still parked.
- **HOME mode IA** — still deferred per decision 0004.

## Gate results

| Gate | Result |
|------|--------|
| `pnpm typecheck` | 0 errors |
| `pnpm test` | 359 / 359 (325 baseline + 34 new) |
| `pnpm build` | (see report) |
| `cargo check --lib` | unchanged (no `src-tauri/` edits) |
| `cargo test` | skipped (no `src-tauri/` edits) |
| `tools/ops-readiness.ps1` | (see report) |
| Forbidden-vocab grep | (see report) |
| Shell / D1 / D2 / App.tsx / Rust / package.json diffs | empty |

Test-count note: +34 new tests (21 helper, 10 component, 3
loader assertions) is slightly above the prompt's 8–14
estimate. The over-shoot is concentrated in helper coverage
(parser/platform grouping has six combinatoric cases) and is
honest depth, not test bloat.

## Pointers

- `docs/architecture/ASSESS_SURFACE_CONTRACT.md` — V1Z clauses Z1–Z6.
- `src/modes/assess/metadata.ts` — pure helpers + constant.
- `src/modes/assess/components/AssessMetadataHeader.tsx` —
  display component.
- `src/modes/assess/loadBatchRunJson.ts` — loader with V1Z
  message + constant.
- `obsidian/stages/V1Y-shared-display-contract.md` — predecessor.
- `obsidian/stages/V1X-assess-triage-v1.md` — triage that V1Z
  preserves unchanged.
