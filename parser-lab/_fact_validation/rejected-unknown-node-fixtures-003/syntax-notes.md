# Rejected unknown-node syntax notes

These notes describe the evidence shapes represented in the snippet pack.

## IOS-XE

- `snippets/rejected-unknown-node-fixtures-003.txt / unknown-remote-iosxe-001`
- Observed patterns:
  - `show lldp neighbors detail`
  - `System Name: unknown`
  - `Chassis id`
  - `Port id`

## Junos

- `snippets/rejected-unknown-node-fixtures-003.txt / unknown-local-junos-002`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Local Interface`
  - `Chassis ID`
  - `System Name`

## EOS

- `snippets/rejected-unknown-node-fixtures-003.txt / unknown-insufficient-eos-003`
- Observed patterns:
  - `show cdp neighbors detail`
  - `Device ID`
  - `Port ID`
  - `Capabilities`

## Mapping note

- Unknown remote nodes should not become facts.
- Missing local node resolution should be rejected explicitly.
- Partial evidence can be preserved without creating a topology record.
