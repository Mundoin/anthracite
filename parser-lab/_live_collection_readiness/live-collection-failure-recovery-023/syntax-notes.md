# live-collection-failure-recovery-023 syntax notes

## Observed shapes
- Failure state
  - connection_failed: true
  - auth_failed: false
- Recovery action
  - recovery_action: operator_review
  - no_store_mutation: true

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- failure_state
- recovery_action

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- recovery action stays operator-controlled
