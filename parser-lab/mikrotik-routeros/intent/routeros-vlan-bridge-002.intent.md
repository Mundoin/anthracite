# routeros-vlan-bridge-002.intent

## What this fixture is for

This fixture focuses on RouterOS bridge VLAN filtering, access/trunk
membership, and a routed edge on the trunk link.

## Devices and interfaces to extract

- The device identity.
- Bridge `br-core`.
- Ethernet interfaces `trunk1`, `access1`, and `access2`.
- VLAN interface `vlan30`.
- Static routes.

## Likely parser surface areas touched

- identity
- interfaces
- VLAN / bridge metadata
- static routes
- management-plane hints

## In scope for a future parser stage

- VLAN filtering on a bridge.
- PVID on access ports.
- Tagged and untagged bridge membership.
- VLAN interface extraction.
- Static route extraction.

## Out of scope for this parser stage

- Firewall semantics.
- NAT behavior.
- QoS behavior.
- AAA behavior.
- Routing protocol semantics.

## Ambiguity notes

- `bridge vlan` entries can list the bridge itself as a tagged member.
- The trunk port is routed for IPv4 at the same time as it participates
  in bridge VLAN filtering.

## Expected parser risks

- RouterOS can blur the line between bridge and routed interfaces.
- VLAN membership should not be inferred from IP addressing alone.

