# ospf-bgp-basics-004 syntax notes

## Cisco IOS-XE

- `router ospf 10`
- `router-id 192.0.2.1`
- `network 192.0.2.0 0.0.0.255 area 0`
- `router bgp 65010`
- `neighbor 198.51.100.2 remote-as 65020`
- `address-family ipv4 unicast`

## Cisco IOS-XR

- `router ospf 100`
- `area 0`
- `router bgp 65010`
- `neighbor 198.51.100.2`
- `remote-as 65020`
- `address-family ipv4 unicast`

## Huawei VRP

- `ospf 1`
- `router-id 192.0.2.3`
- `area 0.0.0.0`
- `bgp 65010`
- `peer 198.51.100.2 as-number 65020`
- `ipv4-family unicast`

## Nokia SR OS

- `configure router ospf`
- `area 0.0.0.0`
- `configure router bgp`
- `group "EBGP"`
- `neighbor 198.51.100.2`
- `peer-as 65020`

