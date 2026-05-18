# Config-derived adjacency risks syntax notes

These notes describe the syntax represented in the snippet pack.

## IOS-XE

- `snippets/config-derived-adjacency-risks-005.cfg / risk-iosxe-001`
- Observed patterns:
  - `router ospf N`
  - `router bgp N`
  - `neighbor A.B.C.D remote-as N`
  - `neighbor A.B.C.D description ...`
  - `neighbor A.B.C.D activate`
  - `ip route ...`

## Arista EOS

- `snippets/config-derived-adjacency-risks-005.cfg / risk-eos-002`
- Observed patterns:
  - `router ospf N`
  - `router bgp N`
  - `neighbor A.B.C.D remote-as N`
  - `mlag configuration`
  - `peer-address ...`
  - `peer-link ...`

## Junos

- `snippets/config-derived-adjacency-risks-005.cfg / risk-junos-003`
- Observed patterns:
  - `protocols ospf`
  - `protocols bgp`
  - `peer-as ...`
  - `routing-options static route ... next-hop ...`

## Conservative note

- Routing protocol neighbors are not physical adjacency proof.
- MLAG peer settings are special control-plane context, not a fabric edge.
- Static next-hops are routing data, not switch-neighbor data.
