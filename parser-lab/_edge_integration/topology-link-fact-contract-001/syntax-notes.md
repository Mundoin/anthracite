# TopologyLinkFact contract syntax notes

These notes describe the syntax represented in the snippet pack.

## IOS-XE

- `snippets/topology-link-fact-contract-001.cfg / contract-iosxe-001`
- Observed patterns:
  - `lldp run`
  - `interface GigabitEthernet...`
  - `description ...`

## Junos

- `snippets/topology-link-fact-contract-001.cfg / contract-junos-002`
- Observed patterns:
  - `system { host-name ...; }`
  - `protocols { bgp { neighbor ... } }`
  - `interfaces { ge-... { unit 0 { family inet { address ...; } } } }`

## EOS

- `snippets/topology-link-fact-contract-001.cfg / contract-eos-003`
- Observed patterns:
  - `interface Port-Channel...`
  - `mlag configuration`
  - `peer-link ...`
  - `peer-address ...`

## Contract note

- A TopologyLinkFact should preserve the raw evidence source and the
  normalized endpoints.
- `remote_node_hint` and `remote_interface_hint` are acceptable when the
  remote endpoint is not fully known.
