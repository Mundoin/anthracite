# LLDP facts edge cases

- LLDP enabled on a device does not prove any neighbor exists.
- A single host-name or interface description is only a hint.
- Management interfaces should not be promoted to fabric edges without
  discovery proof.
- LLDP on one side only should remain ambiguous.
- Multiple interfaces may point to the same peer description without forming
  a unique edge.
- LLDP facts should not absorb BGP, MLAG, or port-channel semantics.
