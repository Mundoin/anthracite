# huawei-vrp interface-depth-001 intent

## Extraction expectations

- `sysname vrp-intf-001`.
- `Loopback0` as a routed identity point.
- `GigabitEthernet0/0/1` as the WAN uplink.
- `GigabitEthernet0/0/2` as an explicitly shut port.

## Conservative areas

- `undo shutdown` should normalize to enabled state, but the raw syntax
  should be preserved.
- Do not infer VLAN or security structures from this snippet.

## OCC note

Use only for interface-basics prep.

