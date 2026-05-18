# Interface peer hints intent

## peerhint-iosxr-001

- Extract the interface names, descriptions, and routed uplink context.
- Treat the description as a peer hint only.
- Likely future OCC touch points: candidate-edge ranking and confidence tags.
- Stay out of scope: edge promotion without discovery data.
- Ambiguity note: an uplink description may be stale or generic.

## peerhint-eos-002

- Extract the Ethernet interfaces, their L3/L2 mode, and descriptions.
- Keep `no switchport` as a support signal, not a remote identity.
- Likely future OCC touch points: role inference and interface normalization.
- Stay out of scope: topology creation from config alone.
- Ambiguity note: the same label can point at different physical peers.

## peerhint-sros-003

- Extract the port identity, mode, and descriptions.
- Use the `network` / `access` mode as a weak ranker only.
- Likely future OCC touch points: role ranking and interface inventory merge.
- Stay out of scope: assuming the remote endpoint is known.
- Ambiguity note: SR OS port role does not equal verified adjacency.
