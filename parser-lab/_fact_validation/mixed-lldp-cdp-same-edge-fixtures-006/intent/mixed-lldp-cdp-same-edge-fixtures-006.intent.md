# Mixed LLDP/CDP intent

## mixed-iosxe-001

- Extract both LLDP and CDP reports for the same IOS-XE edge.
- Merge them into one accepted fact.
- Likely future OCC touch points: cross-protocol dedup and confidence merge.
- Stay out of scope: creating one fact per protocol.
- Ambiguity note: the same remote node appears twice because two protocols
  reported it, not because there are two edges.

## mixed-nxos-002

- Extract both NX-OS reports and accept the merged fact.
- Preserve both source labels and the shared remote endpoint.
- Likely future OCC touch points: source bundling and canonical keying.
- Stay out of scope: treating CDP and LLDP as separate edges.
- Ambiguity note: the local port and remote port should converge on one pair.

## mixed-eos-note-003

- Extract the illustrative payload as note-only merge behaviour.
- Keep the note explicit that it is synthetic evidence payload, not a real
  CDP config shape.
- Likely future OCC touch points: note-only retention for non-Cisco examples.
- Stay out of scope: promoting the illustrative block into a real protocol
  report.
- Ambiguity note: this exists to show the merge policy, not to claim EOS CDP
  truth.
