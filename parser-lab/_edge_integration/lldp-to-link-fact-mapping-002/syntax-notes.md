# LLDP mapping syntax notes

These notes describe the syntax represented in the snippet pack.

## IOS-XE

- `snippets/lldp-to-link-fact-mapping-002.cfg / lldp-map-iosxe-001`
- Observed patterns:
  - `lldp run`
  - `interface GigabitEthernet...`
  - `description ...`

## NX-OS

- `snippets/lldp-to-link-fact-mapping-002.cfg / lldp-map-nxos-002`
- Observed patterns:
  - `feature lldp`
  - `interface Ethernet...`
  - `description ...`

## Junos

- `snippets/lldp-to-link-fact-mapping-002.cfg / lldp-map-junos-003`
- Observed patterns:
  - `protocols lldp { interface all; }`
  - `interfaces ge-...`
  - `address ...`

## Mapping note

- The fact should be driven by LLDP payload fields, not by the presence of
  LLDP enablement alone.
- `remote_chassis_id` and `remote_port_id` are stronger than descriptive
  names, and should carry the higher-confidence note.
