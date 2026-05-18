# live-collection-command-allowlist-003 intent

This pack prepares OCC for command allowlist in V1AT.
It stays prep-only, synthetic, and sanitised.

## Pack focus
- Prepare a bounded allowlist for future live collection without executing anything now.

## Safe fields
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- platform
- allowed_commands

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- allowlist completeness is a future OCC concern

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
- allowlist_missing

## Platform allowlist
- OCC may later use this section to keep command allowlist read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.

## Dry-run preview
- OCC may later use this section to keep command allowlist read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.
