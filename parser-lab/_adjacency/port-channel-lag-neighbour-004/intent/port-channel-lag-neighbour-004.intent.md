# Port-channel / LAG neighbour intent

## lag-iosxe-001

- Extract member interfaces, the port-channel interface, and trunk settings.
- Use the port-channel as a bundle candidate, not a remote edge.
- Likely future OCC touch points: member-to-bundle mapping and confidence
  ranking.
- Stay out of scope: remote chassis identity and STP inference.
- Ambiguity note: trunk values do not prove a live peer.

## lag-nxos-002

- Extract the member interfaces, the `feature lacp` state, and the bundle.
- Keep the bundle as a local association only.
- Likely future OCC touch points: LACP support gating and bundle collapse.
- Stay out of scope: treating the bundle as a remote device.
- Ambiguity note: NX-OS bundle syntax is topology support, not topology truth.

## lag-junos-003

- Extract `802.3ad` membership, `ae0`, and the LACP mode.
- Use the aggregate interface as a candidate bundle only.
- Likely future OCC touch points: bundle normalization and member resolution.
- Stay out of scope: remote endpoint promotion from `ae0`.
- Ambiguity note: Junos bundle syntax is local association, not edge proof.
