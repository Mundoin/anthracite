# static-route-depth-003 syntax notes

## Cisco IOS-XE

- `ip route 0.0.0.0 0.0.0.0 198.51.100.1`
- `ip route vrf MGMT 192.0.2.0 255.255.255.0 198.51.100.3 10`

## Cisco IOS-XR

- `router static`
- `address-family ipv4 unicast`
- `0.0.0.0/0 198.51.100.1`

## Huawei VRP

- `ip route-static 0.0.0.0 0.0.0.0 198.51.100.1`
- `ip route-static 192.0.2.0 255.255.255.0 198.51.100.3 preference 10`

## MikroTik RouterOS

- `/ip route add dst-address=0.0.0.0/0 gateway=198.51.100.1`
- `/ip route add dst-address=203.0.113.0/24 gateway=203.0.113.1 distance=10`

## Fortinet FortiOS

- `config router static`
- `set dst 0.0.0.0/0`
- `set gateway 198.51.100.1`
- `set device "port1"`

## Nokia SR OS

- `configure router Base`
- `static-route-entry 0.0.0.0/0 next-hop 198.51.100.1`
- `static-route-entry 203.0.113.0/24 next-hop 203.0.113.1 preference 20`

