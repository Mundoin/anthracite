# live-collection-operator-workflow-matrix-025 intent

This pack prepares OCC for operator workflow matrix in V1AT.
It stays prep-only, synthetic, and sanitised.

## Pack focus
- Lay out the end-to-end operator workflow from device selection to stored evidence.

## Safe fields
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- workflow_step
- workflow_state

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- workflow labels are not evidence

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
- workflow_cancelled

## Workflow steps
- OCC may later use this section to keep operator workflow matrix read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.

## Workflow result
- OCC may later use this section to keep operator workflow matrix read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.
