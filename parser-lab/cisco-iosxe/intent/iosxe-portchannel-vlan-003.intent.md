# iosxe-portchannel-vlan-003.intent

## What this fixture is for

This fixture covers a port-channel trunk, its member interfaces, and a
management SVI in the same config.

## Devices and interfaces to extract

- The device hostname.
- `Port-channel10` as the logical aggregation interface.
- Member interfaces `GigabitEthernet1/0/1`, `GigabitEthernet1/0/2`, and
  `GigabitEthernet1/0/3`.
- `Vlan999` as an SVI.

## Likely DeviceModel areas touched

- `identity`
- `interfaces`
- `vlans`
- `lag_groups`
- `parse_confidence`

## In scope for a future parser stage

- Port-channel membership via `channel-group`.
- Trunk mode on the logical aggregation interface.
- Allowed VLAN list and native VLAN.
- SVI extraction.
- Interface descriptions and admin state.

## Out of scope for this parser stage

- STP algorithm semantics.
- EtherChannel negotiation semantics.
- VLAN database persistence rules.
- Routing protocols.
- NAT.
- ACL behavior.

## Ambiguity notes

- The channel-group is declared on the member ports, not on the
  Port-channel itself.
- The trunk VLAN list may later need canonical ordering and range
  normalization, but this batch only prepares source material.
- The SVI uses a documentation-range IPv4 address and is meant as a
  management record, not as a live-state signal.

## Expected parser risks

- Member-to-bundle association can be misread if the parser assumes the
  logical Port-channel line alone is sufficient.
- VLAN list parsing should not assume comma-only or range-only inputs.
- The shutdown member exists to make the admin-state handling explicit.

