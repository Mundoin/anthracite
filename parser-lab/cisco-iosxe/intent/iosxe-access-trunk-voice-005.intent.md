# iosxe-access-trunk-voice-005.intent

## What this fixture is for

This fixture focuses on access ports with voice VLAN, trunk ranges, and
management/quarantine SVIs.

## Devices and interfaces to extract

- The device hostname.
- `Vlan99` and `Vlan100` as SVI variants.
- Access ports `GigabitEthernet1/0/1`, `GigabitEthernet1/0/2`, and
  `GigabitEthernet1/0/25`.
- Trunk uplink `GigabitEthernet1/0/24`.

## Likely DeviceModel areas touched

- `identity`
- `interfaces`
- `vlans`
- `parse_confidence`

## In scope for a future parser stage

- Voice VLAN on an access port.
- Trunk native VLAN.
- Mixed VLAN list forms, including ranges.
- Explicit admin state on access and trunk ports.
- SVI variants with different shutdown states.

## Out of scope for this parser stage

- CDP or LLDP neighbor semantics.
- STP state computation.
- Telephony behavior.
- QoS policy semantics.
- Routing protocols.

## Ambiguity notes

- `switchport voice vlan` often carries operational meaning, but this
  batch still treats it as interface metadata, not telephony behavior.
- The uplink includes a mixed list (`10,20,99-100`) to force later range
  normalization.

## Expected parser risks

- Voice VLAN can be misread as a second access VLAN if the parser is too
  aggressive.
- The parser should preserve punctuation in descriptions.
- A shutdown access port should still be represented as a real
  interface record, not dropped.

