# TopologyLinkFact contract coverage

## Current batch

- Vendor family: mixed Cisco / Juniper / Arista
- Prep batch: TopologyLinkFact contract
- Readiness: ready for OCC review, not production-integrated

## Snippet set

- `snippets/topology-link-fact-contract-001.cfg` section `contract-iosxe-001`
- `snippets/topology-link-fact-contract-001.cfg` section `contract-junos-002`
- `snippets/topology-link-fact-contract-001.cfg` section `contract-eos-003`

## Feature checklist

- Required field set
- Evidence source and evidence kind
- Canonical endpoint normalization
- Duplicate key strategy
- Unknown-node handling
- Self-link rejection
- Conservative rejection markers

## Still missing later

- Schema binding in the topology pipeline
- Persistence and reviewer override workflow
- Live discovery merge
- Final confidence scoring rules

## Readiness

- Safe for OCC review
- Not production-integrated
