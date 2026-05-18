# raw-output-malformed-cases-013 intent

Purpose: describe raw neighbour-output import expectations for V1AP.
Vendor/platform: Mixed Mixed
Style: malformed
Truth note: synthetic malformed raw output.

## malformed
- Outcome: malformed_output
- Rejection reason: malformed_output
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: truncated or mangled text.

## partial
- Outcome: insufficient_evidence
- Rejection reason: insufficient_evidence
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: too incomplete to resolve exactly.

## unsupported
- Outcome: unsupported_format
- Rejection reason: unsupported_format
- Extraction focus: local interface, remote system/device name, remote chassis ID where available, remote port ID, management address where available, capability hints, and source label.
- Conservative rule: exact inventory match only; no fuzzy matching, no hostname contains matching, no interface-description promotion, no subnet/VLAN inference.
- Note: mixed prompt/output contamination.

OCC guidance: preserve parsed, accepted, rejected, stored, stale, duplicate, and conflict information without inventing topology edges from hints alone.
