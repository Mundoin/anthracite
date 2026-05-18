# live-collection-nxos-lldp-cdp-011 intent

This pack prepares OCC for nx-os lldp/cdp live output in V1AT.
It stays prep-only, synthetic, and sanitised.

## Pack focus
- Show truthful-style NX-OS LLDP and CDP output for later raw import.

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
- remote_chassis_id

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- capabilities and platform strings are notes only

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
- duplicate_collapsed

## LLDP detail
- OCC may later use this section to keep nx-os lldp/cdp live output read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.

## CDP detail
- OCC may later use this section to keep nx-os lldp/cdp live output read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.
