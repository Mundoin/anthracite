# CDP mapping intent

## cdp-map-iosxe-001

- Extract the CDP payload and map device-id and port-id directly.
- Keep native-vlan and duplex as evidence notes only.
- Likely future OCC touch points: candidate creation and duplicate merge.
- Stay out of scope: creating a fact when device-id is missing.
- Ambiguity note: a Cisco CDP neighbor can be valid but still stale.

## cdp-map-nxos-002

- Extract the NX-OS CDP payload and map the remote endpoint fields.
- Keep platform and capabilities as notes only.
- Likely future OCC touch points: canonical endpoint generation and
  confidence assignment.
- Stay out of scope: treating capability values as edge identity.
- Ambiguity note: the local config enables CDP; the payload confirms the peer.
