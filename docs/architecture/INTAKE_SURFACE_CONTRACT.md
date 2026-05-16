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

## Follow-ups owned by later stages

- **V1O-A** — multi-device intake, batch detection + parse, per-device
  receipt rollup. Defines how a multi-config text or archive is split,
  per-device evidence isolation, and how the rollup composes.
- **V1O-B (tentative)** — receipt export (JSON / Markdown), copy-out for
  evidence packs. Out of V1O scope.
- **V1P** — first real Cortex consumption of `DeviceModel` for analysis.
  Defines how INTAKE feeds Cortex (handoff shape, not display).
