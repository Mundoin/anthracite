# Config-neighbor intent

## cfg-neighbor-iosxe-001

- Extract the BGP neighbor statement and the local routed interface.
- Keep the remote node as a hint only if the local evidence does not prove a
  physical edge.
- Likely future OCC touch points: conservative rejection and hint retention.
- Stay out of scope: treating the BGP neighbor as a fabric edge.
- Ambiguity note: the remote-as value says nothing about the physical cable.

## cfg-neighbor-junos-002

- Extract the Junos BGP neighbor and the local interface context.
- Preserve the hint, but reject the claim as a topology edge by default.
- Likely future OCC touch points: routing-peer classification and rejection
  reasons.
- Stay out of scope: using peer-as as link identity.
- Ambiguity note: the peer may be a logical neighbor only.

## cfg-neighbor-eos-003

- Extract the MLAG peer-link context and the manual review note.
- Keep the peer-link as a candidate only when OCC wants to track the peer
  relation explicitly.
- Likely future OCC touch points: manual override handling and confidence
  notes.
- Stay out of scope: equating peer-link with a confirmed fabric edge.
- Ambiguity note: peer-link is a special-case config relation and should stay
  annotated as such.
