# Cisco IOS-XR parser prep coverage

Current vendor: Cisco IOS-XR
Current prep batch: baseline

## Fixtures in this batch

- `iosxr-system-routed-001.cfg`
- `iosxr-vlan-l2-native-002.cfg`
- `iosxr-note-rich-003.cfg`

## Feature coverage checklist

- [x] hostname / system identity
- [x] loopback
- [x] routed physical interface
- [x] IPv4 address
- [x] IPv6 address
- [x] static routes
- [x] management-plane hints
- [x] L2 subinterfaces
- [x] dot1q / native VLAN marker
- [x] BVI routed termination
- [x] note-only ACL markers
- [x] note-only NAT markers
- [x] note-only QoS markers
- [x] note-only AAA markers
- [x] note-only security markers
- [x] note-only routing markers

## Missing areas to prep later

- deeper bridge-domain modeling
- VLAN database style constructs
- policy-map / class-map details
- AAA / user-domain specifics
- NAT specifics
- routing protocols
- service policing and telemetry depth

## Integration readiness

Ready for OCC review, not production-integrated.

