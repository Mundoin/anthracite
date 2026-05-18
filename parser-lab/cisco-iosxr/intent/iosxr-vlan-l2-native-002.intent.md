# iosxr-vlan-l2-native-002.intent

## What this fixture is for

This fixture focuses on IOS-XR L2 subinterfaces, native VLAN handling,
and a BVI-style routed bridge endpoint.

## Devices and interfaces to extract

- The device hostname.
- `GigabitEthernet0/0/0/2`.
- `GigabitEthernet0/0/0/2.100`.
- `GigabitEthernet0/0/0/2.200`.
- `GigabitEthernet0/0/0/3`.
- `BVI100`.
- Static routes.

## Likely parser surface areas touched

- interfaces
- L2 subinterfaces
- bridge-domain style metadata
- static routes
- note-only policy/security markers

## In scope for a future parser stage

- Subinterface naming and dot1q encapsulation.
- Native VLAN on a subinterface.
- Routed interface extraction.
- BVI extraction.
- Static route extraction.

## Out of scope for this parser stage

- ACL semantics.
- NAT behavior.
- QoS behavior.
- AAA behavior.
- Security-policy semantics.
- Routing protocol semantics.

## Ambiguity notes

- The l2transport subinterfaces are intentionally paired with a BVI so
  the corpus can exercise both L2 and routed termination in one pack.
- The `rewrite ingress` line is a useful parser-risk marker, not a stage
  boundary by itself.

## Expected parser risks

- Native VLAN and tagged VLAN forms can be easy to over-normalize.
- The parser should not invent a generic bridge model from this prep
  material alone.

