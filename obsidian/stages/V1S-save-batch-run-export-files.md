# V1S — Save Batch Run Export to Files

Status: complete.

V1S adds save-to-file actions for the existing V1R BatchRun export
projections. The operator can now export terminal BatchRun results as:

- `anthracite-batch-run.json`
- `anthracite-batch-run.md`

This is not an AssessmentReport. This is not ASSESS mode. This is not an
evidence pack. This is not persistence/history. This is file save only.

## What Landed

- `Save JSON` and `Save Markdown` buttons beside the existing Copy actions
  in `RunSummaryStrip`.
- Save actions gated to terminal `BatchRun` only (`complete`,
  `complete_with_failures`).
- `saveToFile` helper using the browser File System Access API
  (`showSaveFilePicker`). Zero new dependencies. Zero Rust churn. Zero
  capability changes.
- Three save outcomes:
  - `saved JSON` / `saved Markdown` — success.
  - `failed JSON: <message>` / `failed Markdown: <message>` — write
    failure.
  - Silent cancel — user dismisses the file picker, no error shown.
- Save action reuses existing V1R export builders exactly. No re-parse,
  no re-validate, no mutation of `BatchRun`.
- Default suggested filenames: `anthracite-batch-run.json`,
  `anthracite-batch-run.md`.

## Save Mechanism

Uses `window.showSaveFilePicker` (File System Access API), available in
Tauri v2 webview2 on Windows. The helper:

1. Opens a native save-file dialog with suggested name and MIME type.
2. User picks a location or cancels.
3. On confirm: creates a writable file stream, writes the export text,
   closes.
4. Cancellation is detected via `AbortError` and returns silently.
5. Any other failure (dialog error, write error) returns a structured
   error with message.

No Tauri plugins added. No Rust commands added. The existing
`capabilities/default.json` is unchanged.

## Determinism Preserved

- V1R export builders are the single source of truth.
- JSON: 2-space indent, one trailing newline, deterministic field order.
- Markdown: stable human-readable projection.
- No timestamps, run IDs, UUIDs, `exported_at`, `created_at`, `Date.now`,
  epoch, randomness, or hidden nondeterminism.
- Raw config text omitted by default.
- Full `DeviceModel` omitted.
- Detection evidence preview omitted.
- Validator `raw_excerpt` omitted.

## Non-Goals

- no PDF
- no zip evidence pack
- no cloud/upload/share/email
- no persistence/history database
- no AssessmentReport
- no ASSESS mode vocabulary
- no schema redesign
- no parser/model/receipt/validator/splitter/archive engine changes
- no BatchRun orchestration changes
- no `deriveBatchRunSummary` changes
- no new Tauri plugins or Rust commands

## Files Changed

- `src/modes/intake/export/saveFile.ts` — new save-to-file helper.
- `src/types/fileSystemAccess.d.ts` — ambient types for File System
  Access API.
- `src/modes/intake/components/RunSummaryStrip.tsx` — added
  `onSaveJson`/`onSaveMarkdown` props, Save buttons, `saved` status
  kind.
- `src/modes/intake/components/BatchSummaryView.tsx` — pass-through
  save handlers.
- `src/modes/intake/IntakePanel.tsx` — wired save callbacks.
- `src/modes/intake/__tests__/BatchRunExportActions.test.tsx` —
  6 new save action tests.
- `src/modes/intake/export/__tests__/saveFile.test.ts` — 6 new saveFile
  unit tests.

## Validation

- `pnpm typecheck`: passed.
- `pnpm build`: passed.
- `pnpm test`: passed, `28` files / `204` tests.
- `cargo check --manifest-path src-tauri/Cargo.toml --lib`: passed (no
  Rust changes).
- `tools/ops-readiness.ps1`: `READY`.
