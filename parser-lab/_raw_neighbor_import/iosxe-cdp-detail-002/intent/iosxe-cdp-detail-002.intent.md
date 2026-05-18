# iosxe-cdp-detail-002 intent

Purpose: describe raw neighbour-output import expectations for V1AP.
Vendor/platform: Cisco IOS-XE
Style: cdp-strong
Truth note: real-style.

## accepted
- Outcome: accepted
- Rejection reason: none
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: exact inventory match only.

## duplicate
- Outcome: duplicate_collapsed
- Rejection reason: duplicate_collapsed
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: identical raw neighbour record repeats.

## reject
- Outcome: unknown_remote_node
- Rejection reason: unknown_remote_node
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: Device ID does not resolve exactly.

OCC guidance: preserve parsed, accepted, rejected, stored, stale, duplicate, and conflict information without inventing topology edges from hints alone.
