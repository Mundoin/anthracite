# Config-neighbor mapping edge cases

- BGP neighbors may use loopbacks and not the local physical link.
- OSPF adjacency settings are often still not edge proof.
- MLAG peer-link is a special case and should be annotated carefully.
- A peer-address can identify a control-plane peer without naming the remote
  interface.
- Config neighbors can be correct and still be unsuitable as topology edges.
- When config evidence is too weak, keep a rejected record and explain why.
