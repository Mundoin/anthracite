# Stale neighbour syntax notes

These notes describe the evidence shapes represented in the snippet pack.

## IOS-XE

- `snippets/stale-neighbour-evidence-fixtures-007.txt / stale-iosxe-001`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Holdtime`
  - `System Name`
  - `Port ID`

## Junos

- `snippets/stale-neighbour-evidence-fixtures-007.txt / stale-junos-002`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Local Interface`
  - `Management Address`
  - `last-seen`

## EOS

- `snippets/stale-neighbour-evidence-fixtures-007.txt / stale-eos-003`
- Observed patterns:
  - `show cdp neighbors detail`
  - `Device ID`
  - `Port ID`
  - `age`

## Mapping note

- Stale evidence should remain visible, but it should not replace fresher
  resolved facts.
- Use the age note as a conservative rejection or downgrade signal.
