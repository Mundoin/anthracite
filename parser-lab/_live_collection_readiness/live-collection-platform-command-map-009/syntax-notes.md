# live-collection-platform-command-map-009 syntax notes

## Observed shapes
- Command map
  - IOS-XE -> show lldp neighbors detail, show cdp neighbors detail
  - NX-OS -> show lldp neighbors detail, show cdp neighbors detail
- Preview rule
  - unknown_platform: defer
  - no_store_mutation: true

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- platform
- allowed_command_map

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- map completeness is future OCC work
