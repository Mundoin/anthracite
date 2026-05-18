# nokia-sros-lldp-neighbor-010 intent

Purpose: describe raw neighbour-output import expectations for V1AP.
Vendor/platform: Nokia SR OS
Style: sros-lldp
Truth note: illustrative synthetic evidence payload.

## accepted
- Outcome: accepted
- Rejection reason: none
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: exact inventory match only.

## stale
- Outcome: stale_evidence
- Rejection reason: stale_evidence
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: holdtime or evidence age is too old to trust.

## reject
- Outcome: unsupported_format
- Rejection reason: unsupported_format
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: command shape is only illustrative synthetic evidence payload.

OCC guidance: preserve parsed, accepted, rejected, stored, stale, duplicate, and conflict information without inventing topology edges from hints alone.
