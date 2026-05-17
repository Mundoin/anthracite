# Intake Surface Contract (V1O)

Status: **Locked at V1O**. This document binds the operator-facing INTAKE
surface to the existing Rust engine contract. Any change to the rules below
requires its own revision stage.

Pair docs:
- `docs/architecture/PARSER_CONTRACT_INVARIANTS.md` — parser-side truth.
- `docs/architecture/ENGINE_PIPELINE_CONTRACT.md` — pipeline boundaries.
- `docs/architecture/MOTOR_ROOM_ARCHITECTURE_RULES.md` — layering rules.

---

## Scope

V1O is the **first user-facing stage** after the parser motor-room run
(V1N-A). It exposes a single operator surface — the `INTAKE` mode — that
takes one config and walks it through detection, parse, and receipt
projection.

V1O is intentionally narrow:

- single config at a time
- stateless: no persistence, no history, no recents, no inventory
- one mode in the Direction-D rail
- no edits to parser / model / receipt / vendor-registry / config-detection
  engines or their Tauri commands or their wire types

Multi-device intake is **deferred to V1O-A**.

---

## Engine boundary

V1O consumes the already-shipped command surface verbatim:

| Step | API | Returns |
|------|-----|---------|
| List registered platforms | `listVendorPlatforms()` | `VendorPlatform[]` |
| Detect platform from config text | `detectConfigPlatform(configText)` | `ConfigDetectionResult` |
| Parse config under a platform | `parseDeviceConfig(platformRef, configText)` | `DeviceModel` |
| Project device into receipt | `projectDeviceReceipt(deviceModel)` | `ReceiptView` |

V1O does **not**:

- introduce new Tauri commands
- introduce new TypeScript API wrappers
- introduce new wire types
- mutate, project, score, group, filter, or invent any field on those return values

React orchestrates and displays. Rust engines remain truth.

---

## Operator flow

```
operator input (paste OR open one file)
  ↓
configText (UTF-8)
  ↓
detectConfigPlatform(configText)        ← always shown honestly
  ↓
operator confirms best_match  OR  manually overrides platform
  ↓
parseDeviceConfig(platformRef, configText)
  ↓
projectDeviceReceipt(deviceModel)
  ↓
ReceiptView displayed
```

Any error stops the current flow and surfaces in-place. The operator can
dismiss the error and retry from `input_ready`.

---

## State machine

The intake surface is a single component-local reducer with a fixed status
field. Illegal transitions are no-ops.

```
idle
  ├─ SetConfigText(non-empty)   → input_ready
  └─ FileLoaded                  → input_ready

input_ready
  ├─ SetConfigText("")           → idle
  ├─ FileLoaded                  → input_ready (replace)
  ├─ DetectStart                 → detecting
  └─ ClearAll                    → idle

detecting
  ├─ DetectSucceeded             → detected
  └─ DetectFailed                → error(stage=detect)

detected
  ├─ SelectPlatform              → detected (mark manual=true/false)
  ├─ ParseStart                  → parsing
  └─ ClearAll                    → idle

parsing
  ├─ ParseSucceeded              → parsed
  ├─ ParseFailed                 → error(stage=parse)
  └─ ReceiptFailed               → error(stage=receipt, retains device)

parsed
  ├─ SelectPlatform              → detected (re-arm)
  └─ ClearAll                    → idle

error
  ├─ DismissError                → input_ready  (text preserved)
  ├─ ClearAll                    → idle
  └─ DetectStart                 → detecting
```

`vendorPlatforms` is loaded once at mount and stored alongside the flow
state. Failure to load is non-fatal and surfaced as a banner; manual
override is the only path it affects.

---

## Input paths

Two input paths, both UTF-8 text:

1. **Paste** — `<textarea>` bound to reducer text state.
2. **File open** — browser `<input type="file">` invokes the WebView's
   native picker. `File` is decoded via `TextDecoder("utf-8", { fatal: true })`.
   Empty files and non-UTF-8 bytes are rejected with a clear error.

Acceptable extensions advertised to the picker: `.cfg .txt .conf .config`,
plus `text/plain`. The picker accepts any single text file the OS allows.

**No archive support. No directory support. No recursive scan. No
multi-file selection.** A multi-device config is not split — the user is
told this is a single-config surface and routed to V1O-A when it exists.

The file-open path uses the WebView's native dialog. V1O does **not** add
`tauri-plugin-dialog` or any other Rust/Tauri dependency. If a future stage
requires a Tauri-managed dialog (e.g. for file scoping or sandbox
permissions), it must declare that dependency in its own contract.

---

## Manual override

Manual override is in scope at V1O.

- All registered platforms are loaded once via `listVendorPlatforms()`.
- The operator can override the detected platform at any time after
  detection has completed (success or failure).
- A `MANUAL OVERRIDE` tag must be visible whenever `isManualOverride` is
  true — on the detection summary, on the parse status line, and on the
  receipt.
- Manual override **does not hide detection results.** The operator still
  sees candidates, evidence, warnings, and confidence.
- Parse uses the currently selected `PlatformRef` — manual or detected —
  passed verbatim to `parseDeviceConfig`.

`PlatformRef` for manual selection is constructed by mapping
`VendorPlatform.id → PlatformRef.platform_id` plus vendor / os_family.
`os_version_*` and `detection_confidence` are explicitly null.

---

## UI honesty rules (binding)

These rules are locked at V1O. Any future intake surface inherits them.

1. **Render what the engine returned.** No client-side projection of
   parser-derived facts. The DeviceModel is not rendered as primary UX;
   ReceiptView is the display projection.
2. **Low confidence is shown prominently.** When detection warnings
   include `low_confidence`, both the confidence value and a `LOW
   CONFIDENCE` tag are surfaced in the detection summary.
3. **Unknown lines are always shown.** Even when truncated, the
   `unknowns_truncated` flag is rendered as a visible `TRUNCATED` tag.
4. **Warnings are displayed verbatim.** Detection warnings and parser
   warnings render their raw text. No client-side grouping, no
   client-side severity bucketing.
5. **Parser version is visible.** `parser_version` is shown on the
   receipt header. `registry_version` is shown alongside.
6. **Detection candidates are visible even when a best match exists.**
   The candidates table renders all candidates with scores. A best-match
   tag marks the winner; the operator can still see the runners-up.
7. **Error path is first-class UX.** Errors render inline in the parse
   status block, not in a toast or modal alone, and include the failure
   stage (`detect | parse | receipt | file_open | vendor_list`).

---

## What V1O does **not** do

- no parser, model, receipt, detection-engine, or vendor-registry edits
- no new Rust commands or TypeScript API wrappers
- no new wire types
- no parser fixture regeneration; no `PARSER_VERSION` bumps
- no inventory, history, recent-files, saved configs
- no multi-device splitting; no archive / folder import
- no live device access
- no topology preview, no Babylon rendering wired in
- no receipt export, no PDF/JSON download, no diff vs. previous parse
- no invented warning severity; no client-side parser-derived facts
- no Python sidecar; no fourth parser

---

## Batch mode (V1O-A overlay)

V1O-A extends INTAKE with a deterministic Rust config splitter (see
[`CONFIG_SPLITTER_CONTRACT.md`](./CONFIG_SPLITTER_CONTRACT.md)) and
a multi-device batch view. The V1O single-config flow is preserved
verbatim — when the splitter returns one slice with
`SplitMethod::SingleConfig`, the UI renders the original V1O surface
with **no batch chrome**. This is a binding regression lock; see the
`SingleConfig regression lock` test in
`src/modes/intake/__tests__/IntakePanel.batch.test.tsx`.

### Flow

```
paste / open file
  ↓
operator clicks Detect
  ↓
splitConfigBatch(configText)   ← always runs first
  ├─ method = single_config (one slice)
  │    → fall through to V1O flow on the original text
  │      (no batch chrome, byte-identical to V1O)
  └─ method = explicit_separator | heuristic (≥ 2 slices)
       → BatchSummaryView
         per-slice detectConfigPlatform runs on render (R3)
         operator clicks a slice → drilled-in V1O sub-flow:
           parseDeviceConfig(platform_ref, slice.raw_text)
           projectDeviceReceipt(device_model)
           render existing ReceiptDisplay component unchanged
         "← Back to batch" returns to BatchSummaryView, state preserved
```

### Engine boundary

V1O-A introduces exactly one new typed command — `split_config_batch`
— and one new TS API wrapper — `splitConfigBatch`. The splitter
output is consumed by the existing V1J / V1K / V1L commands per slice.
No new parser, model, or receipt commands. No new wire types beyond
the splitter's own.

### Detect-all-slices, parse-selected-slice (R3)

When `BatchSummaryView` renders with one or more `pending` per-slice
detection entries, the panel kicks off `detectConfigPlatform` for
each pending slice in parallel. Each completion dispatches
`PerSliceDetectionSucceeded` / `PerSliceDetectionFailed`. Parse and
receipt projection run ONLY when the operator drills into a slice.

### Treat-as-single-config fallback (R7)

When the splitter result includes any of
`ambiguous_boundary`, `low_confidence_split`, or
`unusually_large_batch`, BatchSummaryView renders a **Treat as single
config** button. Clicking it dispatches `TreatAsSingleConfig`, which
clears the batch wrapper and routes the operator into the V1O
single-config flow with the original paste text.

### Honesty rules carry forward

V1O's seven UI honesty rules apply per-slice and at the batch level:

- splitter warnings render verbatim by `kind`
- per-slice detection state (`pending` / `detected` / `failed`)
  renders without invented severity
- per-slice low-confidence detection flags propagate
- splitter version is visible in the batch summary header
- candidates per slice are visible after drill-down (V1O contract)
- error paths (split failure, per-slice detection failure) are
  first-class UX, never hidden

### What V1O-A does NOT do

- No archive support (zip / tar / gz). V1O-A handles raw text only.
- No batch-level statistics. Aggregate facts (total interfaces,
  cross-device VLAN overlap, etc.) require a future engine — out
  of V1O-A scope per `MOTOR_ROOM_ARCHITECTURE_RULES.md`.
- No batch export, no batch persistence, no cross-session caching.
- No UI-side re-splitting or re-merging. The splitter is the
  authority; the UI consumes its output verbatim.
- No manual boundary editor / drag-to-reorder. The only operator
  override at batch boundary is "Treat as single config".
- No cross-device relationship inference. Topology is a separate,
  later stage.

## Archive mode (V1O-B overlay)

V1O-B layers archive intake onto the INTAKE surface without
introducing a new mode. An "Open archive…" button sits beside the
existing paste textarea + file-open button. Picked `.zip`, `.tar`,
`.tar.gz`, and `.tgz` files are decoded via the deterministic Rust
archive intake engine (see
[`ARCHIVE_INTAKE_CONTRACT.md`](./ARCHIVE_INTAKE_CONTRACT.md)) and
routed through the existing splitter → detect → parse → project
chain.

### Flow

```
operator clicks "Open archive…"
  ↓
file picker returns File (.zip / .tar / .tar.gz / .tgz)
  ↓
frontend reads bytes (Uint8Array) + derives kind hint from extension
  ↓
archiveIntake(bytes, kindHint)              ← V1O-B
  ↓ (per Extracted entry, sequential)
splitConfigBatch(entry.raw_text)            ← V1O-A
  ↓
if (extracted.length === 1 && split.method === "single_config")
  ↓
  → V1O single-config flow on entry.raw_text  ← R11 regression lock
       (no batch chrome, identical to paste single-config UX)
otherwise
  ↓
  → flatten slices across entries with `entry_id/slice_id` ids
    and an ArchiveEntryRef per slice
  ↓
  → BatchSummaryView with ArchiveInventoryPanel above it and
    ArchiveSourceBadge per card
```

### Byte-transport verification gate

Before any archive engine logic runs, V1O-B verifies that
`Uint8Array` survives the Tauri invoke boundary as `Vec<u8>` (Task 0
of the V1O-B prompt). Verified at command-function + Rust unit-test
level; runtime roundtrip in `pnpm tauri dev` is the recommended
sanity check pre-release. A temporary `archive_intake_echo_bytes`
command lives across implementation and is removed before release.

### Byte-based kind validation

The engine accepts an `ArchiveKind` hint from the frontend (derived
from filename extension) but independently verifies the kind by
inspecting the leading bytes. A `KindMismatch { supplied, detected }`
warning surfaces in the inventory panel header; extraction proceeds
with the detected kind, not the hint.

### Source provenance threading

Every extracted entry carries an `entry_id`, `entry_index`, and
sanitised `path`. The frontend attaches an `ArchiveEntryRef` to
every `ConfigSlice` produced from splitting that entry's content.
Each per-slice card in `BatchSummaryView` renders an
`ArchiveSourceBadge` (`from <entry_path>`). The drilled-in view
repeats the badge in the slice header. Provenance flows: archive
entry → splitter slice → device card → receipt header annotation.

`ArchiveEntryRef` is a TypeScript-only type; the Rust splitter is
not modified. Slice ids are namespaced as `<entry_id>/<slice_id>`
on the frontend so multi-entry archives don't collide on the
splitter's `slice-0` ids.

### Inventory panel

`ArchiveInventoryPanel` is **collapsed by default** (R12 of the
V1O-B prompt). Expanded view shows per-entry rows: path, size,
status, decode warning. Skipped entries de-emphasised but **never
hidden**. Header row carries archive name, detected kind, entry
count, extracted count, skipped count, and a top-line summary of
any `ArchiveWarning`s. The single-clean-archive case
(`extracted_count === 1 && warnings.length === 0`) falls through to
the V1O single-config flow with no inventory rendered at all — R11
keeps that path byte-identical to V1O.

### Regression locks

- **R11 single-archive-single-entry-single-config**: a single
  extracted entry whose split yields `SplitMethod::SingleConfig`
  routes through `ArchiveSingleConfigPassthrough` directly into the
  V1O single-config flow. The reducer test
  `intakeReducer.archive.test.ts::ArchiveSingleConfigPassthrough drops
  batch wrapper and enters detecting` plus the panel test
  `IntakePanel.archive.test.tsx::single-entry-single-config archive
  renders V1O single-config flow with NO batch chrome (R11)` lock
  the contract.
- **V1O paste path unchanged** — covered by existing
  `IntakePanel.test.tsx`.
- **V1O-A multi-config paste path unchanged** — covered by existing
  `IntakePanel.batch.test.tsx`.

### Honesty rules carry forward

V1O's seven UI honesty rules apply per-entry AND at the archive
level:

- render what the engine returned (no client-side invention of
  entry status or vendor)
- low confidence and skipped entries are visible, not hidden
- archive kind (header-detected, not extension) shown in inventory
- archive warnings rendered verbatim by `kind`
- decode failures, skipped entries, capped entries all surface in
  the inventory panel
- splitter and archive_intake versions visible in inventory header
- error path (`batchStatus === "archive_error"`) renders as a
  first-class `intake-error` banner, not a silent failure

### What V1O-B does NOT do

See [`ARCHIVE_INTAKE_CONTRACT.md`](./ARCHIVE_INTAKE_CONTRACT.md)
§"What V1O-B does NOT do" for the complete exclusion list. Headline:
no nested-archive recursion, no symlink resolution, no password
handling, no archive creation / export, no filesystem writes, no
parser / splitter / model / receipt changes.

## Findings panel (V1P overlay)

V1P adds a `FindingsPanel` to the single-device intake and the
drilled-in slice views. It renders ABOVE `ReceiptDisplay`.

### Flow

```
successful receipt projection (status === "parsed")
  ↓
useEffect detects (status === "parsed" && validationStatus === "idle")
  ↓
dispatch ValidatorStarted          ← validationStatus = "loading"
  ↓
validateDeviceModel(device, ctx)
  ↓
ValidatorSucceeded                 ← validationStatus = "ready"
  ↓
<FindingsPanel report={state.validationReport} />
<ReceiptDisplay ... />             ← unchanged
```

The validator call is a side effect of a successful parse. The
reducer owns the state transitions
(`ValidatorStarted` / `ValidatorSucceeded` / `ValidatorFailed`);
the panel's `useEffect` owns the async call. Mirrors the V1O-A
per-slice detection pattern.

### Render rules (binding)

- **FindingsPanel renders ABOVE `ReceiptDisplay`** in both the
  single-device view and the drilled-in slice view. Locked by
  `IntakePanel.findings.test.tsx > FindingsPanel renders ABOVE
  ReceiptDisplay in DOM order` via `compareDocumentPosition`.
- **FindingsPanel is NOT rendered in `BatchSummaryView`.** Findings
  are a per-device projection; the batch view shows splitter +
  detection state only. Drill into a slice to see its findings.
- **Loading state:** while `validationStatus === "loading"`, a
  minimal "Validating…" line renders in the FindingsPanel slot.
- **Failure state:** `validationStatus === "failed"` renders an
  `intake-error` banner with the verbatim error message.
- **Idle state:** no FindingsPanel rendered.

### Honesty rules (binding)

- Counts come from `report.findings.filter(...)` — never from
  props, never memoised.
- Severity strings render from `finding.severity` directly. No
  conditional escalation.
- No filter UI. No bulk actions. No acknowledge / dismiss.
- Clean rules and skipped rules are visible-but-collapsed via
  `<details>` in the footer; they are never hidden.
- The panel's header carries `validator vN · pack vN` so a
  staleness mismatch against the parsed `DeviceModel`'s
  `parser_version` is debuggable.

### State-machine extension

Additive (no existing case changed):

- new `validationStatus` field: `"idle" | "loading" | "ready" | "failed"`
- new `validationReport: ValidationReport | null`
- new `validationError: string | null`
- new actions: `ValidatorStarted`, `ValidatorSucceeded { report }`,
  `ValidatorFailed { error }`

The validator call is fired once per parse; re-running parse
(after edit, manual override, etc.) clears the previous report
via the existing `SetConfigText` / `FileLoaded` reset paths
(both now also reset `validationStatus` to `"idle"`).

### What V1P findings DON'T do

See
[`VALIDATOR_ENGINE_CONTRACT.md`](./VALIDATOR_ENGINE_CONTRACT.md)
§"Non-goals" — no baseline, no rank, no suppression, no export,
no Cortex, no persistence.

## Workspace layout (V1P-A overlay)

V1P-A reshapes the single-device and drilled-in INTAKE views
into a two-lane workspace. Batch summary and archive inventory
remain full-width.

### Lanes

- **Work lane** (left): operator-facing surface. Contains
  Config Input (when not drilled-in), Detection, Parse Status,
  Manual Override.
- **Answer lane** (right): engine-truth surface. Contains
  Validating banner, ValidatorFailed banner, FindingsPanel,
  ReceiptDisplay. FindingsPanel renders **above** ReceiptDisplay
  (V1P regression lock, carried into V1P-A).

### Empty state

Before a parse completes, the answer lane renders a workstation
chrome empty-state with a `RESULT` eyebrow and `(awaiting
parse)` muted body text. It does NOT collapse or hide. The lane
chrome is present at all times so the workspace always reads as
two surfaces.

### Lane-item rail contract

The 2px left-edge rail on each lane-item is owned by the V1P-A
lane-item wrapper. The wrapper paints its rail via an
absolutely-positioned `::before` at `left: 0` with `z-index: 1`,
so where existing panel components paint their own left-edge
rail (V1E-era chrome on `.intake-section__header` and
`.intake-input__header`, intake.css L54/L100/L553), the wrapper
rail takes visual precedence. Existing rules are NOT edited;
they remain in place for panels rendered outside a lane-item
context.

The lane-item wrapper carries NO border of its own — inner
panel components retain their existing hairline border, radius,
and shadow chrome. Stacking another border on the wrapper would
produce a visible double-border.

### Accent rail mapping

Each lane-item carries a 2px semantic rail using `--anth-role-*`
tokens only. Mapping (V1P-A binding):

| Lane-item        | Class                                  | Token                          | Meaning              |
|------------------|----------------------------------------|--------------------------------|----------------------|
| Config Input     | `intake-lane-item--accent-input`       | `--anth-role-input-bytes`      | Operator bytes       |
| Detection        | `intake-lane-item--accent-engine`      | `--anth-role-engine-analysis`  | Engine analysis      |
| Parse Status     | `intake-lane-item--accent-clean`       | `--anth-role-severity-clean`   | status `parsed`      |
|                  | `intake-lane-item--accent-fault`       | `--anth-role-severity-fault`   | status `error`       |
|                  | `intake-lane-item--accent-running`     | `--anth-role-status-running`   | `parsing`/`detecting`|
|                  | `intake-lane-item--accent-neutral`     | `--anth-role-neutral-chrome`   | otherwise            |
| Manual Override  | `intake-lane-item--accent-operator`    | `--anth-role-operator-choice`  | Operator decision    |
| Validating       | `intake-lane-item--accent-running`     | `--anth-role-status-running`   | Validator busy       |
| ValidatorFailed  | `intake-lane-item--accent-fault`       | `--anth-role-severity-fault`   | Validator error      |
| Findings         | `intake-lane-item--accent-fault`       | `--anth-role-severity-fault`   | any critical/high    |
|                  | `intake-lane-item--accent-warn`        | `--anth-role-severity-warn`    | any medium/low       |
|                  | `intake-lane-item--accent-clean`       | `--anth-role-severity-clean`   | zero findings        |
| Receipt          | `intake-lane-item--accent-truth`       | `--anth-role-truth-projection` | Truth projection     |

### Token discipline

Lane-item rails reference ONLY `--anth-role-*` semantic tokens,
never raw `--anth-{info,warn,err,ok,copper}` primitives. Future
stages adding new semantic roles SHALL add a new `--anth-role-*`
alias in `src/styles/tokens.css`. New hex values require a
TOKENS.md (design doctrine) decision, not a stage decision.

### Narrow-width collapse

Below ~1100px viewport (for example half-screen docking), the
workspace collapses to a single vertical stack in the V1P order:
work-lane panels followed by answer-lane panels. The collapse is
pure CSS via media query against `.intake-workspace`; no JS
layout logic. No content is hidden in any layout state.

### Regression locks (V1P-A)

- Batch summary renders full-width, no workspace.
- Archive batch summary renders full-width, no workspace.
- Drilled-in slice (batch or archive) renders workspace.
- FindingsPanel renders above ReceiptDisplay in the answer lane
  (V1P lock continuation).
- No reducer behaviour change vs V1P; transitions byte-identical.
- ArchiveSourceBadge provenance preserved in drilled-in chrome.

### Honesty rules carry forward

The seven UI honesty rules apply to V1P-A unchanged.
Specifically: no severity recomputation in React, no client-side
projection of engine facts, no hidden data, error paths
first-class. The accent rails are information scent only; they
do NOT replace or hide any existing chip, tag, or warning text.

## Follow-ups owned by later stages

- **V1O-C (tentative)** — receipt + findings export
  (JSON / Markdown), copy-out for evidence packs.
- **V1Q (tentative)** — second rule pack (vendor-aware family,
  or routing-protocol hygiene), or confidence/visibility axes
  for findings.
- **Cortex consumption of `DeviceModel`** — first analytic
  surface beyond device-local validation.
