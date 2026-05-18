# Huawei VRP parser prep coverage

Current vendor: Huawei VRP
Current prep batch: baseline

## Fixtures in this batch

- `huawei-vrp-system-l2-001.cfg`
- `huawei-vrp-vlan-trunk-edge-002.cfg`
- `huawei-vrp-system-note-rich-003.cfg`

## Feature coverage checklist

- [x] system identity
- [x] hostname
- [x] interface basics
- [x] VLAN interfaces
- [x] access ports
- [x] trunk ports
- [x] VLAN batches / ranges
- [x] static routes
- [x] SVI variants
- [x] routed-interface edge
- [x] note-only ACL markers
- [x] note-only NAT markers
- [x] note-only QoS markers
- [x] note-only AAA markers
- [x] note-only VPN markers
- [x] STP hint lines

## Missing areas to prep later

- deeper ACL syntax
- NAT specifics
- QoS details
- AAA / authentication schemes
- VPN / tunnel syntax
- routing protocols
- management-plane specifics

## Integration readiness

Ready for OCC review, not production-integrated.

