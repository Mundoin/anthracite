# live-collection-output-to-raw-import-017 syntax notes

## Observed shapes
- Raw capture
  - collect_raw_output: true
  - redacted: false
- Handoff to V1AP
  - import_target: parser-lab/_raw_neighbor_import/
  - exact_resolver: enabled

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- raw_output
- import_target

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- parser input is the raw text, not the preview
