# Port-channel / LAG neighbour edge cases

- A member interface can exist without the bundle interface being present in
  the same snippet.
- The bundle may exist with no active members.
- `active` and `passive` LACP roles are not remote identity.
- Trunk VLAN ranges can be present on the bundle but absent from members.
- Junos `802.3ad` is local membership, not remote adjacency.
- Do not turn bundle membership into a physical neighbor edge without
  discovery evidence.
