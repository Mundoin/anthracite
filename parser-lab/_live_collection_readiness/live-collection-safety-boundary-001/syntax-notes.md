# live-collection-safety-boundary-001 syntax notes

## Observed shapes
- Safety boundary policy
  - read_only: true
  - operator_initiated: true
- Operator gate flow
  - 1. select device
  - 2. preview allowlist

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- review_required
- stored_after_review

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- live SSH credentials remain future-only
