# mikrotik-neighbor-discovery-012 intent

Purpose: describe raw neighbour-output import expectations for V1AP.
Vendor/platform: MikroTik RouterOS
Style: mikrotik-discovery
Truth note: lower-confidence neighbour-discovery source.

## accepted
- Outcome: accepted
- Rejection reason: none
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: lower-confidence neighbour-discovery source still needs exact inventory resolution.

## duplicate
- Outcome: duplicate_collapsed
- Rejection reason: duplicate_collapsed
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: same discovery record appears more than once.

## reject
- Outcome: conflicting_remote_endpoint
- Rejection reason: conflicting_remote_endpoint
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: identity or address changes across observations.

OCC guidance: preserve parsed, accepted, rejected, stored, stale, duplicate, and conflict information without inventing topology edges from hints alone.
