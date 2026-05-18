# iosxr-lldp-neighbors-008 intent

Purpose: describe raw neighbour-output import expectations for V1AP.
Vendor/platform: Cisco IOS-XR
Style: iosxr-lldp
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
- Note: command shape remains illustrative synthetic evidence payload.

## reject
- Outcome: malformed_output
- Rejection reason: malformed_output
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: truncated or mangled lines are not safe to parse.

OCC guidance: preserve parsed, accepted, rejected, stored, stale, duplicate, and conflict information without inventing topology edges from hints alone.
