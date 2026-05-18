# Accepted LLDP coverage

## Current batch

- Vendor family: mixed Cisco / Juniper / Arista
- Prep batch: accepted LLDP facts
- Readiness: ready for OCC review, not production-integrated

## Snippet set

- `snippets/accepted-lldp-fact-fixtures-001.txt` section `accepted-lldp-iosxe-001`
- `snippets/accepted-lldp-fact-fixtures-001.txt` section `accepted-lldp-nxos-002`
- `snippets/accepted-lldp-fact-fixtures-001.txt` section `accepted-lldp-junos-003`
- `snippets/accepted-lldp-fact-fixtures-001.txt` section `accepted-lldp-eos-004`

## Feature checklist

- Local interface
- Remote chassis / system name
- Remote port ID
- Management address
- Capability hints
- Source label retention

## Still missing later

- Final topology edge creation
- Live reconciliation against inventory
- Stale-evidence handling
- Duplicate merge policy

## Readiness

- Safe for OCC review
- Not production-integrated
