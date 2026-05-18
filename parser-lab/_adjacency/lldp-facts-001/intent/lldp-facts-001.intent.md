# LLDP facts intent

## lldp-iosxe-001

- Extract the local interfaces and the fact that LLDP is enabled.
- Treat interface descriptions as peer hints only.
- Likely future OCC touch points: adjacency candidate collection, interface
  context, and confidence tags.
- Stay out of scope: declaring a remote edge without actual neighbor data.
- Ambiguity note: `lldp run` is capability, not evidence of a live neighbor.
- Risk: an uplink description can be stale or misleading.

## lldp-nxos-002

- Extract the LLDP enablement state and the named interfaces.
- Keep `feature lldp` as a support signal only.
- Likely future OCC touch points: support-gating, interface identity, and
  discovery-table merge.
- Stay out of scope: remote chassis identity, port id, and edge creation from
  config alone.
- Ambiguity note: NX-OS LLDP enablement does not guarantee neighbor presence.

## lldp-junos-003

- Extract the host name, interface context, and the `protocols lldp` block.
- Use the interface description as a hint, not as topology truth.
- Likely future OCC touch points: normalized interface identities and
  discovery-vs-config correlation.
- Stay out of scope: topology edge promotion without LLDP neighbor facts.
- Ambiguity note: `interface all` means discovery can run widely, not that any
  one neighbor is present.
