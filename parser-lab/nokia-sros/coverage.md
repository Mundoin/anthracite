# Nokia SR OS parser prep coverage

Current vendor: Nokia SR OS
Current prep batch: baseline

## Fixtures in this batch

- `sros-system-routed-001.cfg`
- `sros-vlan-l2-native-002.cfg`
- `sros-note-rich-003.cfg`

## Feature coverage checklist

- [x] system identity
- [x] hostname / system name
- [x] interface basics
- [x] loopback
- [x] routed interfaces
- [x] VLAN/L2 native handling
- [x] static routes
- [x] management-plane hints
- [x] note-only ACL markers
- [x] note-only NAT markers
- [x] note-only QoS markers
- [x] note-only AAA markers
- [x] note-only security markers
- [x] note-only routing markers

## Missing areas to prep later

- deeper service model
- access-control specifics
- NAT specifics
- QoS specifics
- AAA / user management specifics
- routing protocols
- multi-service VPN details

## Integration readiness

Ready for OCC review, not production-integrated.

