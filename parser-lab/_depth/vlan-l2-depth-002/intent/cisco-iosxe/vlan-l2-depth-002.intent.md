# cisco-iosxe vlan-l2-depth-002 intent

## Extraction expectations

- VLANs 10, 20, and 99.
- `Vlan99` as a management SVI.
- Access VLAN 10 plus voice VLAN 20.
- Trunk native VLAN 99 and allowed VLAN range/list.

## Conservative areas

- STP lines are hints only.
- Do not infer L3 policy behavior from VLAN metadata.

