# eos-cdp-detail-006 intent

Purpose: describe raw neighbour-output import expectations for V1AP.
Vendor/platform: Arista EOS
Style: conservative-cdp
Truth note: illustrative synthetic evidence payload.

## accepted
- Outcome: accepted
- Rejection reason: none
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: exact inventory match only.

## unsupported
- Outcome: unsupported_format
- Rejection reason: unsupported_format
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: shape is illustrative synthetic evidence payload.

## reject
- Outcome: conflicting_remote_endpoint
- Rejection reason: conflicting_remote_endpoint
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: LLDP and CDP disagree for the same local port.

OCC guidance: preserve parsed, accepted, rejected, stored, stale, duplicate, and conflict information without inventing topology edges from hints alone.
