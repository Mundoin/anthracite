# junos-lldp-neighbors-detail-003 intent

Purpose: describe raw neighbour-output expansion expectations for V1AQ.
Vendor/platform: Juniper Junos
Truth note: real-style.

## accepted
- Outcome: accepted
- Rejection reason: accepted
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: real-style Junos LLDP detail with exact inventory match only..

## duplicate
- Outcome: duplicate_collapsed
- Rejection reason: duplicate_collapsed
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: reverse-direction evidence collapses..

## reject
- Outcome: stale_evidence
- Rejection reason: stale_evidence
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: aged output should remain conservative..

OCC guidance: preserve parsed, accepted, rejected, stored, empty, stale, duplicate, unsupported, and conflict information without inventing topology edges from hints alone.
