# iosxr-system-routed-001.intent

## What this fixture is for

This fixture establishes the IOS-XR baseline shape for system identity,
routed interfaces, management-plane hints, and static routes.

## Devices and interfaces to extract

- The device hostname.
- `Loopback0`.
- `GigabitEthernet0/0/0/0`.
- `GigabitEthernet0/0/0/1`.
- Static routes under `router static`.

## Likely parser surface areas touched

- identity
- interfaces
- static routes
- management-plane hints
- note-only policy/security markers

## In scope for a future parser stage

- Hostname and loopback extraction.
- IPv4 and IPv6 address parsing.
- Routed physical interface parsing.
- Basic static route extraction.
- SSH, NETCONF, SNMP, NTP, logging, and user hints.

## Out of scope for this parser stage

- ACL semantics.
- NAT behavior.
- QoS behavior.
- AAA behavior.
- Security-policy semantics.
- Routing protocol semantics.

## Ambiguity notes

- The loopback carries both IPv4 and IPv6.
- Management-plane syntax is present as real lines, but the baseline
  should still treat them as inventory hints rather than a full
  management-plane model.

## Expected parser risks

- IOS-XR route syntax can vary by family and VRF context.
- The parser should preserve the difference between shutdown and
  no-shutdown lines.

