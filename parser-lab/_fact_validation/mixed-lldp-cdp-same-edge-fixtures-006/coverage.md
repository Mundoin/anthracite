# Mixed LLDP/CDP coverage

## Current batch

- Vendor family: mixed Cisco / Arista
- Prep batch: LLDP and CDP same-edge merge
- Readiness: ready for OCC review, not production-integrated

## Snippet set

- `snippets/mixed-lldp-cdp-same-edge-fixtures-006.txt` section `mixed-iosxe-001`
- `snippets/mixed-lldp-cdp-same-edge-fixtures-006.txt` section `mixed-nxos-002`
- `snippets/mixed-lldp-cdp-same-edge-fixtures-006.txt` section `mixed-eos-note-003`

## Feature checklist

- LLDP and CDP on the same edge
- Protocol-source retention
- Canonical merge
- Note-only fallback for illustrative cases

## Still missing later

- Policy for protocol disagreement
- Stale source weighting
- Final confidence merge

## Readiness

- Safe for OCC review
- Not production-integrated
