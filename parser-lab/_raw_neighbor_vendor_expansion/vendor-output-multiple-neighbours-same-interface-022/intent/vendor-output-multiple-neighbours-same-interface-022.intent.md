# vendor-output-multiple-neighbours-same-interface-022 intent

Purpose: describe raw neighbour-output expansion expectations for V1AQ.
Vendor/platform: Mixed Mixed
Truth note: synthetic collision corpus.

## accepted
- Outcome: accepted
- Rejection reason: accepted
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: multiple neighbours on one local interface may be legitimate evidence..

## duplicate
- Outcome: duplicate_collapsed
- Rejection reason: duplicate_collapsed
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: identical row repeats collapse deterministically..

## reject
- Outcome: conflicting_remote_endpoint
- Rejection reason: conflicting_remote_endpoint
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: same interface with incompatible remote endpoints must reject..

OCC guidance: preserve parsed, accepted, rejected, stored, empty, stale, duplicate, unsupported, and conflict information without inventing topology edges from hints alone.
