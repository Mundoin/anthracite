# Edge rejection and dedup coverage

## Current batch

- Vendor family: mixed Cisco / Juniper / Arista
- Prep batch: edge rejection and dedup policy
- Readiness: ready for OCC review, not production-integrated

## Snippet set

- `snippets/edge-rejection-dedup-policy-005.cfg` section `dedup-iosxe-001`
- `snippets/edge-rejection-dedup-policy-005.cfg` section `dedup-junos-002`
- `snippets/edge-rejection-dedup-policy-005.cfg` section `dedup-eos-003`

## Feature checklist

- Duplicate merge across evidence sources
- Unknown-node rejection
- Self-link rejection
- Conflict handling for contradictory evidence
- Conservative note preservation

## Still missing later

- Production dedup key implementation
- Review override workflow
- Confidence decay logic
- Live topology reconciliation

## Readiness

- Safe for OCC review
- Not production-integrated
