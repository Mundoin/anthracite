# Config-derived adjacency risks coverage

## Current batch

- Vendor family: mixed Cisco / Arista / Juniper
- Prep batch: config-derived adjacency risks
- Readiness: ready for OCC review, not production-integrated

## Snippet set

- `snippets/config-derived-adjacency-risks-005.cfg` section `risk-iosxe-001`
- `snippets/config-derived-adjacency-risks-005.cfg` section `risk-eos-002`
- `snippets/config-derived-adjacency-risks-005.cfg` section `risk-junos-003`

## Feature checklist

- BGP neighbor hints
- OSPF interface / area hints
- MLAG peer-link / peer-address hints
- Static route next-hop hints
- Conservative note-only control for non-topology markers

## Still missing later

- Live discovery correlation
- Route-to-topology scoring rules
- Edge direction resolution
- False-positive suppression across protocol families
- Confidence decay for stale config

## Readiness

- Safe for OCC review
- Not production-integrated
