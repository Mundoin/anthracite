# live-collection-junos-lldp-013 intent

This pack prepares OCC for junos lldp live output in V1AT.
It stays prep-only, synthetic, and sanitised.

## Pack focus
- Show Junos LLDP detail for later raw import and exact resolution.

## Safe fields
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- local_interface
- parent_interface
- remote_system_name

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- unit normalisation is exact only

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
- unknown_remote_node

## LLDP detail
- OCC may later use this section to keep junos lldp live output read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.

## Terse form
- OCC may later use this section to keep junos lldp live output read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.
