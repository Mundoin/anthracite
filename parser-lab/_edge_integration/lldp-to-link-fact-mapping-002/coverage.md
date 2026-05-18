# LLDP mapping coverage

## Current batch

- Vendor family: mixed Cisco / Juniper
- Prep batch: LLDP to TopologyLinkFact mapping
- Readiness: ready for OCC review, not production-integrated

## Snippet set

- `snippets/lldp-to-link-fact-mapping-002.cfg` section `lldp-map-iosxe-001`
- `snippets/lldp-to-link-fact-mapping-002.cfg` section `lldp-map-nxos-002`
- `snippets/lldp-to-link-fact-mapping-002.cfg` section `lldp-map-junos-003`

## Feature checklist

- LLDP payload fields
- Local and remote endpoint mapping
- Remote chassis and port identifiers
- Confidence and evidence notes
- Duplicate merge behavior
- Unknown-node behavior when system name is absent

## Still missing later

- Live neighbor-table ingestion
- Confidence tuning by field completeness
- Multi-edge collision handling
- Final schema binding

## Readiness

- Safe for OCC review
- Not production-integrated
