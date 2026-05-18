# Rejected self-link syntax notes

These notes describe the evidence shapes represented in the snippet pack.

## IOS-XE

- `snippets/rejected-self-link-fixtures-004.txt / self-link-iosxe-001`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Local Interface`
  - `System Name`
  - `Port ID`

## Junos

- `snippets/rejected-self-link-fixtures-004.txt / self-link-junos-002`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Local Interface`
  - `System Name`
  - `Chassis ID`

## EOS

- `snippets/rejected-self-link-fixtures-004.txt / self-link-eos-003`
- Observed patterns:
  - `show cdp neighbors detail`
  - `Device ID`
  - `Port ID`
  - `IP address`

## Mapping note

- Self-links should never be accepted as real topology facts.
- The rejection reason should be explicit and durable.
