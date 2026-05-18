# iosxe-lldp-detail-001 intent

Purpose: describe raw neighbour-output import expectations for V1AP.
Vendor/platform: Cisco IOS-XE
Style: lldp-strong
Truth note: real-style.

## accepted
- Outcome: accepted
- Rejection reason: none
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: exact inventory match only.

## partial
- Outcome: partial_fields
- Rejection reason: insufficient_evidence
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: management address is absent but the exact node still resolves.

## reject
- Outcome: self_link
- Rejection reason: self_link
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: remote node resolves back to the local node.

OCC guidance: preserve parsed, accepted, rejected, stored, stale, duplicate, and conflict information without inventing topology edges from hints alone.
