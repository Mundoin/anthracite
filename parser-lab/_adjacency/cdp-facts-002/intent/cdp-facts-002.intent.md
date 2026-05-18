# CDP facts intent

## cdp-iosxe-001

- Extract the local interfaces and the fact that CDP is enabled.
- Treat interface descriptions as peer hints only.
- Likely future OCC touch points: adjacency candidate collection, interface
  context, and confidence tags.
- Stay out of scope: declaring a remote edge without actual neighbor data.
- Ambiguity note: `cdp run` is capability, not evidence of a live neighbor.

## cdp-iosxe-002

- Extract the interface context and the CDP capability state.
- Keep the description as a supporting hint only.
- Likely future OCC touch points: local-interface normalization and duplicate
  signal merging.
- Stay out of scope: remote device identity from config alone.
- Ambiguity note: one enabled interface does not imply an edge exists.

## cdp-nxos-003

- Extract the NX-OS CDP capability state and interface context.
- Use the interface description as a hint, not as topology truth.
- Likely future OCC touch points: normalized interface identities and
  discovery-vs-config correlation.
- Stay out of scope: topology edge promotion without CDP neighbor facts.
- Ambiguity note: `feature cdp` means the device can speak CDP, not that a
  neighbor was actually found.
