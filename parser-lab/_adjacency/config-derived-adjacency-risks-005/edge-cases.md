# Config-derived adjacency risks edge cases

- A BGP neighbor can be a logical peer, not a directly connected link.
- OSPF interface statements can identify a routed interface without naming a
  remote chassis.
- MLAG peer-address and peer-link are control-plane and local-bundle context.
- Static routes may reference a next-hop that is several hops away.
- ACL, NAT, QoS, AAA, and security markers are not adjacency evidence.
- Descriptions that contain peer-like names should remain ambiguous unless
  discovery confirms the link.
