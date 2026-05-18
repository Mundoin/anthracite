# Duplicate symmetric intent

## symmetric-iosxe-001

- Extract both directions of the same LLDP edge.
- Merge them into one canonical fact.
- Likely future OCC touch points: symmetric key generation and merge logic.
- Stay out of scope: treating the reverse report as a second edge.
- Ambiguity note: direction changes should not change the fact identity.

## symmetric-junos-002

- Extract both Junos directions and collapse them into one fact.
- Preserve both raw reports in the notes.
- Likely future OCC touch points: duplicate merge and source retention.
- Stay out of scope: using two directions to create two records.
- Ambiguity note: unit normalization should still land on one edge.

## symmetric-eos-003

- Extract both EOS directions and collapse them into one fact.
- Preserve the paired management addresses in the notes.
- Likely future OCC touch points: pair-key generation and confidence merge.
- Stay out of scope: interpreting the reverse report as a different edge.
- Ambiguity note: duplicate evidence is expected, not an error.
