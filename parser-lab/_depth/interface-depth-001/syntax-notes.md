# interface-depth-001 syntax notes

## Cisco IOS-XE

- `hostname xe-intf-001`
- `interface Loopback0`
- `interface GigabitEthernet0/0/0`
- `ip address A.B.C.D MASK`
- `ipv6 address 2001:db8::1/128`
- `no shutdown`

## Cisco IOS-XR

- `hostname xr-intf-001`
- `interface Loopback0`
- `interface GigabitEthernet0/0/0/0`
- `ipv4 address A.B.C.D MASK`
- `ipv6 address 2001:db8::1/128`
- `shutdown` / `no shutdown`

## Huawei VRP

- `system-view`
- `sysname vrp-intf-001`
- `interface Loopback0`
- `interface GigabitEthernet0/0/1`
- `ip address A.B.C.D MASK`
- `undo shutdown`

## MikroTik RouterOS

- `/system identity set name=ros-intf-001`
- `/interface ethernet set [ find default-name=ether1 ] name=wan1`
- `/ip address add address=198.51.100.14/30 interface=wan1`

## Fortinet FortiOS

- `config system global`
- `set hostname "fg-intf-001"`
- `config system interface`
- `set ip A.B.C.D MASK`
- `set role wan`

## Nokia SR OS

- `configure system name "sros-intf-001"`
- `configure port 1/1/1`
- `configure router Base`
- `interface "lo0" create`
- `address 192.0.2.4/32`

