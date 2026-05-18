# Junos LLDP syntax notes

These notes describe the syntax represented in the snippet pack.

## Junos

- `snippets/junos-lldp-neighbor-evidence-003.txt / junos-lldp-001`
- `snippets/junos-lldp-neighbor-evidence-003.txt / junos-lldp-002`
- Observed patterns:
  - `show lldp neighbors detail`
  - `Local Interface`
  - `Chassis ID`
  - `Port ID`
  - `System Name`
  - `Management Address`

## Mapping note

- Junos LLDP evidence is strong when chassis id, system name, and port id are
  present together.
- Unit names should be normalized carefully so the local interface stays
  stable for downstream dedup.
