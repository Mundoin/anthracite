# live-collection-session-lifecycle-005 intent

This pack prepares OCC for session lifecycle in V1AT.
It stays prep-only, synthetic, and sanitised.

## Pack focus
- Describe the safe lifecycle for a future device session from open to close.

## Safe fields
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- session_state
- timeout_seconds

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- socket lifecycle is future implementation detail

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
- session_closed

## Lifecycle states
- OCC may later use this section to keep session lifecycle read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.

## Close behaviour
- OCC may later use this section to keep session lifecycle read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.
