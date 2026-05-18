# routeros-system-interface-001.intent

## What this fixture is for

This fixture establishes the RouterOS baseline shape for system
identity, interface basics, routed interfaces, static routes, and
management-plane hints.

## Devices and interfaces to extract

- The device identity from `/system identity`.
- Ethernet interfaces `wan1` and `lan1`.
- The bridge `bridge-lan`.
- VLAN interface `vlan10`.
- Static routes.

## Likely parser surface areas touched

- identity
- interfaces
- static routes
- management-plane hints
- note-only policy/security markers

## In scope for a future parser stage

- Hostname and interface renames.
- Bridge and VLAN interface extraction.
- Routed interface addresses.
- Static routes.
- SSH, API, SNMP, and NTP hints.

## Out of scope for this parser stage

- Firewall semantics.
- NAT behavior.
- QoS behavior.
- AAA behavior.
- Routing protocol semantics.
- Live state.

## Ambiguity notes

- RouterOS exports can present `find` selectors and interface renames in
  the same line.
- The bridge is a structural interface, not a policy object.

## Expected parser risks

- `bridge-lan` and `vlan10` may both hold IPs, so the parser should keep
  them as separate interface records.
- Note-only markers should stay as comments.

