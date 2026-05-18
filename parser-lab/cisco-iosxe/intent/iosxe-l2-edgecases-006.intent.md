# iosxe-l2-edgecases-006.intent

## What this fixture is for

This fixture captures VLAN range parsing, description punctuation, and a
few intentionally odd L2 edges that OCC may later decide to integrate.

## Devices and interfaces to extract

- The device hostname.
- VLAN records 200, 210, and 220.
- `Vlan200`, `Vlan210`, and `Vlan220`.
- `GigabitEthernet2/0/1` through `GigabitEthernet2/0/4`.

## Likely DeviceModel areas touched

- `identity`
- `interfaces`
- `vlans`
- `parse_confidence`

## In scope for a future parser stage

- VLAN range syntax.
- Trunk native VLAN and allowed VLANs.
- SVI admin state.
- Access switchports.
- Explicit down ports.

## Out of scope for this parser stage

- CDP / LLDP neighbor inference.
- STP topology calculation.
- QoS behavior.
- Routing protocols.
- NAT.

## Ambiguity notes

- Descriptions intentionally include commas, semicolons, and slashes.
- One trunk includes `no cdp enable`, which should not be promoted to a
  topology fact in this batch.

## Expected parser risks

- The parser may need later normalization for mixed VLAN list forms.
- Optional lines should remain optional; the config should still parse if
  a later device omits them.
- Shutdown state on the access port should not be inferred from absence
  of a no-shutdown line elsewhere.

