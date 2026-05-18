# LLDP facts syntax notes

These notes describe the syntax represented in the snippet pack.

## IOS-XE

- `snippets/lldp-facts-001.cfg / lldp-iosxe-001`
- Observed pattern: `lldp run`

## NX-OS

- `snippets/lldp-facts-001.cfg / lldp-nxos-002`
- Observed pattern: `feature lldp`

## Junos

- `snippets/lldp-facts-001.cfg / lldp-junos-003`
- Observed pattern: `protocols lldp { interface all; }`

## Interface context

- `snippets/lldp-facts-001.cfg / lldp-iosxe-001`
- `snippets/lldp-facts-001.cfg / lldp-nxos-002`
- `snippets/lldp-facts-001.cfg / lldp-junos-003`

Observed patterns:

- `description ...`
- `no shutdown`
- routed interface addresses

## Conservative note

- LLDP enablement is not a neighbor edge.
- Future adjacency edges must come from discovery evidence, not from the
  presence of `lldp run` / `feature lldp` alone.
