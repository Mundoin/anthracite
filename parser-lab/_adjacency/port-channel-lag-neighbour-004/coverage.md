# Port-channel / LAG neighbour coverage

## Current batch

- Vendor family: mixed Cisco / Juniper
- Prep batch: port-channel / LAG neighbour
- Readiness: ready for OCC review, not production-integrated

## Snippet set

- `snippets/port-channel-lag-neighbour-004.cfg` section `lag-iosxe-001`
- `snippets/port-channel-lag-neighbour-004.cfg` section `lag-nxos-002`
- `snippets/port-channel-lag-neighbour-004.cfg` section `lag-junos-003`

## Feature checklist

- Member-interface to bundle membership
- Bundle interface identity
- LACP active state
- Trunk native VLAN and allowed VLANs on the bundle
- Conservative treatment of bundle names as topology evidence

## Still missing later

- Actual neighbor table correlation
- Active/passive negotiation semantics
- Remote system merge for bundles
- STP / forwarding-state semantics
- Duplicate bundle collapse across vendors

## Readiness

- Safe for OCC review
- Not production-integrated
