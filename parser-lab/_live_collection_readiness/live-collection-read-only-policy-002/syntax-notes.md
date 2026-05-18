# live-collection-read-only-policy-002 syntax notes

## Observed shapes
- Read-only policy
  - read_only: true
  - operator_confirmation: required
- Command example
  - show lldp neighbors detail
  - show cdp neighbors detail

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- read_only
- operator_confirmation

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- execution order is operator-controlled
