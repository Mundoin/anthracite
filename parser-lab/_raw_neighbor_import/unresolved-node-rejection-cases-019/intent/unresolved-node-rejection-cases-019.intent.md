# unresolved-node-rejection-cases-019 intent

Purpose: describe raw neighbour-output import expectations for V1AP.
Vendor/platform: Mixed Mixed
Style: unresolved
Truth note: synthetic unresolved node cases.

## reject
- Outcome: unknown_local_node
- Rejection reason: unknown_local_node
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: local endpoint cannot be resolved exactly.

## reject
- Outcome: unknown_remote_node
- Rejection reason: unknown_remote_node
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: remote endpoint cannot be resolved exactly.

## reject
- Outcome: insufficient_evidence
- Rejection reason: insufficient_evidence
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: evidence is too weak to trust.

OCC guidance: preserve parsed, accepted, rejected, stored, stale, duplicate, and conflict information without inventing topology edges from hints alone.
