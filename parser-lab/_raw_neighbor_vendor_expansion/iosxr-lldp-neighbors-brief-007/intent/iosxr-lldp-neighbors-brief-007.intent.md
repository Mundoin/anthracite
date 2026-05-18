# iosxr-lldp-neighbors-brief-007 intent

Purpose: describe raw neighbour-output expansion expectations for V1AQ.
Vendor/platform: Cisco IOS-XR
Truth note: illustrative synthetic evidence payload.

## accepted
- Outcome: accepted
- Rejection reason: accepted
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: brief LLDP still resolves exactly if identity is exact..

## partial
- Outcome: insufficient_evidence
- Rejection reason: insufficient_evidence
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: brief output may not carry enough fields to resolve..

## reject
- Outcome: unknown_remote_node
- Rejection reason: unknown_remote_node
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: peer name cannot be resolved exactly..

OCC guidance: preserve parsed, accepted, rejected, stored, empty, stale, duplicate, unsupported, and conflict information without inventing topology edges from hints alone.
