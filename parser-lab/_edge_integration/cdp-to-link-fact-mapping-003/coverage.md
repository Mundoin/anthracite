# CDP mapping coverage

## Current batch

- Vendor family: Cisco-only
- Prep batch: CDP to TopologyLinkFact mapping
- Readiness: ready for OCC review, not production-integrated

## Snippet set

- `snippets/cdp-to-link-fact-mapping-003.cfg` section `cdp-map-iosxe-001`
- `snippets/cdp-to-link-fact-mapping-003.cfg` section `cdp-map-nxos-002`

## Feature checklist

- CDP payload fields
- Device-id and port-id mapping
- Local and remote endpoint mapping
- Confidence and evidence notes
- Duplicate merge behavior
- Unknown-node and self-link rejection

## Still missing later

- Live CDP table ingestion
- Cisco-only merge policy with LLDP
- Final schema binding

## Readiness

- Safe for OCC review
- Not production-integrated
