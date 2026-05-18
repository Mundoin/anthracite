# Conflicting endpoint coverage

## Current batch

- Vendor family: mixed Cisco / Juniper / Arista
- Prep batch: conflicting remote endpoint rejection
- Readiness: ready for OCC review, not production-integrated

## Snippet set

- `snippets/conflicting-remote-endpoint-fixtures-008.txt` section `conflict-iosxe-001`
- `snippets/conflicting-remote-endpoint-fixtures-008.txt` section `conflict-junos-002`
- `snippets/conflicting-remote-endpoint-fixtures-008.txt` section `conflict-eos-003`

## Feature checklist

- Conflicting remote node detection
- Conflicting remote port detection
- Rejection reason retention
- Raw evidence retention

## Still missing later

- Conflict scoring policy
- Reviewer override workflow
- Final rejected-record storage rules

## Readiness

- Safe for OCC review
- Not production-integrated
