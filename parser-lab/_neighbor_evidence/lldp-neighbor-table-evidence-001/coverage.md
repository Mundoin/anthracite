# LLDP neighbor-table coverage

## Current batch

- Vendor family: mixed Cisco / Juniper
- Prep batch: LLDP neighbor-table evidence
- Readiness: ready for OCC review, not production-integrated

## Snippet set

- `snippets/lldp-neighbor-table-evidence-001.txt` section `lldp-table-iosxe-001`
- `snippets/lldp-neighbor-table-evidence-001.txt` section `lldp-table-nxos-002`
- `snippets/lldp-neighbor-table-evidence-001.txt` section `lldp-table-junos-003`

## Feature checklist

- Local interface
- Remote chassis ID
- Remote system name
- Remote port ID
- Management address
- Capability hints
- Duplicate report awareness

## Still missing later

- Live neighbor-table ingestion
- Confidence scoring by field completeness
- Conflict resolution across sources
- Final schema binding

## Readiness

- Safe for OCC review
- Not production-integrated
