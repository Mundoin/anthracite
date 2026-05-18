# iosxe-vlan-database-004.intent

## What this fixture is for

This fixture prepares the parser for VLAN database and SVI handling in a
simple campus-style switch.

## Devices and interfaces to extract

- The device hostname.
- VLAN records 10, 20, 30, 40, and 999.
- `Vlan10`, `Vlan20`, and `Vlan30` as SVI variants.
- Access ports `GigabitEthernet0/1` and `GigabitEthernet0/2`.
- Trunk uplink `GigabitEthernet0/3`.

## Likely DeviceModel areas touched

- `identity`
- `interfaces`
- `vlans`
- `parse_confidence`

## In scope for a future parser stage

- VLAN names.
- Access VLAN tagging.
- Voice VLAN tagging.
- Trunk native VLAN.
- Trunk allowed VLAN ranges.
- SVI extraction and per-SVI admin state.

## Out of scope for this parser stage

- Spanning-tree computation.
- DHCP relay behavior.
- Routing protocols.
- NAT.
- ACL behavior.

## Ambiguity notes

- One SVI is intentionally shutdown, one is not, and one has no obvious
  shutdown line at all to test state handling.
- The trunk uses a range form (`10-40`) rather than a comma list.

## Expected parser risks

- The parser should not conflate voice VLAN with access VLAN.
- The parser should tolerate SVI variants with or without explicit
  shutdown state.
- `ip helper-address` is a useful later-stage note but not the focus of
  this batch.

