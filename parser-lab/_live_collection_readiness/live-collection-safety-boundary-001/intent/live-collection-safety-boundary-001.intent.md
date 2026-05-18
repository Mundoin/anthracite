# live-collection-safety-boundary-001 intent

This pack prepares OCC for live collection safety boundary in V1AT.
It stays prep-only, synthetic, and sanitised.

## Pack focus
- Define the hard boundary between prep-only readiness and future live SSH/device contact.

## Safe fields
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- review_required
- stored_after_review

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- live SSH credentials remain future-only

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
- review_not_completed

## Safety boundary policy
- OCC may later use this section to keep live collection safety boundary read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.

## Operator gate flow
- OCC may later use this section to keep live collection safety boundary read-only and review-gated.
- Safe fields: command_allowlist, operator_initiated, dry_run_preview, raw_output.
- Conservative behaviour: connection_failed, auth_failed, timeout, command_unsupported stay as no-op or reject outcomes.
