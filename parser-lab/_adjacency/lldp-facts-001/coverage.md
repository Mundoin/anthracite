# LLDP facts coverage

## Current batch

- Vendor family: mixed Cisco / Juniper
- Prep batch: LLDP facts
- Readiness: ready for OCC review, not production-integrated

## Snippet set

- `snippets/lldp-facts-001.cfg` section `lldp-iosxe-001`
- `snippets/lldp-facts-001.cfg` section `lldp-nxos-002`
- `snippets/lldp-facts-001.cfg` section `lldp-junos-003`

## Feature checklist

- LLDP capability enablement
- Interface context that could host discovery neighbors
- Routed and switchport-adjacent interface metadata
- Conservative treatment of real topology edges

## Still missing later

- Actual LLDP neighbor table ingestion
- Remote chassis / port id normalization
- Per-edge confidence rules
- Duplicate neighbor suppression
- Merge rules against config-derived hints

## Readiness

- Safe for OCC review
- Not production-integrated
