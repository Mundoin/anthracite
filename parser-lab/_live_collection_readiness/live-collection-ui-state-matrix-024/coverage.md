# live-collection-ui-state-matrix-024 coverage

## Current coverage
- read_only only
- operator_initiated only
- command_allowlist before execution
- preview_before_store before any mutation
- raw_output preserved for V1AP handoff
- exact_resolver only; no fuzzy matching
- current_evidence preserved on failure
- unavailable state
- ready state
- collecting state
- failed state
- parsed state
- review state
- stored state

## Safe fields
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- ui_state
- ui_transition

## Note-only areas
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- UI is display-only

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
- ui_transition_blocked

## OCC readiness
- OCC may later integrate these notes into a live-collection gate, a command allowlist, raw output capture, and evidence-store write policy.
- This pack remains display-only and safety-boundary only.
