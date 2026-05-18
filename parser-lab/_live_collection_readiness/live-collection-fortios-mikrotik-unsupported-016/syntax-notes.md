# live-collection-fortios-mikrotik-unsupported-016 syntax notes

## Observed shapes
- FortiOS
  - unsupported_platform: FortiOS
  - status: unsupported
- MikroTik
  - lower_confidence_source: MikroTik neighbor discovery
  - status: report_only

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- unsupported_platform
- lower_confidence_source

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- vendor discovery output is not direct LLDP/CDP truth
