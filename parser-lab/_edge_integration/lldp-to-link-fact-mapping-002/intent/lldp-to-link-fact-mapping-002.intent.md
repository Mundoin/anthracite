# LLDP mapping intent

## lldp-map-iosxe-001

- Extract the local interface and the LLDP neighbor payload.
- Map chassis and port ids directly into the fact payload.
- Likely future OCC touch points: candidate creation, confidence assignment,
  and duplicate merge.
- Stay out of scope: treating management address as the edge endpoint.
- Ambiguity note: capabilities belong in notes, not as link identity.

## lldp-map-nxos-002

- Extract the NX-OS LLDP evidence and the local uplink.
- Keep the remote system and port ids explicit.
- Likely future OCC touch points: normalized endpoint mapping and canonical
  dedup keys.
- Stay out of scope: promoting LLDP into a confirmed edge without payload
  fields.
- Ambiguity note: the local config only enables LLDP; the payload does the
  topology work.

## lldp-map-junos-003

- Extract the Junos LLDP evidence and the routed interface context.
- Keep the payload fields as evidence notes if the remote endpoint is not
  fully known.
- Likely future OCC touch points: unknown-node fallback and high-confidence
  candidate creation.
- Stay out of scope: using `interface all` as proof of adjacency.
- Ambiguity note: the protocol can be active everywhere and still yield no
  local neighbor on a given port.
