# fortios-lldp-status-illustrative-013 intent

Purpose: describe raw neighbour-output expansion expectations for V1AQ.
Vendor/platform: Fortinet FortiOS
Truth note: illustrative synthetic evidence payload.

## unsupported
- Outcome: unsupported_format
- Rejection reason: unsupported_format
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: illustrative status output is guardrail only..

## partial
- Outcome: lower_confidence_source
- Rejection reason: lower_confidence_source
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: status-style hints are evidence notes only..

## reject
- Outcome: self_link
- Rejection reason: self_link
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: resolved peer equals the local node..

OCC guidance: preserve parsed, accepted, rejected, stored, empty, stale, duplicate, unsupported, and conflict information without inventing topology edges from hints alone.
