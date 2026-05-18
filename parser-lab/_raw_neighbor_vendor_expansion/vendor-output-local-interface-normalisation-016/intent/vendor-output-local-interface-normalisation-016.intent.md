# vendor-output-local-interface-normalisation-016 intent

Purpose: describe raw neighbour-output expansion expectations for V1AQ.
Vendor/platform: Mixed Mixed
Truth note: synthetic normalisation corpus.

## iosxe-nxos
- Outcome: accepted
- Rejection reason: accepted
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: local interface names normalise exactly only..

## junos
- Outcome: accepted
- Rejection reason: accepted
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: unit suffixes remain part of the exact interface identity..

## eos
- Outcome: accepted
- Rejection reason: accepted
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: canonical interface labels should stay precise..

OCC guidance: preserve parsed, accepted, rejected, stored, empty, stale, duplicate, unsupported, and conflict information without inventing topology edges from hints alone.
