# live-collection-evidence-store-write-policy-018 intent

This pack prepares OCC for evidence store write policy in V1AT.
It stays prep-only, synthetic, and sanitised.

## Pack focus
- Define when live-collection evidence may enter the managed store.

## Safe fields
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

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- write policy is store-owned truth

## Rejection reasons
- connection_failed
- auth_failed
- timeout
- command_unsupported
- unsupported_platform
- deferred_platform
- malformed_output
- empty_output
- no_store_mutation
- store_write_blocked

## Write policy
- OCC may later use this section to keep evidence store write policy read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.

## Summary note
- OCC may later use this section to keep evidence store write policy read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.
