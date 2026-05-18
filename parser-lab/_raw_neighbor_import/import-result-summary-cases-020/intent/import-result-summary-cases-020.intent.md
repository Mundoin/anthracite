# import-result-summary-cases-020 intent

Purpose: describe raw neighbour-output import expectations for V1AP.
Vendor/platform: Mixed Mixed
Style: summary
Truth note: synthetic import result summary.

## none_available
- Outcome: none_available
- Rejection reason: none_available
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: no safe neighbour evidence imported.

## partial
- Outcome: partial
- Rejection reason: partial
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: some evidence accepted, some rejected or unresolved.

## ready
- Outcome: ready
- Rejection reason: ready
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: batch can proceed with exact-match-only accepted evidence.

OCC guidance: preserve parsed, accepted, rejected, stored, stale, duplicate, and conflict information without inventing topology edges from hints alone.
