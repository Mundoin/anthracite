# live-collection-huawei-nokia-deferred-015 syntax notes

## Observed shapes
- Huawei VRP note
  - deferred_platform: Huawei VRP
  - illustrative_syntax: display lldp neighbor-information verbose
- Nokia SR OS note
  - deferred_platform: Nokia SR OS
  - illustrative_syntax: show system lldp neighbor

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- deferred_platform
- illustrative_syntax

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- vendor syntax stays illustrative until verified
