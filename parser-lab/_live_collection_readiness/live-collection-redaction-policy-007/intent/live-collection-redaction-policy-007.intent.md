# live-collection-redaction-policy-007 intent

This pack prepares OCC for redaction policy in V1AT.
It stays prep-only, synthetic, and sanitised.

## Pack focus
- Keep sensitive lines out of stored notes while preserving the raw output path.

## Safe fields
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- redacted_line
- raw_line_hash

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- secret material is redacted, not interpreted

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
- redaction_missing

## Redaction examples
- OCC may later use this section to keep redaction policy read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.

## Raw handoff
- OCC may later use this section to keep redaction policy read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.
