# raw-output-conflicting-neighbor-cases-017 intent

Purpose: describe raw neighbour-output import expectations for V1AP.
Vendor/platform: Mixed Mixed
Style: conflict
Truth note: synthetic conflicting neighbour output.

## conflict
- Outcome: conflicting_remote_endpoint
- Rejection reason: conflicting_remote_endpoint
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: two exact sources disagree.

## conflict
- Outcome: conflicting_remote_endpoint
- Rejection reason: conflicting_remote_endpoint
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: same local interface points at two different remotes.

## reject
- Outcome: self_link
- Rejection reason: self_link
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: one conflict path resolves to the local node.

OCC guidance: preserve parsed, accepted, rejected, stored, stale, duplicate, and conflict information without inventing topology edges from hints alone.
