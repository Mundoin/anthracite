# Conflicting endpoint syntax notes

These notes describe the evidence shapes represented in the snippet pack.

## IOS-XE

- `snippets/conflicting-remote-endpoint-fixtures-008.txt / conflict-iosxe-001`
- Observed patterns:
  - `show lldp neighbors detail`
  - `show cdp neighbors detail`
  - `System Name`
  - `Device ID`
  - `Port ID`

## Junos

- `snippets/conflicting-remote-endpoint-fixtures-008.txt / conflict-junos-002`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Local Interface`
  - `Chassis ID`
  - `Port ID`

## EOS

- `snippets/conflicting-remote-endpoint-fixtures-008.txt / conflict-eos-003`
- Observed patterns:
  - `show lldp neighbors detail`
  - `show cdp neighbors detail`
  - `Port`
  - `Device ID`

## Mapping note

- If the remote endpoint claims disagree, the candidate should be rejected
  rather than merged.
- Conflict evidence should preserve both claims and the reason for rejection.
