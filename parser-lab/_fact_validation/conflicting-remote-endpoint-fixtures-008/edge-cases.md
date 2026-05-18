# Conflicting endpoint edge cases

- LLDP and CDP may disagree on the remote node.
- Two LLDP reports can disagree after normalization.
- The remote port may be the same while the system name differs.
- The local interface may be the same but the remote node may not be.
- A conflict should not be auto-merged into one accepted fact.
