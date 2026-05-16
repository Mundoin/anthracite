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

## Follow-ups owned by later stages

- **V1O-B (tentative)** — archive intake (zip / tar) and per-device
  receipt rollup / export. Defines how an archive of configs is
  fed to the splitter and how a rollup composes.
- **V1O-B (tentative)** — receipt export (JSON / Markdown), copy-out for
  evidence packs. Out of V1O scope.
- **V1P** — first real Cortex consumption of `DeviceModel` for analysis.
  Defines how INTAKE feeds Cortex (handoff shape, not display).
