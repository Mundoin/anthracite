# Rejected unknown-node intent

## unknown-remote-iosxe-001

- Extract the LLDP evidence but reject it because the remote node is not
  resolvable.
- Likely future OCC touch points: unresolved-node rejection and raw evidence
  retention.
- Stay out of scope: inventing a node from chassis ID alone.
- Ambiguity note: the neighbour can be real while still unsafe to accept.

## unknown-local-junos-002

- Extract the Junos evidence but reject it because the local node could not
  be resolved from inventory.
- Likely future OCC touch points: local-node validation and rejection
  persistence.
- Stay out of scope: promoting a fact without a trusted local node.
- Ambiguity note: the raw output is useful even when the fact is rejected.

## unknown-insufficient-eos-003

- Extract the EOS CDP evidence but reject it because the payload is too weak
  to resolve a node.
- Likely future OCC touch points: insufficient-evidence rejection and
  retries.
- Stay out of scope: treating `unknown` as an acceptable node name.
- Ambiguity note: the device may be present, but the evidence is not enough.
