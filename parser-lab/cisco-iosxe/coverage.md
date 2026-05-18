# Cisco IOS-XE parser prep coverage

Current vendor: Cisco IOS-XE
Current prep batch: interface-depth

## Fixtures in this batch

- `iosxe-interface-depth-001.cfg`
- `iosxe-subinterface-dot1q-002.cfg`
- `iosxe-portchannel-vlan-003.cfg`

## Feature coverage checklist

- [x] hostname
- [x] loopback interface
- [x] routed physical interface
- [x] switchport access interface
- [x] switchport trunk interface
- [x] shutdown / no shutdown
- [x] descriptions
- [x] IPv4 address
- [x] IPv6 address
- [x] MTU
- [x] speed / duplex
- [x] parent interface
- [x] multiple subinterfaces
- [x] `encapsulation dot1Q`
- [x] native VLAN case on subinterface
- [x] Port-channel
- [x] member interfaces with `channel-group`
- [x] trunk allowed VLANs
- [x] trunk native VLAN
- [x] VLAN interface / SVI
- [x] spanning-tree hint line

## Missing areas to prep later

- VLAN / L2 deeper
- static routes
- OSPF / BGP basics
- ACL
- NAT
- QoS
- AAA / management plane
- VPN / tunnels

## Integration readiness

Ready for OCC review, not production-integrated.

