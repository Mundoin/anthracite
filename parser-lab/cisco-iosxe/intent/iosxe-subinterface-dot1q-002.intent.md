# iosxe-subinterface-dot1q-002.intent

## What this fixture is for

This fixture focuses on a routed parent interface with multiple
dot1Q-tagged subinterfaces, including a native-VLAN case.

## Devices and interfaces to extract

- The device hostname.
- The parent physical interface `GigabitEthernet0/0/0`.
- Subinterfaces `GigabitEthernet0/0/0.100`, `.200`, `.300`, and `.999`.
- `Loopback0` as a simple routed reference point.

## Likely DeviceModel areas touched

- `identity`
- `interfaces`
- `parse_confidence`

## In scope for a future parser stage

- Parent/child interface wiring.
- Subinterface naming and normalization.
- `encapsulation dot1Q` extraction.
- Native VLAN flagging on a subinterface.
- IPv4 addresses on each subinterface.
- Explicit admin state.

## Out of scope for this parser stage

- Service-policy semantics.
- QoS classification or shaping behavior.
- Routing protocols.
- NAT.
- ACLs.
- Tunnel handling.

## Ambiguity notes

- The parent interface has no IP address, which is normal for a
  subinterface-heavy handoff.
- Native VLAN appears on a subinterface, not a trunk port, so the parser
  should not force a switchport interpretation.
- One subinterface is shutdown to check whether the parser keeps per-unit
  admin state separate from the parent.

## Expected parser risks

- The parser may be tempted to infer a trunk model from the presence of
  dot1Q syntax. It should keep the model at the interface record level
  until OCC defines a broader stage.
- The `service-policy` line is a deliberate note-only risk marker; future
  integration should prefer recording it as unknown or note content over
  inventing QoS behavior.

