# Evidence-to-node resolution intent

## resolve-risk-iosxe-001

- Extract the LLDP and CDP evidence as one canonical pair.
- Keep the duplicate reports grouped under one fact.
- Likely future OCC touch points: dedup and confidence merge.
- Stay out of scope: splitting one real edge into two records.
- Ambiguity note: protocol agreement helps, but still needs resolution policy.

## resolve-risk-junos-002

- Extract the Junos LLDP evidence but reject the candidate if the remote node
  cannot be resolved.
- Likely future OCC touch points: unresolved-node rejection and raw evidence
  retention.
- Stay out of scope: inventing a node from chassis ID alone.
- Ambiguity note: the evidence can be complete while still unresolved.

## resolve-risk-eos-003

- Extract the EOS LLDP and CDP evidence as a duplicate pair.
- Keep the dedup key explicit and preserve the warning about fallback
  rejection.
- Likely future OCC touch points: duplicate merge and stale-evidence policy.
- Stay out of scope: silently accepting a peer when resolution fails.
- Ambiguity note: merged evidence can still be invalid if node matching is
  weak.
