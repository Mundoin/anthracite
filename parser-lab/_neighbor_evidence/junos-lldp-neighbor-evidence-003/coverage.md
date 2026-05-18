# Junos LLDP coverage

## Current batch

- Vendor family: Juniper only
- Prep batch: Junos LLDP neighbor evidence
- Readiness: ready for OCC review, not production-integrated

## Snippet set

- `snippets/junos-lldp-neighbor-evidence-003.txt` section `junos-lldp-001`
- `snippets/junos-lldp-neighbor-evidence-003.txt` section `junos-lldp-002`

## Feature checklist

- Local interface
- Remote chassis ID
- Remote system name
- Remote port ID
- Management address
- Capability hints
- Duplicate report awareness

## Still missing later

- Live Junos neighbor-table ingestion
- Confidence scoring by field completeness
- Conflict resolution against config hints
- Final schema binding

## Readiness

- Safe for OCC review
- Not production-integrated
