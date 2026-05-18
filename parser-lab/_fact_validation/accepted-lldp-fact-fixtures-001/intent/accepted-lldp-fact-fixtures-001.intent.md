# Accepted LLDP intent

## accepted-lldp-iosxe-001

- Extract the LLDP fields into one accepted fact.
- Preserve the local and remote interfaces, chassis id, system name, and
  management address.
- Likely future OCC touch points: accepted fact creation and duplicate merge.
- Stay out of scope: treating the config hint as the edge itself.
- Ambiguity note: the LLDP table is evidence, not a schema mutation target.

## accepted-lldp-nxos-002

- Extract the NX-OS LLDP fields and accept the neighbour fact.
- Keep capabilities and management address as notes.
- Likely future OCC touch points: normalization and confidence tagging.
- Stay out of scope: accepting unresolved or self-linked peers.
- Ambiguity note: the local port name should not alter the canonical edge.

## accepted-lldp-junos-003

- Extract the Junos LLDP fields and accept the fact after interface
  normalization.
- Keep the unit suffix in the local-interface note when useful for OCC.
- Likely future OCC touch points: unit normalization and accepted fact
  creation.
- Stay out of scope: using `interface all` as proof of adjacency.
- Ambiguity note: the neighbour is accepted because the remote endpoint is
  resolvable, not because LLDP is enabled.

## accepted-lldp-eos-004

- Extract the EOS LLDP fields and accept the fact.
- Preserve the source label and management address in the notes.
- Likely future OCC touch points: dedup against Cisco/Junos evidence and
  confidence scoring.
- Stay out of scope: making the description the identity.
- Ambiguity note: interface spelling differences should not split the same
  edge.
