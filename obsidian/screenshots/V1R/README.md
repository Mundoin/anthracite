# V1R Screenshot Gate

Capture these manually in `pnpm tauri dev` before stage close or review-board
handoff.

## Required Captures

1. Batch run complete with `Copy JSON` and `Copy Markdown` visible.
2. Export actions visible beside `RunSummaryStrip`.
3. Copied success state after `Copy JSON` or `Copy Markdown`.
4. Failed export state if clipboard denial is easy to trigger in the runtime.
5. Markdown output sanity sample noted in the stage report.
6. JSON output sanity sample noted in the stage report.
7. `complete_with_failures` export state.
8. Archive provenance visible before export.

## Notes

- V1R uses copy-only export actions. There is no save dialog and no exported
  file path in this stage.
- JSON is deterministic and contains no timestamp.
- Markdown is a stable human-readable projection of the JSON export.
- Raw config text is omitted by default.
