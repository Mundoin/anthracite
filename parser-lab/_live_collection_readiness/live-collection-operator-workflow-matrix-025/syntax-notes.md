# live-collection-operator-workflow-matrix-025 syntax notes

## Observed shapes
- Workflow steps
  - 1. select device
  - 2. choose command allowlist
- Workflow result
  - workflow_state: review_complete
  - store_action: approved

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- workflow_step
- workflow_state

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- workflow labels are not evidence
