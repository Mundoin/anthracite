# Config-neighbor mapping syntax notes

These notes describe the syntax represented in the snippet pack.

## IOS-XE

- `snippets/config-neighbor-to-link-fact-mapping-004.cfg / cfg-neighbor-iosxe-001`
- Observed patterns:
  - `router bgp ...`
  - `neighbor ... remote-as ...`
  - `neighbor ... description ...`

## Junos

- `snippets/config-neighbor-to-link-fact-mapping-004.cfg / cfg-neighbor-junos-002`
- Observed patterns:
  - `protocols bgp`
  - `neighbor ... { peer-as ...; }`
  - `interfaces ... unit 0`

## EOS

- `snippets/config-neighbor-to-link-fact-mapping-004.cfg / cfg-neighbor-eos-003`
- Observed patterns:
  - `mlag configuration`
  - `peer-address ...`
  - `peer-link ...`
  - `router bgp ...`

## Mapping note

- A config neighbor is not automatically a physical edge.
- Routing peers should stay separate from link facts unless there is explicit
  evidence that the statement refers to the physical connection itself.
