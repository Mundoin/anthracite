# live-collection-eos-lldp-cdp-012 syntax notes

## Observed shapes
- LLDP detail
  - show lldp neighbors detail
  - Port: Ethernet3
- CDP conservative note
  - show cdp neighbors detail
  - Device ID: EDGE-01

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- local_interface
- remote_system_name
- remote_port_id

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- CDP stays conservative
