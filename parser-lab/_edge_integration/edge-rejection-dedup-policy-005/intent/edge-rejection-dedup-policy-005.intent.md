# Edge rejection and dedup intent

## dedup-iosxe-001

- Merge LLDP and CDP evidence for the same endpoint pair into one fact.
- Keep the raw evidence bundles and use one canonical fact record.
- Likely future OCC touch points: dedup key generation and evidence merging.
- Stay out of scope: creating two facts for one real edge.
- Ambiguity note: multiple protocols can report the same link.

## dedup-junos-002

- Extract the LLDP payload, but reject it when the remote node is unknown and
  cannot be safely correlated.
- Likely future OCC touch points: unknown-node gating and deferred
  correlation.
- Stay out of scope: inventing a remote node from a chassis id alone.
- Ambiguity note: keeping the raw payload is useful even when the fact is
  rejected.

## dedup-eos-003

- Extract the MLAG context, but reject the self-link claim.
- Likely future OCC touch points: self-link detection and manual-note
  handling.
- Stay out of scope: promoting a local peer-link note into a real edge after
  a self-link warning.
- Ambiguity note: a manual note can explain the failure without changing the
  rejection.
