# live-collection-iosxr-lldp-014 syntax notes

## Observed shapes
- LLDP detail
  - show lldp neighbors detail
  - Local Interface: Gi0/0/0/1
- Brief form
  - show lldp neighbors
  - Gi0/0/0/1  XR-EDGE-01  Gi0/0/0/48

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- local_interface
- remote_port_id
- remote_system_name

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- brief output stays evidence-only
