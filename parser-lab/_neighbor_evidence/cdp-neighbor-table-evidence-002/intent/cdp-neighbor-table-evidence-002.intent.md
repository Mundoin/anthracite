# CDP neighbor-table intent

## cdp-table-iosxe-001

- Extract the CDP neighbor fields into a candidate fact.
- Preserve the remote device id and outgoing port id.
- Likely future OCC touch points: direct fact creation and duplicate merge.
- Stay out of scope: accepting IP address as the identity.
- Ambiguity note: an IOS-XE CDP report can still be stale.

## cdp-table-nxos-002

- Extract the NX-OS CDP fields and local interface.
- Keep capability hints and IP address as supporting notes.
- Likely future OCC touch points: normalization and unresolved-node
  rejection.
- Stay out of scope: promoting a device-id to a fact if it matches the local
  node.
- Ambiguity note: CDP reports may be duplicated during topology churn.
