# Junos LLDP intent

## junos-lldp-001

- Extract the Junos LLDP fields into a candidate fact.
- Normalize the local unit and preserve the remote chassis and port id.
- Likely future OCC touch points: direct fact creation and duplicate merge.
- Stay out of scope: treating the management address as the node identity.
- Ambiguity note: the remote system name may still need inventory resolution.

## junos-lldp-002

- Extract the Junos LLDP fields and local routed interface.
- Keep the capabilities and management address as evidence notes.
- Likely future OCC touch points: confidence grading and unresolved-node
  rejection.
- Stay out of scope: promoting a partially resolved peer into a confirmed
  edge.
- Ambiguity note: the local evidence can be fine while the remote match is not.
