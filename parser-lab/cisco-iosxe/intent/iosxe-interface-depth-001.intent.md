# iosxe-interface-depth-001.intent

## What this fixture is for

This fixture is the smallest useful IOS-XE interface-depth sample. It is
meant to exercise the parser's ability to extract interface records from
mixed routed and switched syntax.

## Devices and interfaces to extract

- The device hostname.
- `Loopback0`.
- `GigabitEthernet0/0/0` as a routed physical interface.
- `GigabitEthernet0/0/1` as an access switchport.
- `GigabitEthernet0/0/2` as a trunk switchport.
- `GigabitEthernet0/0/3` as an explicit shutdown port.

## Likely DeviceModel areas touched

- `identity`
- `interfaces`
- `parse_confidence`

## In scope for a future parser stage

- Interface names and normalized names.
- Interface descriptions.
- Admin state.
- IPv4 and IPv6 address extraction.
- MTU.
- Speed and duplex.
- Access VLAN and trunk VLAN metadata.

## Out of scope for this parser stage

- Routing protocol semantics.
- ACL semantics.
- NAT.
- QoS behavior.
- STP computation.
- Live state.

## Ambiguity notes

- The loopback carries both IPv4 and IPv6 so the parser should not assume
  loopbacks are IPv4-only.
- The shutdown spare port exists so the parser can distinguish explicit
  down state from implicit default state.
- The trunk port includes a native VLAN and allowed VLAN list, but this
  fixture is still interface-depth first, not VLAN-policy first.

## Expected parser risks

- Speed and duplex may be absent on some real devices, so the parser
  should tolerate missing values.
- The description text includes punctuation; the parser should preserve
  it exactly.
- IPv6 parsing must not be coupled to IPv4 parsing success.

