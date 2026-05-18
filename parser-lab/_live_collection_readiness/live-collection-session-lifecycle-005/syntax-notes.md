# live-collection-session-lifecycle-005 syntax notes

## Observed shapes
- Lifecycle states
  - state: ready
  - state: collecting
- Close behaviour
  - close_session: true
  - release_resources: true

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- session_state
- timeout_seconds

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- socket lifecycle is future implementation detail
