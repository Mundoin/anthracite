# vendor-output-empty-neighbour-tables-021 intent

Purpose: describe raw neighbour-output expansion expectations for V1AQ.
Vendor/platform: Mixed Mixed
Truth note: synthetic empty-table corpus.

## empty
- Outcome: empty_output
- Rejection reason: empty_output
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: empty neighbour tables are valid and should stay empty..

## blank
- Outcome: empty_output
- Rejection reason: empty_output
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: blank or header-only output remains empty..

## reject
- Outcome: malformed_output
- Rejection reason: malformed_output
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: table corruption is not the same as emptiness..

OCC guidance: preserve parsed, accepted, rejected, stored, empty, stale, duplicate, unsupported, and conflict information without inventing topology edges from hints alone.
