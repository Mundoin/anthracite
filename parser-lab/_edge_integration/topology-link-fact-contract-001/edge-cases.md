# TopologyLinkFact contract edge cases

- Evidence may be strong enough for a candidate but not for a confirmed edge.
- The remote node may be unknown even when the local interface is clear.
- A manual note may confirm a link without naming the remote interface.
- Multiple evidence sources can point at the same endpoint pair.
- A self-link candidate should be rejected unless the note explicitly says it
  is a lab loopback or synthetic test.
- Directionality can differ across evidence sources; keep the raw direction in
  notes even if the canonical key is undirected.
