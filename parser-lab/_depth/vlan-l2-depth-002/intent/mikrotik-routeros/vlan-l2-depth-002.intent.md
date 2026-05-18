# mikrotik-routeros vlan-l2-depth-002 intent

## Extraction expectations

- Bridge VLAN filtering.
- Trunk and access bridge ports.
- PVID on access port.
- VLAN interface `vlan99`.

## Conservative areas

- The bridge is still a metadata container here.
- Do not infer firewall or routing behavior from VLAN filtering.

