# Nokia SR OS syntax notes

These notes capture the syntax patterns represented in the current SR OS
baseline batch.

## System identity

- `sros-system-routed-001.cfg / configure system name "sros-core-001"`
- `sros-vlan-l2-native-002.cfg / configure system name "sros-l2-002"`
- `sros-note-rich-003.cfg / configure system name "sros-notes-003"`

Observed pattern:

- `configure system name "..."`.

## Interface basics

- `sros-system-routed-001.cfg / configure port 1/1/1`
- `sros-vlan-l2-native-002.cfg / configure port 1/1/2`
- `sros-note-rich-003.cfg / configure port 1/1/4`

Observed patterns:

- `configure port SLOT/PORT`
- `description "..."`.
- `ethernet`
- `mode access`
- `mode network`

## Routed interfaces

- `sros-system-routed-001.cfg / configure router Base interface "lo0" create`
- `sros-system-routed-001.cfg / configure router Base interface "to-wan" create`
- `sros-note-rich-003.cfg / configure router Base interface "core" create`

Observed patterns:

- `address A.B.C.D/PREFIX`
- `loopback`
- `port 1/1/1`

## VLAN/L2 native handling

- `sros-vlan-l2-native-002.cfg / configure service vpls 100 customer 1 create`
- `sros-vlan-l2-native-002.cfg / sap 1/1/2:100 create`
- `sros-vlan-l2-native-002.cfg / sap 1/1/3:200 create`
- `sros-vlan-l2-native-002.cfg / sap 1/1/3 create`

Observed patterns:

- Service-based L2 constructs.
- Tagged SAP forms.
- Native/untagged SAP form.

## Static routes

- `sros-system-routed-001.cfg / static-route-entry 0.0.0.0/0 next-hop 198.51.100.1`
- `sros-vlan-l2-native-002.cfg / static-route-entry 192.0.2.0/24 next-hop 198.51.100.1`
- `sros-note-rich-003.cfg / static-route-entry 203.0.113.0/24 next-hop 198.51.100.9 preference 20`

Observed pattern:

- `static-route-entry PREFIX next-hop ...`.

## Management-plane hints

- `sros-system-routed-001.cfg`
- `sros-note-rich-003.cfg`

Observed patterns:

- `configure system snmp`
- `configure system security ssh`
- `configure system time ntp`
- `configure system login-control idle-timeout ...`

## Note-only markers

- `sros-system-routed-001.cfg`
- `sros-vlan-l2-native-002.cfg`
- `sros-note-rich-003.cfg`

Observed pattern:

- Comment-only markers for ACL, NAT, QoS, AAA, security, and routing.

