# cisco-iosxr interface-depth-001 intent

## Extraction expectations

- Hostname `xr-intf-001`.
- `Loopback0` with dual-stack addresses.
- `GigabitEthernet0/0/0/0` as routed uplink.
- `GigabitEthernet0/0/0/1` as an explicit shutdown interface.

## Conservative areas

- SSH and NETCONF are management hints only.
- No bridge, VLAN, or routing-policy inference here.

## OCC note

Keep the scope at interface inventory depth.

