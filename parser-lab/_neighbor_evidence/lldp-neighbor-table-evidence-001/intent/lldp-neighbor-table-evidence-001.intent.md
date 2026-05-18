# LLDP neighbor-table intent

## lldp-table-iosxe-001

- Extract the LLDP neighbor fields into a candidate fact.
- Preserve the remote chassis, system name, and port id.
- Likely future OCC touch points: direct fact creation and duplicate merge.
- Stay out of scope: accepting management address as identity.
- Ambiguity note: the remote system name may still be stale.

## lldp-table-nxos-002

- Extract the NX-OS LLDP fields and local port.
- Keep capability hints as notes only.
- Likely future OCC touch points: endpoint normalization and confidence
  grading.
- Stay out of scope: assuming the fabric role proves the exact remote node.
- Ambiguity note: a single LLDP report is not always enough to resolve the
  node cleanly.

## lldp-table-junos-003

- Extract the Junos LLDP fields and the routed interface context.
- Keep the management address and capabilities as supporting notes.
- Likely future OCC touch points: inventory correlation and unresolved-node
  rejection.
- Stay out of scope: promoting an unresolved peer into a confirmed edge.
- Ambiguity note: LLDP evidence can be structurally complete but still
  unresolved in inventory.
