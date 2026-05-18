# Mixed LLDP/CDP syntax notes

These notes describe the evidence shapes represented in the snippet pack.

## IOS-XE

- `snippets/mixed-lldp-cdp-same-edge-fixtures-006.txt / mixed-iosxe-001`
- Observed patterns:
  - `show lldp neighbors detail`
  - `show cdp neighbors detail`
  - `Local Interface`
  - `Device ID`
  - `Port ID`

## NX-OS

- `snippets/mixed-lldp-cdp-same-edge-fixtures-006.txt / mixed-nxos-002`
- Observed patterns:
  - `show lldp neighbors detail`
  - `show cdp neighbors detail`
  - `Local Port`
  - `Device ID`
  - `Port ID`

## EOS note-only

- `snippets/mixed-lldp-cdp-same-edge-fixtures-006.txt / mixed-eos-note-003`
- Observed patterns:
  - `LLDP evidence payload`
  - `CDP note-only payload`
  - `Port`
  - `System Name`

## Mapping note

- LLDP and CDP should collapse into one fact when they describe the same edge.
- Keep both evidence sources in the notes so OCC can review the merge.
