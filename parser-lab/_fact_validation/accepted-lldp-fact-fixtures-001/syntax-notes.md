# Accepted LLDP syntax notes

These notes describe the evidence shapes represented in the snippet pack.

## IOS-XE

- `snippets/accepted-lldp-fact-fixtures-001.txt / accepted-lldp-iosxe-001`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Local Interface`
  - `Chassis id`
  - `Port id`
  - `System Name`
  - `Management Addresses`

## NX-OS

- `snippets/accepted-lldp-fact-fixtures-001.txt / accepted-lldp-nxos-002`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Local Port`
  - `Chassis id`
  - `Port id`
  - `System Name`
  - `Management Address`

## Junos

- `snippets/accepted-lldp-fact-fixtures-001.txt / accepted-lldp-junos-003`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Local Interface`
  - `Chassis ID`
  - `Port ID`
  - `System Name`
  - `Management Address`

## EOS

- `snippets/accepted-lldp-fact-fixtures-001.txt / accepted-lldp-eos-004`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Port`
  - `Chassis ID`
  - `Port ID`
  - `System Name`
  - `Management Address`

## Mapping note

- Accepted LLDP facts should preserve local and remote endpoints plus evidence
  notes.
- LLDP evidence is strong only when the remote node can be resolved safely.
