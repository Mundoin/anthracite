# live-collection-evidence-store-write-policy-018 syntax notes

## Observed shapes
- Write policy
  - evidence_store: managed
  - write_mode: after_review_only
- Summary note
  - accepted: stored_after_review
  - rejected: retained_in_history

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- evidence_store
- accepted_count
- rejected_count

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- write policy is store-owned truth
