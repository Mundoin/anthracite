# fortios-lldp-neighbor-011 intent

Purpose: describe raw neighbour-output import expectations for V1AP.
Vendor/platform: Fortinet FortiOS
Style: fortios-lldp
Truth note: unsupported until V1AP confirms the real command shape.

## unsupported
- Outcome: unsupported_format
- Rejection reason: unsupported_format
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: this format stays unsupported until V1AP confirms the real command shape.

## partial
- Outcome: insufficient_evidence
- Rejection reason: insufficient_evidence
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: not enough exact fields to resolve a node.

## reject
- Outcome: unknown_remote_node
- Rejection reason: unknown_remote_node
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: generic neighbour name cannot be resolved exactly.

OCC guidance: preserve parsed, accepted, rejected, stored, stale, duplicate, and conflict information without inventing topology edges from hints alone.
