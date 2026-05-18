# Cisco IOS-XE syntax notes

These notes capture the syntax patterns represented in the current
parser-prep batch.

## Interface opener forms

- `iosxe-interface-depth-001.cfg / interface Loopback0`
- `iosxe-interface-depth-001.cfg / interface GigabitEthernet0/0/0`
- `iosxe-subinterface-dot1q-002.cfg / interface GigabitEthernet0/0/0.100`
- `iosxe-portchannel-vlan-003.cfg / interface Port-channel10`
- `iosxe-portchannel-vlan-003.cfg / interface Vlan999`

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

## Channel-group

- `iosxe-portchannel-vlan-003.cfg / interface GigabitEthernet1/0/1`
- `iosxe-portchannel-vlan-003.cfg / interface GigabitEthernet1/0/2`
- `iosxe-portchannel-vlan-003.cfg / interface GigabitEthernet1/0/3`

Observed pattern:

- `channel-group 10 mode active`

## SVI interface VlanX

- `iosxe-portchannel-vlan-003.cfg / interface Vlan999`

Observed pattern:

- `interface Vlan999`
- `ip address 198.51.100.10 255.255.255.0`

## Shutdown / no shutdown

- `iosxe-interface-depth-001.cfg / interface GigabitEthernet0/0/3`
- `iosxe-subinterface-dot1q-002.cfg / interface GigabitEthernet0/0/0.300`
- `iosxe-portchannel-vlan-003.cfg / interface GigabitEthernet1/0/3`

Observed pattern:

- `shutdown`
- `no shutdown`

## Description

- `iosxe-interface-depth-001.cfg / interface GigabitEthernet0/0/0`
- `iosxe-subinterface-dot1q-002.cfg / interface GigabitEthernet0/0/0.100`
- `iosxe-portchannel-vlan-003.cfg / interface Port-channel10`

Notes:

- Descriptions may contain punctuation and should be preserved verbatim.

## IP addressing

- `iosxe-interface-depth-001.cfg / interface Loopback0`
- `iosxe-interface-depth-001.cfg / interface GigabitEthernet0/0/0`
- `iosxe-subinterface-dot1q-002.cfg / interface GigabitEthernet0/0/0.100`
- `iosxe-portchannel-vlan-003.cfg / interface Vlan999`

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
- Any of these lines may be absent in a real device config, so the parser
  should treat them as optional rather than structural.

