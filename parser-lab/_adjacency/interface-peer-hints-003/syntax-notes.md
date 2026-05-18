# Interface peer hints syntax notes

These notes describe the syntax represented in the snippet pack.

## IOS-XR

- `snippets/interface-peer-hints-003.cfg / peerhint-iosxr-001`
- Observed patterns:
  - `interface TenGigE0/0/0/0`
  - `description ...`
  - `ipv4 address A.B.C.D MASK`
  - `no shutdown`

## Arista EOS

- `snippets/interface-peer-hints-003.cfg / peerhint-eos-002`
- Observed patterns:
  - `interface Ethernet1`
  - `description ...`
  - `no switchport`
  - `ip address A.B.C.D/PREFIX`
  - `no shutdown`

## Nokia SR OS

- `snippets/interface-peer-hints-003.cfg / peerhint-sros-003`
- Observed patterns:
  - `configure system name "..."`.
  - `configure port 1/1/1`
  - `description "..."`.
  - `mode network`
  - `mode access`

## Conservative note

- A description like `uplink to core` is a hint, not a verified edge.
- Interface mode or address type can support ranking, but not certainty.
