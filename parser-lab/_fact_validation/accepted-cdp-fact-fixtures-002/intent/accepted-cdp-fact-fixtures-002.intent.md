# Accepted CDP intent

## accepted-cdp-iosxe-001

- Extract the IOS-XE CDP fields into one accepted fact.
- Preserve the local and remote interfaces, device-id, and IP address.
- Likely future OCC touch points: accepted fact creation and duplicate merge.
- Stay out of scope: treating the IP address as the edge identity.
- Ambiguity note: the CDP table is evidence, not a schema mutation target.

## accepted-cdp-nxos-002

- Extract the NX-OS CDP fields and accept the neighbour fact.
- Keep capabilities and IP address as notes.
- Likely future OCC touch points: normalization and confidence tagging.
- Stay out of scope: accepting unresolved or self-linked peers.
- Ambiguity note: the local port name should not alter the canonical edge.
