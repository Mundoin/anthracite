# Duplicate symmetric edge cases

- One side may report the neighbour before the other.
- The remote system name may differ slightly in case or punctuation.
- The same edge can be seen via LLDP and also via a manual note.
- A symmetric pair should not become two facts.
- If the two sides disagree on the endpoint, the case should move to the
  conflict pack.
