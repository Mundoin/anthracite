# live-collection-nxos-lldp-cdp-011 syntax notes

## Observed shapes
- LLDP detail
  - show lldp neighbors detail
  - Local Port: Ethernet1/1
- CDP detail
  - show cdp neighbors detail
  - Device ID: DIST-CORE-01

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
- remote_chassis_id

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- capabilities and platform strings are notes only
