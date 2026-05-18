# iosxr-note-rich-003.intent

## What this fixture is for

This fixture rounds out the IOS-XR baseline with another routed edge,
management-plane hints, and explicit note-only policy/security markers.

## Devices and interfaces to extract

- The device hostname.
- `Loopback0`.
- `TenGigE0/0/0/0`.
- `TenGigE0/0/0/1`.
- Static routes.

## Likely parser surface areas touched

- identity
- interfaces
- static routes
- management-plane hints
- note-only policy/security markers

## In scope for a future parser stage

- Loopback and routed interface extraction.
- Basic static routes.
- SSH, NETCONF, SNMP, NTP, and logging hints.

## Out of scope for this parser stage

- ACL semantics.
- NAT behavior.
- QoS behavior.
- AAA behavior.
- Routing protocol semantics.
- Security-policy semantics.

## Ambiguity notes

- One routed interface is shut down, which should remain visible in the
  parser output.
- The note-only markers are intentionally synthetic and should stay out
  of the first parser pass.

## Expected parser risks

- Management-plane lines can be mistaken for separate services if the
  parser over-segments the config.
- Comment-only markers should not generate structured policy objects.

