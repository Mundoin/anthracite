# vendor-output-import-summary-matrix-025 intent

Purpose: describe raw neighbour-output expansion expectations for V1AQ.
Vendor/platform: Mixed Mixed
Truth note: synthetic summary corpus.

## none_available
- Outcome: none_available
- Rejection reason: none_available
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: no safe evidence imported..

## partial
- Outcome: partial
- Rejection reason: partial
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: some evidence imported but conservative rejections remain..

## ready
- Outcome: ready
- Rejection reason: ready
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: accepted exact-match items exist and unresolved blockers are clear..

OCC guidance: preserve parsed, accepted, rejected, stored, empty, stale, duplicate, unsupported, and conflict information without inventing topology edges from hints alone.
