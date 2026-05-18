# cisco-iosxe interface-depth-001 intent

## Extraction expectations

- Hostname `xe-intf-001`.
- `Loopback0` with IPv4 and IPv6 loopback addresses.
- `GigabitEthernet0/0/0` as a routed uplink.
- `GigabitEthernet0/0/1` as an explicitly shut port.

## Conservative areas

- `ip ssh version 2` and SNMP community lines are management hints only.
- Do not infer VLAN or routing-policy structures from this snippet.

## OCC note

Use this as interface-basics coverage only.

