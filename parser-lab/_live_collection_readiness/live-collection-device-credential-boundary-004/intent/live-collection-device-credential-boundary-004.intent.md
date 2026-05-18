# live-collection-device-credential-boundary-004 intent

This pack prepares OCC for device credential boundary in V1AT.
It stays prep-only, synthetic, and sanitised.

## Pack focus
- Keep usernames, passwords, enable secrets, and session tokens out of stored evidence.

## Safe fields
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- redacted_username
- redacted_password

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- credential failure details stay in error notes only

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
- credentials_rejected

## Credential boundary
- OCC may later use this section to keep device credential boundary read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.

## Authentication failure
- OCC may later use this section to keep device credential boundary read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.
