# raw-output-partial-fields-014 intent

Purpose: describe raw neighbour-output import expectations for V1AP.
Vendor/platform: Mixed Mixed
Style: partial
Truth note: synthetic partial-field raw output.

## partial
- Outcome: partial_fields
- Rejection reason: insufficient_evidence
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: some fields are missing but the record may still be evidence.

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
- Note: peer cannot be resolved exactly.

OCC guidance: preserve parsed, accepted, rejected, stored, stale, duplicate, and conflict information without inventing topology edges from hints alone.
