# MikroTik RouterOS syntax notes

These notes capture the syntax patterns represented in the current
RouterOS baseline batch.

## System identity

- `routeros-system-interface-001.cfg / /system identity set name=ros-core-001`
- `routeros-vlan-bridge-002.cfg / /system identity set name=ros-l2-002`
- `routeros-note-rich-003.cfg / /system identity set name=ros-notes-003`

Observed pattern:

- `/system identity set name=...`

## Interface basics

- `routeros-system-interface-001.cfg / /interface ethernet set ...`
- `routeros-vlan-bridge-002.cfg / /interface ethernet set ...`
- `routeros-note-rich-003.cfg / /interface ethernet set ...`

Observed patterns:

- `name=...`
- `interface=...`
- `disabled=no`
- `port=22`

## Bridge and VLAN

- `routeros-system-interface-001.cfg / /interface bridge add ...`
- `routeros-vlan-bridge-002.cfg / /interface bridge add ...`
- `routeros-note-rich-003.cfg / /interface vlan add ...`

Observed patterns:

- `vlan-filtering=yes`
- `pvid=10`
- `frame-types=admit-only-vlan-tagged`
- `ingress-filtering=yes`
- `tagged=bridge,trunk1`
- `untagged=access1`
- `vlan-ids=10,20,30`
- `vlan-id=50`

## Routed interfaces

- `routeros-system-interface-001.cfg / /ip address add ...`
- `routeros-vlan-bridge-002.cfg / /ip address add ...`
- `routeros-note-rich-003.cfg / /ip address add ...`

Observed patterns:

- `address=A.B.C.D/PREFIX`
- `interface=...`

## Static routes

- `routeros-system-interface-001.cfg / /ip route add ...`
- `routeros-vlan-bridge-002.cfg / /ip route add ...`
- `routeros-note-rich-003.cfg / /ip route add ...`

Observed patterns:

- `dst-address=...`
- `gateway=...`
- `distance=N`

## Management-plane hints

- `routeros-system-interface-001.cfg`
- `routeros-vlan-bridge-002.cfg`
- `routeros-note-rich-003.cfg`

Observed patterns:

- `/ip service set ssh disabled=no`
- `/snmp set enabled=yes`
- `/system ntp client set enabled=yes`
- `/ip service set api disabled=yes`

## Note-only markers

- `routeros-system-interface-001.cfg`
- `routeros-vlan-bridge-002.cfg`
- `routeros-note-rich-003.cfg`

Observed pattern:

- Comment-only markers for ACL, NAT, QoS, AAA, security, and routing.

