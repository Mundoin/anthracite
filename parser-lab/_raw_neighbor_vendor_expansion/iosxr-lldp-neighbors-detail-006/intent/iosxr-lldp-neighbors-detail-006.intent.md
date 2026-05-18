# iosxr-lldp-neighbors-detail-006 intent

Purpose: describe raw neighbour-output expansion expectations for V1AQ.
Vendor/platform: Cisco IOS-XR
Truth note: illustrative synthetic evidence payload.

## accepted
- Outcome: accepted
- Rejection reason: accepted
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: synthetic IOS-XR detail remains exact-match only..

## unsupported
- Outcome: unsupported_format
- Rejection reason: unsupported_format
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: command shape may remain illustrative synthetic evidence payload..

## reject
- Outcome: malformed_output
- Rejection reason: malformed_output
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: truncated or mangled output must not be recovered by guesswork..

OCC guidance: preserve parsed, accepted, rejected, stored, empty, stale, duplicate, unsupported, and conflict information without inventing topology edges from hints alone.
