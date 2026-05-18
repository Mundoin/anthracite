# live-collection-dry-run-preview-021 syntax notes

## Observed shapes
- Preview result
  - dry_run: true
  - expected_delta: parsed=2 accepted=2 rejected=0
- Operator decision
  - review_required: true
  - action: proceed_or_cancel

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- dry_run
- preview_before_store
- expected_delta

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- preview is not evidence
