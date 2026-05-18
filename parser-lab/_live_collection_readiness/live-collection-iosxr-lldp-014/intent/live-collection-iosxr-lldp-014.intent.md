# live-collection-iosxr-lldp-014 intent

This pack prepares OCC for ios-xr lldp live output in V1AT.
It stays prep-only, synthetic, and sanitised.

## Pack focus
- Show IOS-XR LLDP detail and brief forms for later raw import.

## Safe fields
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- local_interface
- remote_port_id
- remote_system_name

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- brief output stays evidence-only

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
- malformed_output

## LLDP detail
- OCC may later use this section to keep ios-xr lldp live output read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.

## Brief form
- OCC may later use this section to keep ios-xr lldp live output read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.
