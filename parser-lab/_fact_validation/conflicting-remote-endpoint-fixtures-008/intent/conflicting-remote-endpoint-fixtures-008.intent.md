# Conflicting endpoint intent

## conflict-iosxe-001

- Extract both protocol reports but reject the candidate because the remote
  endpoint claims disagree.
- Likely future OCC touch points: conflict detection and rejection
  persistence.
- Stay out of scope: choosing one remote endpoint arbitrarily.
- Ambiguity note: a conflict is not the same as a duplicate.

## conflict-junos-002

- Extract the Junos LLDP evidence but reject it because a different remote
  node appears in correlation.
- Likely future OCC touch points: inventory-based conflict detection.
- Stay out of scope: accepting whichever label looks nicer.
- Ambiguity note: the local port may be stable while the remote match is not.

## conflict-eos-003

- Extract the EOS LLDP and CDP evidence but reject it because the remote
  endpoint claims differ.
- Likely future OCC touch points: multi-source conflict scoring.
- Stay out of scope: merging conflicting endpoint claims into one accepted
  fact.
- Ambiguity note: a conflict should remain visible for review.
