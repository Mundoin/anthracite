# LLDP neighbor-table syntax notes

These notes describe the syntax represented in the snippet pack.

## IOS-XE

- `snippets/lldp-neighbor-table-evidence-001.txt / lldp-table-iosxe-001`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Local Interface`
  - `Chassis id`
  - `Port id`
  - `System Name`
  - `Management Addresses`

## NX-OS

- `snippets/lldp-neighbor-table-evidence-001.txt / lldp-table-nxos-002`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Local Port`
  - `Chassis id`
  - `Port id`
  - `System Name`
  - `Management Address`

## Junos

- `snippets/lldp-neighbor-table-evidence-001.txt / lldp-table-junos-003`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Local Interface`
  - `Chassis ID`
  - `Port ID`
  - `System Name`
  - `Management Address`

## Mapping note

- LLDP neighbor-table evidence is strong when local interface, remote chassis,
  remote port, and system name are all present.
- Management address and capability hints should be retained as notes.
