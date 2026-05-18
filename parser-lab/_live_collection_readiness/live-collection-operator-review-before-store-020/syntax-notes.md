# live-collection-operator-review-before-store-020 syntax notes

## Observed shapes
- Review queue
  - review_required: true
  - selected_edge: pending
- Approval outcome
  - approval_state: accepted
  - stored_after_review: true

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- selected_edge
- review_status
- approval_state

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- operator notes are not the topology truth
