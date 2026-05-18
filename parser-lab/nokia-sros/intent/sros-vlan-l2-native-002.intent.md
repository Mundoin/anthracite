# sros-vlan-l2-native-002.intent

## What this fixture is for

This fixture focuses on SR OS VLAN/L2 service handling, native SAP
membership, and a routed bridge-style termination interface.

## Devices and interfaces to extract

- The system name.
- `port 1/1/2`.
- `port 1/1/3`.
- VPLS service 100.
- SAP membership on access, trunk, and native forms.
- `irb100`.
- Static routes.

## Likely parser surface areas touched

- interfaces
- service-based VLAN/L2 metadata
- static routes
- note-only policy/security markers

## In scope for a future parser stage

- Access and trunk port metadata.
- SAP membership and native/untagged handling.
- Routed bridge termination.
- Static route extraction.

## Out of scope for this parser stage

- ACL semantics.
- NAT behavior.
- QoS behavior.
- AAA behavior.
- Security-policy semantics.
- Routing protocol semantics.

## Ambiguity notes

- The `sap 1/1/3 create` line is used as a native/untagged marker in
  this synthetic pack.
- The routed `irb100` interface is a service-side termination point, not
  a separate device.

## Expected parser risks

- Service-based VLAN/L2 syntax can be easy to over-attach to router
  interfaces.
- Native SAP handling should remain distinct from tagged SAP handling.

