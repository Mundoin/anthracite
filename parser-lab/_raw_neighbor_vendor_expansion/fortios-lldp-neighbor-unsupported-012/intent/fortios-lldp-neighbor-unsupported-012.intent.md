# fortios-lldp-neighbor-unsupported-012 intent

Purpose: describe raw neighbour-output expansion expectations for V1AQ.
Vendor/platform: Fortinet FortiOS
Truth note: unsupported until V1AQ confirms the real command shape.

## unsupported
- Outcome: unsupported_format
- Rejection reason: unsupported_format
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: FortiOS LLDP is not confirmed here and must stay unsupported..

## partial
- Outcome: insufficient_evidence
- Rejection reason: insufficient_evidence
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: not enough exact fields to resolve a node..

## reject
- Outcome: unknown_remote_node
- Rejection reason: unknown_remote_node
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: generic neighbour labels must not invent a node..

OCC guidance: preserve parsed, accepted, rejected, stored, empty, stale, duplicate, unsupported, and conflict information without inventing topology edges from hints alone.
