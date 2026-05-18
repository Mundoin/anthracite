# live-collection-append-merge-interaction-019 intent

This pack prepares OCC for append and merge interaction in V1AT.
It stays prep-only, synthetic, and sanitised.

## Pack focus
- Describe how append and merge interact once live evidence starts arriving.

## Safe fields
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- append
- merge
- duplicate_collapsed
- conflicting_remote_endpoint

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- replace remains explicit and operator-controlled

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
- conflicting_remote_endpoint

## Append
- OCC may later use this section to keep append and merge interaction read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.

## Merge
- OCC may later use this section to keep append and merge interaction read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.
