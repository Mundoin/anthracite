# live-collection-iosxe-lldp-cdp-010 intent

This pack prepares OCC for ios-xe lldp/cdp live output in V1AT.
It stays prep-only, synthetic, and sanitised.

## Pack focus
- Show truthful-style IOS-XE LLDP and CDP output for later raw import.

## Safe fields
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- local_interface
- remote_system_name
- remote_port_id

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- capability hints stay evidence-only

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
- conflicting_remote_endpoint

## LLDP detail
- OCC may later use this section to keep ios-xe lldp/cdp live output read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.

## CDP detail
- OCC may later use this section to keep ios-xe lldp/cdp live output read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.
