# CDP neighbor-table syntax notes

These notes describe the syntax represented in the snippet pack.

## IOS-XE

- `snippets/cdp-neighbor-table-evidence-002.txt / cdp-table-iosxe-001`
- Observed patterns:
  - `show cdp neighbors detail`
  - `Device ID`
  - `Local Interface`
  - `Port ID`
  - `IP address`
  - `Capabilities`

## NX-OS

- `snippets/cdp-neighbor-table-evidence-002.txt / cdp-table-nxos-002`
- Observed patterns:
  - `show cdp neighbors detail`
  - `Device ID`
  - `Local Port`
  - `Port ID`
  - `IP address`
  - `Capabilities`

## Mapping note

- CDP evidence is strong when the device-id and port-id are present.
- IP address and capability hints should remain evidence notes unless OCC has
  a dedicated field.
