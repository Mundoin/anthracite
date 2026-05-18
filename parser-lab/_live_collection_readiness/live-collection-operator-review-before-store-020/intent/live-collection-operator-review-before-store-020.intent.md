# live-collection-operator-review-before-store-020 intent

This pack prepares OCC for operator review before store in V1AT.
It stays prep-only, synthetic, and sanitised.

## Pack focus
- Make review the hard gate before anything from live collection is stored.

## Safe fields
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

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- operator notes are not the topology truth

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
- review_rejected

## Review queue
- OCC may later use this section to keep operator review before store read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.

## Approval outcome
- OCC may later use this section to keep operator review before store read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.
