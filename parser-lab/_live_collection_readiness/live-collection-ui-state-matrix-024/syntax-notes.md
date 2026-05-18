# live-collection-ui-state-matrix-024 syntax notes

## Observed shapes
- State list
  - unavailable
  - ready
- Transition note
  - ready -> collecting
  - collecting -> parsed or failed

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- ui_state
- ui_transition

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- UI is display-only
