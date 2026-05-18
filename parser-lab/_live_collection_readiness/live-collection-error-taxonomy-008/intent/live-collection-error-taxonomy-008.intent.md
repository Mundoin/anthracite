# live-collection-error-taxonomy-008 intent

This pack prepares OCC for error taxonomy in V1AT.
It stays prep-only, synthetic, and sanitised.

## Pack focus
- Define the live-collection error vocabulary while preserving existing evidence.

## Safe fields
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- error_code
- error_message

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- operator-facing error summary only

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
- error_payload_only

## Error vocabulary
- OCC may later use this section to keep error taxonomy read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.

## Failure behaviour
- OCC may later use this section to keep error taxonomy read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.
