# TopologyLinkFact contract intent

## contract-iosxe-001

- Extract the local interface and the LLDP evidence fields.
- Keep the remote node and remote port explicit in the fact payload.
- Likely future OCC touch points: raw-evidence retention, confidence tagging,
  and canonical key generation.
- Stay out of scope: collapsing the example into a confirmed edge without
  discovery data.
- Ambiguity note: the local config only proves LLDP support; the neighbor
  fields are what justify the candidate fact.

## contract-junos-002

- Extract the config-neighbor statement and the local routed interface.
- Keep the remote endpoint as a hint until inventory or discovery confirms it.
- Likely future OCC touch points: hint-only remote handling and low-confidence
  candidate facts.
- Stay out of scope: turning BGP config into a physical link.
- Ambiguity note: a routing peer can be correct without being a topology edge.

## contract-eos-003

- Extract the MLAG peer-link context and the manual reviewer note.
- Keep the remote side as a hint unless OCC has a verified peer identity.
- Likely future OCC touch points: manual-evidence gating and low-confidence
  candidate facts.
- Stay out of scope: assuming peer-link equals a confirmed physical edge.
- Ambiguity note: manual notes can support a fact but should not override
  conservative rejection rules by themselves.
