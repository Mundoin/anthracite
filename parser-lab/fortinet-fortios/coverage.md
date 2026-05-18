# Fortinet FortiOS parser prep coverage

Current vendor: Fortinet FortiOS
Current prep batch: baseline

## Fixtures in this batch

- `fortios-system-interface-zone-001.cfg`
- `fortios-routing-objects-002.cfg`
- `fortios-vpn-sdwan-notes-003.cfg`

## Feature coverage checklist

- [x] system/global
- [x] hostname
- [x] interfaces
- [x] VLAN interfaces
- [x] zones
- [x] static routes
- [x] firewall address objects
- [x] firewall service objects
- [x] basic firewall policies
- [x] NAT markers
- [x] VPN hints note-only
- [x] SD-WAN hints note-only
- [x] interface roles / aliases
- [x] zone membership
- [x] policy log markers

## Missing areas to prep later

- deeper VPN / SD-WAN syntax
- security profiles
- HA / cluster
- VIP / published services
- routing protocols
- explicit policy object schema decisions

## Integration readiness

Ready for OCC review, not production-integrated.

