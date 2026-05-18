# live-collection-audit-summary-022 syntax notes

## Observed shapes
- Audit counts
  - parsed: 4
  - accepted: 3
- History note
  - source_label: operator-run-001
  - imported_at: synthetic

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- imported_at
- history_summary
- source_label

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- audit detail stays read-only
