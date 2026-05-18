# vlan-l2-depth-002 syntax notes

## Cisco IOS-XE

- `vlan 10`
- `interface Vlan99`
- `switchport mode access`
- `switchport voice vlan 20`
- `switchport mode trunk`
- `switchport trunk native vlan 99`
- `switchport trunk allowed vlan 10,20,99-100`

## Cisco IOS-XR

- `interface GigabitEthernet0/0/0/2.100 l2transport`
- `encapsulation dot1q 100`
- `encapsulation dot1q 200 native`
- `l2vpn`
- `bridge-domain BD100`
- `routed interface BVI100`

## Huawei VRP

- `vlan batch 10 20 30 99`
- `port link-type access`
- `port default vlan 10`
- `port link-type trunk`
- `port trunk allow-pass vlan 10 20 30 99`
- `port trunk pvid vlan 99`
- `interface Vlanif10`

## MikroTik RouterOS

- `/interface bridge add name=br-core vlan-filtering=yes`
- `/interface bridge port add ... pvid=10`
- `/interface bridge vlan add ... tagged=br-core,trunk1`
- `/interface vlan add name=vlan30 interface=br-core vlan-id=30`

## Fortinet FortiOS

- `config system interface`
- `edit "VLAN10"`
- `set interface "port2"`
- `set vlanid 10`
- `config system zone`

## Nokia SR OS

- `configure service vpls 100 customer 1 create`
- `sap 1/1/2:100 create`
- `sap 1/1/3 create`
- `interface "irb100" create`

