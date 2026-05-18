# live-collection-junos-lldp-013 syntax notes

## Observed shapes
- LLDP detail
  - show lldp neighbors detail
  - Local Interface: ge-0/0/1
- Terse form
  - show lldp neighbors
  - ge-0/0/1  QFX-201  ge-0/0/48  lldp

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- local_interface
- parent_interface
- remote_system_name

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- unit normalisation is exact only
