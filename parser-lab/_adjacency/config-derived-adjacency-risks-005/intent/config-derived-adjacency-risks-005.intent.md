# Config-derived adjacency risks intent

## risk-iosxe-001

- Extract the routing neighbor statements as candidate signals only.
- Keep the interface description as a hint, not topology truth.
- Likely future OCC touch points: confidence ranking and false-positive
  suppression.
- Stay out of scope: edge creation from BGP or OSPF configuration alone.
- Ambiguity note: `neighbor ... remote-as` is a routing peer, not a physical
  link.

## risk-eos-002

- Extract the BGP and MLAG context as risk-bearing signals.
- Keep the MLAG block separate from true adjacency evidence.
- Likely future OCC touch points: bundle-vs-peer separation and confidence
  tagging.
- Stay out of scope: treating `peer-link` as a remote chassis.
- Ambiguity note: MLAG is a control-plane relationship and may not map to a
  single topology edge.

## risk-junos-003

- Extract the BGP, OSPF, and static-route context as risk-bearing signals.
- Keep static next-hop information separate from physical adjacency.
- Likely future OCC touch points: peer ranking and routing-vs-topology
  disambiguation.
- Stay out of scope: assuming the `next-hop` is the remote device.
- Ambiguity note: protocol peers and routes can all be correct without any
  direct link being present in the current snippet.
