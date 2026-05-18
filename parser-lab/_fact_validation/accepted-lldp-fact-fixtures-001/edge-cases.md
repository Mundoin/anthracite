# Accepted LLDP edge cases

- A neighbour can be accepted even if the management address is missing.
- The same edge can appear from more than one platform output.
- Capability hints should remain notes, not edge identity.
- A remote system name that normalizes cleanly is stronger than a bare chassis
  ID.
- A candidate should not be downgraded just because the local interface name
  varies in casing.
- Config hints alone must not create an accepted fact.
