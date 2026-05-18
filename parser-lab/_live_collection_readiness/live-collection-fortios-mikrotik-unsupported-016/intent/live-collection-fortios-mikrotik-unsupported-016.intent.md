# live-collection-fortios-mikrotik-unsupported-016 intent

This pack prepares OCC for fortios / mikrotik unsupported in V1AT.
It stays prep-only, synthetic, and sanitised.

## Pack focus
- Keep FortiOS and MikroTik as unsupported or lower-confidence sources until a truthful live map exists.

## Safe fields
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- unsupported_platform
- lower_confidence_source

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- vendor discovery output is not direct LLDP/CDP truth

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
- unsupported_platform
- lower_confidence_source

## FortiOS
- OCC may later use this section to keep fortios / mikrotik unsupported read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.

## MikroTik
- OCC may later use this section to keep fortios / mikrotik unsupported read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.
