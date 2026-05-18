# huawei-vrp-system-l2-001.intent

## What this fixture is for

This fixture establishes the Huawei VRP baseline shape for system
identity, interface basics, VLANs, SVIs, trunk/access L2, and static
routes.

## Devices and interfaces to extract

- The device hostname from `sysname`.
- Physical interfaces `GigabitEthernet0/0/1`, `0/0/2`, and `0/0/3`.
- `Vlanif10`, `Vlanif20`, and `Vlanif99`.
- VLAN batch membership.
- Static routes.

## Likely DeviceModel areas touched

- `identity`
- `interfaces`
- `vlans`
- `static_routes`
- `unknown_lines`
- `parse_confidence`

## In scope for a future parser stage

- Hostname and system identity.
- Interface names, descriptions, and admin state.
- Access and trunk port metadata.
- VLAN interface extraction.
- Static route extraction.

## Out of scope for this parser stage

- ACL semantics.
- NAT behavior.
- QoS behavior.
- AAA behavior.
- VPN behavior.
- Live state.

## Ambiguity notes

- VRP uses `undo shutdown` as the explicit up state.
- `port trunk allow-pass vlan` can mix single VLANs and ranges.
- `stp edged-port enable` is a useful metadata line but not STP
  computation.

## Expected parser risks

- Huawei VRP can use both `VlanifN` and subinterface patterns in the
  wider family, so the parser should not overfit to one topology form.
- The parser should preserve the difference between an access port and a
  trunk port rather than trying to infer one from VLAN references.

