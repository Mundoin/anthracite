# live-collection-iosxe-lldp-cdp-010 syntax notes

## Observed shapes
- LLDP detail
  - show lldp neighbors detail
  - Local Intf: GigabitEthernet1/0/1
- CDP detail
  - show cdp neighbors detail
  - Device ID: AP-01

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
- capability hints stay evidence-only
