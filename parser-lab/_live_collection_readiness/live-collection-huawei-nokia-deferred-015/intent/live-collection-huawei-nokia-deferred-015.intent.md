# live-collection-huawei-nokia-deferred-015 intent

This pack prepares OCC for huawei vrp / nokia sr os deferred in V1AT.
It stays prep-only, synthetic, and sanitised.

## Pack focus
- Mark Huawei VRP and Nokia SR OS live command handling as deferred until syntax is confirmed.

## Safe fields
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- deferred_platform
- illustrative_syntax

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- vendor syntax stays illustrative until verified

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
- deferred_platform
- unsupported_format

## Huawei VRP note
- OCC may later use this section to keep huawei vrp / nokia sr os deferred read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.

## Nokia SR OS note
- OCC may later use this section to keep huawei vrp / nokia sr os deferred read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.
