# mikrotik-routeros interface-depth-001 intent

## Extraction expectations

- `/system identity set name=ros-intf-001`.
- Interface renames for `wan1` and `lan1`.
- Bridge `bridge-lan`.
- IPv4 addressing on routed interfaces.

## Conservative areas

- Bridge creation is metadata here, not a VLAN-depth feature.
- SSH and SNMP are management hints only.

## OCC note

Keep RouterOS bridge and interface records separate.

