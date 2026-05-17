# V1R — Batch Run Export

Status: complete and pushed.

Pushed anchor: `c19baed stage-v1r: document batch run export contract`.
Remote: `origin/main`.

V1R closes the first operator evidence loop for batch intake:

```text
input -> analyse batch -> inspect evidence -> copy export
```

The exported object is the completed `BatchRun`. It is not a single
receipt and it is not an AssessmentReport. The words "assessment",
"assess", and "Assessment Engine" remain reserved for the later ASSESS
mode.

## What Landed

- Deterministic JSON export core:
  - `export_version: 1`
  - `kind: "batch_run_export"`
  - `batch_run_status`
  - `source`
  - `summary`
  - `generated_by`
  - `versions`
  - `devices[]`
  - `omitted`
- Stable Markdown projection of the deterministic export.
- Compact `Copy JSON` and `Copy Markdown` actions in the
  `RunSummaryStrip`, visible only for terminal `BatchRun` states.
- Modest feedback states:
  - `copied JSON`
  - `copied Markdown`
  - `failed JSON: <message>`
  - `failed Markdown: <message>`
- Failed and skipped devices are exported honestly as first-class
  device entries.

## Export Path

V1R is frontend-only and copy-only. The repository does not currently
include a Tauri dialog/filesystem save API or clipboard plugin. Adding
one would require dependency/capability churn, so V1R uses the WebView
clipboard surface and leaves save-to-disk for a later stage.

Runtime clipboard checks passed for both JSON and Markdown.

## Determinism

The JSON core has no timestamp, UUID, random value, run id, exported_at,
created_at, or serialized `epoch`. Object key order is explicit by
construction. Device order follows the existing `BatchRun.devices`
order. Same `BatchRun` input yields the same 2-space JSON bytes plus
one trailing newline.

Markdown is a stable projection of the JSON export. It also avoids
timestamps by default.

## Raw Config Exclusion

Raw config text is excluded by default. V1R omits:

- splitter slice `raw_text`
- full `DeviceModel`
- detection evidence `preview`
- validator evidence `raw_excerpt`

The export keeps sanitized evidence metadata: evidence kind, model path,
line range, and note. It also keeps findings, recommendations, receipt
summary, source/provenance, selected platform, detection summary, manual
override state, and per-device stage errors.

## Non-Goals

- no persistence/history
- no save dialog or filesystem write
- no cloud/upload/share/email
- no PDF
- no zip evidence pack
- no new validator rules
- no parser/model/receipt/validator/splitter/archive/detection/vendor changes
- no topology
- no ASSESS mode

## Screenshot Gate

See `obsidian/screenshots/V1R/README.md`.

## Validation

- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm test`: passed, `27` files / `192` tests.
- Requested Rust validation block: passed after rerun outside the sandbox
  offline restriction.
- `tools/ops-readiness.ps1`: `READY`.
