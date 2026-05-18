# sros-note-rich-003.intent

## What this fixture is for

This fixture rounds out the SR OS baseline with another routed edge,
management-plane hints, and explicit note-only policy/security markers.

## Devices and interfaces to extract

- The system name.
- `port 1/1/4`.
- Router Base interfaces `lo0` and `core`.
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
- SSH, SNMP, and NTP hints.

## Out of scope for this parser stage

- ACL semantics.
- NAT behavior.
- QoS behavior.
- AAA behavior.
- Routing protocol semantics.
- Security-policy semantics.

## Ambiguity notes

- The note-only markers are comments and should stay out of the first
  parser pass.
- The routed `core` interface gives this fixture a second non-loopback
  routed shape.

## Expected parser risks

- Management-plane lines can be mistaken for additional policy blocks if
  the parser is too aggressive.
- Comment-only markers should not generate structured policy objects.

