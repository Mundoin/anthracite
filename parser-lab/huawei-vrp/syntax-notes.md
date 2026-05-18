# Huawei VRP syntax notes

These notes capture the syntax patterns represented in the current VRP
baseline batch.

## System / identity

- `huawei-vrp-system-l2-001.cfg / system-view`
- `huawei-vrp-system-l2-001.cfg / sysname VRP-BASE-001`
- `huawei-vrp-vlan-trunk-edge-002.cfg / sysname VRP-EDGE-002`
- `huawei-vrp-system-note-rich-003.cfg / sysname VRP-NOTES-003`

Observed patterns:

- `system-view`
- `sysname NAME`

## Interface basics

- `huawei-vrp-system-l2-001.cfg / interface GigabitEthernet0/0/1`
- `huawei-vrp-vlan-trunk-edge-002.cfg / interface GigabitEthernet0/0/6`
- `huawei-vrp-system-note-rich-003.cfg / interface GigabitEthernet0/0/8`

Observed patterns:

- `description TEXT`
- `ip address A.B.C.D MASK`
- `undo shutdown`
- `shutdown`
- `undo portswitch`

## VLAN / SVI

- `huawei-vrp-system-l2-001.cfg / vlan batch 10 20 30 99`
- `huawei-vrp-vlan-trunk-edge-002.cfg / vlan batch 100 110 120 200 210`
- `huawei-vrp-system-note-rich-003.cfg / vlan batch 300 310 320 330`

Observed patterns:

- `vlan batch N N N`
- `interface Vlanif10`
- `interface Vlanif100`
- `interface Vlanif300`

## Access ports

- `huawei-vrp-system-l2-001.cfg / interface GigabitEthernet0/0/2`
- `huawei-vrp-vlan-trunk-edge-002.cfg / interface GigabitEthernet0/0/4`
- `huawei-vrp-system-note-rich-003.cfg / interface GigabitEthernet0/0/9`

Observed patterns:

- `port link-type access`
- `port default vlan N`
- `stp edged-port enable`

## Trunk ports

- `huawei-vrp-system-l2-001.cfg / interface GigabitEthernet0/0/3`
- `huawei-vrp-vlan-trunk-edge-002.cfg / interface GigabitEthernet0/0/5`
- `huawei-vrp-system-note-rich-003.cfg / interface GigabitEthernet0/0/10`

Observed patterns:

- `port link-type trunk`
- `port trunk allow-pass vlan 10 20 30 99`
- `port trunk allow-pass vlan 100 110 120 to 130 200 210`
- `port trunk allow-pass vlan 300 310 320 330`
- `port trunk pvid vlan N`

## Static routes

- `huawei-vrp-system-l2-001.cfg / ip route-static 0.0.0.0 0.0.0.0 198.51.100.1`
- `huawei-vrp-vlan-trunk-edge-002.cfg / ip route-static 0.0.0.0 0.0.0.0 203.0.113.1`
- `huawei-vrp-system-note-rich-003.cfg / ip route-static 0.0.0.0 0.0.0.0 198.51.100.9`

Observed patterns:

- `ip route-static DEST MASK GATEWAY`
- `ip route-static DEST MASK GATEWAY preference N`

## Dot1q / subinterface edge

- `huawei-vrp-vlan-trunk-edge-002.cfg / interface GigabitEthernet0/0/7.100`

Observed patterns:

- `dot1q termination vid 100`
- `arp broadcast enable`

## Note-only markers

- `huawei-vrp-system-l2-001.cfg`
- `huawei-vrp-vlan-trunk-edge-002.cfg`
- `huawei-vrp-system-note-rich-003.cfg`

Observed pattern:

- Comment-only hints for ACL, NAT, QoS, AAA, and VPN coverage.

