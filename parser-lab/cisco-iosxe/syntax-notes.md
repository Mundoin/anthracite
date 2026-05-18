# Cisco IOS-XE syntax notes

These notes capture the syntax patterns represented in the current
parser-prep batch.

## Interface opener forms

- `iosxe-interface-depth-001.cfg / interface Loopback0`
- `iosxe-interface-depth-001.cfg / interface GigabitEthernet0/0/0`
- `iosxe-subinterface-dot1q-002.cfg / interface GigabitEthernet0/0/0.100`
- `iosxe-portchannel-vlan-003.cfg / interface Port-channel10`
- `iosxe-portchannel-vlan-003.cfg / interface Vlan999`
- `iosxe-vlan-database-004.cfg / interface Vlan10`
- `iosxe-access-trunk-voice-005.cfg / interface Vlan99`
- `iosxe-l2-edgecases-006.cfg / interface Vlan200`

Notes:

- Physical, loopback, subinterface, port-channel, and SVI forms all
  appear in the same vendor family.
- Subinterfaces use a dotted suffix on the parent interface name.

## Subinterface dot1Q

- `iosxe-subinterface-dot1q-002.cfg / interface GigabitEthernet0/0/0.100`
- `iosxe-subinterface-dot1q-002.cfg / interface GigabitEthernet0/0/0.999`

Observed pattern:

- `encapsulation dot1Q 100`
- `encapsulation dot1Q 999 native`

## Switchport mode access/trunk

- `iosxe-interface-depth-001.cfg / interface GigabitEthernet0/0/1`
- `iosxe-interface-depth-001.cfg / interface GigabitEthernet0/0/2`

Observed pattern:

- `switchport mode access`
- `switchport access vlan 10`
- `switchport mode trunk`
- `switchport trunk native vlan 999`
- `switchport trunk allowed vlan 10,20,30`

Additional VLAN/L2 forms:

- `switchport voice vlan 30`
- `switchport trunk allowed vlan 10-40`
- `switchport trunk allowed vlan 10,20,99-100`
- `switchport trunk allowed vlan 200-220`

## Channel-group

- `iosxe-portchannel-vlan-003.cfg / interface GigabitEthernet1/0/1`
- `iosxe-portchannel-vlan-003.cfg / interface GigabitEthernet1/0/2`
- `iosxe-portchannel-vlan-003.cfg / interface GigabitEthernet1/0/3`

Observed pattern:

- `channel-group 10 mode active`

## SVI interface VlanX

- `iosxe-portchannel-vlan-003.cfg / interface Vlan999`
- `iosxe-vlan-database-004.cfg / interface Vlan10`
- `iosxe-vlan-database-004.cfg / interface Vlan20`
- `iosxe-vlan-database-004.cfg / interface Vlan30`
- `iosxe-access-trunk-voice-005.cfg / interface Vlan99`
- `iosxe-access-trunk-voice-005.cfg / interface Vlan100`
- `iosxe-l2-edgecases-006.cfg / interface Vlan200`
- `iosxe-l2-edgecases-006.cfg / interface Vlan210`
- `iosxe-l2-edgecases-006.cfg / interface Vlan220`

Observed pattern:

- `interface Vlan999`
- `ip address 198.51.100.10 255.255.255.0`

## Shutdown / no shutdown

- `iosxe-interface-depth-001.cfg / interface GigabitEthernet0/0/3`
- `iosxe-subinterface-dot1q-002.cfg / interface GigabitEthernet0/0/0.300`
- `iosxe-portchannel-vlan-003.cfg / interface GigabitEthernet1/0/3`
- `iosxe-vlan-database-004.cfg / interface Vlan20`
- `iosxe-access-trunk-voice-005.cfg / interface GigabitEthernet1/0/25`
- `iosxe-l2-edgecases-006.cfg / interface Vlan210`
- `iosxe-l2-edgecases-006.cfg / interface GigabitEthernet2/0/3`

Observed pattern:

- `shutdown`
- `no shutdown`

## Description

- `iosxe-interface-depth-001.cfg / interface GigabitEthernet0/0/0`
- `iosxe-subinterface-dot1q-002.cfg / interface GigabitEthernet0/0/0.100`
- `iosxe-portchannel-vlan-003.cfg / interface Port-channel10`
- `iosxe-vlan-database-004.cfg / interface Vlan10`
- `iosxe-access-trunk-voice-005.cfg / interface GigabitEthernet1/0/1`
- `iosxe-l2-edgecases-006.cfg / interface Vlan210`

Notes:

- Descriptions may contain punctuation and should be preserved verbatim.

## IP addressing

- `iosxe-interface-depth-001.cfg / interface Loopback0`
- `iosxe-interface-depth-001.cfg / interface GigabitEthernet0/0/0`
- `iosxe-subinterface-dot1q-002.cfg / interface GigabitEthernet0/0/0.100`
- `iosxe-portchannel-vlan-003.cfg / interface Vlan999`
- `iosxe-vlan-database-004.cfg / interface Vlan10`
- `iosxe-access-trunk-voice-005.cfg / interface Vlan99`
- `iosxe-l2-edgecases-006.cfg / interface Vlan200`

Observed patterns:

- `ip address A.B.C.D MASK`
- `ipv6 address 2001:db8::1/64`

## MTU

- `iosxe-interface-depth-001.cfg / interface GigabitEthernet0/0/0`
- `iosxe-subinterface-dot1q-002.cfg / interface GigabitEthernet0/0/0`

Observed pattern:

- `mtu 1500`
- `mtu 1522`

## Speed / duplex

- `iosxe-interface-depth-001.cfg / interface GigabitEthernet0/0/0`
- `iosxe-interface-depth-001.cfg / interface GigabitEthernet0/0/1`
- `iosxe-interface-depth-001.cfg / interface GigabitEthernet0/0/2`

Observed patterns:

- `speed 1000`
- `speed auto`
- `duplex full`
- `duplex auto`

## Ambiguous or optional lines

- `iosxe-subinterface-dot1q-002.cfg / interface GigabitEthernet0/0/0.999`
  includes `service-policy input PREP-QOS-IN` as a note-only risk marker.
- `iosxe-portchannel-vlan-003.cfg / interface Port-channel10` includes a
  spanning-tree hint line.
- `iosxe-vlan-database-004.cfg / interface GigabitEthernet0/3` includes
  `spanning-tree portfast trunk`.
- `iosxe-access-trunk-voice-005.cfg / interface GigabitEthernet1/0/2`
  includes `spanning-tree bpduguard enable`.
- `iosxe-l2-edgecases-006.cfg / interface GigabitEthernet2/0/4` includes
  `no cdp enable`.
- Any of these lines may be absent in a real device config, so the parser
  should treat them as optional rather than structural.

## VLAN database / L2-specific notes

- `iosxe-vlan-database-004.cfg / vlan 10`
- `iosxe-vlan-database-004.cfg / vlan 20`
- `iosxe-vlan-database-004.cfg / vlan 30`
- `iosxe-vlan-database-004.cfg / vlan 40`
- `iosxe-vlan-database-004.cfg / vlan 999`
- `iosxe-access-trunk-voice-005.cfg / vlan 10`
- `iosxe-access-trunk-voice-005.cfg / vlan 20`
- `iosxe-access-trunk-voice-005.cfg / vlan 99`
- `iosxe-access-trunk-voice-005.cfg / vlan 100`
- `iosxe-l2-edgecases-006.cfg / vlan 200`
- `iosxe-l2-edgecases-006.cfg / vlan 210`
- `iosxe-l2-edgecases-006.cfg / vlan 220`

Observed pattern:

- `vlan N`
- `name TEXT`
- `switchport voice vlan N`
- `switchport trunk allowed vlan 200-220`

