# LLDP mapping edge cases

- LLDP can be enabled without any live neighbor.
- One side may report LLDP while the other side does not.
- A remote system name may be missing even when the chassis and port are
  present.
- Management addresses should stay as notes unless OCC has a dedicated field.
- Duplicate LLDP reports from the same pair should merge, not fork.
- If the remote node normalizes to the local node, the candidate should be
  rejected as a self-link unless the note explicitly says it is synthetic.
