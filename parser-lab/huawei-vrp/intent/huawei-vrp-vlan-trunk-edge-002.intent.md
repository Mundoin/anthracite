# huawei-vrp-vlan-trunk-edge-002.intent

## What this fixture is for

This fixture adds Huawei VRP VLAN range syntax, a routed-interface edge,
and a dot1q-style subinterface note so OCC has a wider baseline for
future parser expansion.

## Devices and interfaces to extract

- The device hostname.
- Access port `GigabitEthernet0/0/4`.
- Trunk port `GigabitEthernet0/0/5`.
- Routed interface `GigabitEthernet0/0/6`.
- Subinterface `GigabitEthernet0/0/7.100`.
- `Vlanif100` and `Vlanif210`.
- Static routes.

## Likely DeviceModel areas touched

- `identity`
- `interfaces`
- `vlans`
- `static_routes`
- `unknown_lines`
- `parse_confidence`

## In scope for a future parser stage

- VLAN range parsing.
- Routed interface handling via `undo portswitch`.
- Subinterface naming and dot1q termination.
- SVI extraction.
- Static route extraction.

## Out of scope for this parser stage

- ACLs.
- NAT.
- QoS.
- AAA.
- VPN.
- Live state.

## Ambiguity notes

- The dot1q subinterface is a syntax edge case, not a promise that the
  first parser stage must model every encapsulation detail.
- The range form `120 to 130` is intentionally included to force later
  normalization work.

## Expected parser risks

- VRP route and VLAN syntax can vary slightly by device family, so the
  parser should be tolerant about spacing and range notation.
- The `arp broadcast enable` line is a useful subinterface marker but
  should stay within the prep corpus rather than driving a schema change.

