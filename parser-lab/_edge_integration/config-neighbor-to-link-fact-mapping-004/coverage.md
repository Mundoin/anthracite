# Config-neighbor mapping coverage

## Current batch

- Vendor family: mixed Cisco / Juniper / Arista
- Prep batch: config-neighbor to TopologyLinkFact mapping
- Readiness: ready for OCC review, not production-integrated

## Snippet set

- `snippets/config-neighbor-to-link-fact-mapping-004.cfg` section `cfg-neighbor-iosxe-001`
- `snippets/config-neighbor-to-link-fact-mapping-004.cfg` section `cfg-neighbor-junos-002`
- `snippets/config-neighbor-to-link-fact-mapping-004.cfg` section `cfg-neighbor-eos-003`

## Feature checklist

- Routing-peer config statements
- MLAG peer-link and peer-address context
- Remote-node hints and reject reasons
- Manual confirmation notes
- Conservative rejection policy

## Still missing later

- Inventory-based peer resolution
- Live topology merge
- Schema binding for rejected candidates
- Final confidence scoring

## Readiness

- Safe for OCC review
- Not production-integrated
