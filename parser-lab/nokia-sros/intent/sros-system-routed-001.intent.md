# sros-system-routed-001.intent

## What this fixture is for

This fixture establishes the SR OS baseline shape for system identity,
routed interfaces, management-plane hints, and static routes.

## Devices and interfaces to extract

- The system name.
- `port 1/1/1`.
- Router Base interfaces `lo0` and `to-wan`.
- Static routes.

## Likely parser surface areas touched

- identity
- interfaces
- static routes
- management-plane hints
- note-only policy/security markers

## In scope for a future parser stage

- System identity and interface basics.
- Loopback and routed interface extraction.
- Static routes.
- SNMP, SSH, and NTP hints.

## Out of scope for this parser stage

- ACL semantics.
- NAT behavior.
- QoS behavior.
- AAA behavior.
- Security-policy semantics.
- Routing protocol semantics.

## Ambiguity notes

- SR OS keeps system and router context separate, so the parser should
  not conflate them.
- Management-plane lines are present, but the baseline should still
  treat them as hints rather than a complete operations model.

## Expected parser risks

- SR OS can vary by classic versus modern CLI style.
- The parser should preserve shutdown-like state if future fixtures
  introduce it.

