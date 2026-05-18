# Cisco IOS-XR syntax notes

These notes capture the syntax patterns represented in the current
IOS-XR baseline batch.

## Hostname and system identity

- `iosxr-system-routed-001.cfg / hostname xr-core-001`
- `iosxr-vlan-l2-native-002.cfg / hostname xr-l2-002`
- `iosxr-note-rich-003.cfg / hostname xr-notes-003`

Observed pattern:

- `hostname NAME`

## Interface opener forms

- `iosxr-system-routed-001.cfg / interface Loopback0`
- `iosxr-system-routed-001.cfg / interface GigabitEthernet0/0/0/0`
- `iosxr-vlan-l2-native-002.cfg / interface GigabitEthernet0/0/0/2.100 l2transport`
- `iosxr-vlan-l2-native-002.cfg / interface BVI100`
- `iosxr-note-rich-003.cfg / interface TenGigE0/0/0/0`

Observed patterns:

- `interface Loopback0`
- `interface GigabitEthernet...`
- `interface ... l2transport`
- `interface BVI100`

## Subinterface and dot1q

- `iosxr-vlan-l2-native-002.cfg / interface GigabitEthernet0/0/0/2.100 l2transport`
- `iosxr-vlan-l2-native-002.cfg / interface GigabitEthernet0/0/0/2.200 l2transport`

Observed patterns:

- `encapsulation dot1q 100`
- `encapsulation dot1q 200 native`
- `rewrite ingress tag pop 1 symmetric`

## Routed interfaces

- `iosxr-system-routed-001.cfg / interface GigabitEthernet0/0/0/0`
- `iosxr-system-routed-001.cfg / interface GigabitEthernet0/0/0/1`
- `iosxr-note-rich-003.cfg / interface TenGigE0/0/0/0`

Observed patterns:

- `ipv4 address A.B.C.D MASK`
- `no shutdown`
- `shutdown`

## Static routes

- `iosxr-system-routed-001.cfg / router static`
- `iosxr-vlan-l2-native-002.cfg / router static`
- `iosxr-note-rich-003.cfg / router static`

Observed pattern:

- `router static`
- `address-family ipv4 unicast`
- `prefix next-hop`

## Management-plane hints

- `iosxr-system-routed-001.cfg`
- `iosxr-note-rich-003.cfg`

Observed patterns:

- `ssh server v2`
- `netconf-yang agent ssh`
- `snmp-server community ...`
- `ntp server vrf Mgmt-intf ...`
- `logging host ...`

## Note-only markers

- `iosxr-system-routed-001.cfg`
- `iosxr-vlan-l2-native-002.cfg`
- `iosxr-note-rich-003.cfg`

Observed pattern:

- Comment-only markers for ACL, NAT, QoS, AAA, security, and routing.

