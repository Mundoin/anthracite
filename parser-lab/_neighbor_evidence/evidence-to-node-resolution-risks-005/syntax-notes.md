# Evidence-to-node resolution syntax notes

These notes describe the syntax represented in the snippet pack.

## IOS-XE

- `snippets/evidence-to-node-resolution-risks-005.txt / resolve-risk-iosxe-001`
- Observed patterns:
  - `show lldp neighbors detail`
  - `show cdp neighbors detail`
  - `Local Interface`
  - `Device ID`
  - `Port ID`

## Junos

- `snippets/evidence-to-node-resolution-risks-005.txt / resolve-risk-junos-002`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Local Interface`
  - `Chassis ID`
  - `System Name`
  - `Management Address`

## EOS

- `snippets/evidence-to-node-resolution-risks-005.txt / resolve-risk-eos-003`
- Observed patterns:
  - `show lldp neighbors detail`
  - `show cdp neighbors detail`
  - `Port`
  - `Device ID`
  - `Peer Address`

## Risk note

- Evidence can look complete and still fail node resolution.
- Duplicate reports should be grouped, not multiplied.
- Rejection reasons should be retained in the notes.
