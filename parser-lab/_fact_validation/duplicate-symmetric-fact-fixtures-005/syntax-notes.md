# Duplicate symmetric syntax notes

These notes describe the evidence shapes represented in the snippet pack.

## IOS-XE

- `snippets/duplicate-symmetric-fact-fixtures-005.txt / symmetric-iosxe-001`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Local Interface`
  - `System Name`
  - `Port ID`

## Junos

- `snippets/duplicate-symmetric-fact-fixtures-005.txt / symmetric-junos-002`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Local Interface`
  - `Chassis ID`
  - `Port ID`

## EOS

- `snippets/duplicate-symmetric-fact-fixtures-005.txt / symmetric-eos-003`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Port`
  - `Chassis ID`
  - `Port ID`

## Mapping note

- The same edge can appear in both directions and should be merged.
- Notes should preserve both raw evidence sources.
