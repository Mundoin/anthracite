# live-collection-command-allowlist-003 syntax notes

## Observed shapes
- Platform allowlist
  - platform: IOS-XE
  - allowed_commands:
- Dry-run preview
  - dry_run: true
  - collect_raw_output: false

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- platform
- allowed_commands

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- allowlist completeness is a future OCC concern
