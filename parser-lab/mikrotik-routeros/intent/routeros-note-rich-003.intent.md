# routeros-note-rich-003.intent

## What this fixture is for

This fixture rounds out the RouterOS baseline with another routed edge,
an extra VLAN interface, management-plane hints, and explicit note-only
policy/security markers.

## Devices and interfaces to extract

- The device identity.
- Ethernet interfaces `wan` and `lan`.
- Bridge `br-edge`.
- VLAN interface `vlan50`.
- Static routes.

## Likely parser surface areas touched

- identity
- interfaces
- static routes
- management-plane hints
- note-only policy/security markers

## In scope for a future parser stage

- Bridge and VLAN interface extraction.
- Routed IPv4 interfaces.
- Static routes.
- SSH, SNMP, and NTP hints.

## Out of scope for this parser stage

- Firewall semantics.
- NAT behavior.
- QoS behavior.
- AAA behavior.
- Routing protocol semantics.

## Ambiguity notes

- The note-only markers are comments, not operational commands.
- The `vlan50` interface gives the parser a third interface shape
  without changing the stage scope.

## Expected parser risks

- RouterOS exports can reorder blocks, so the parser should preserve
  association without relying on incidental ordering.
- Comment-only markers should not generate structured firewall or QoS
  objects.

