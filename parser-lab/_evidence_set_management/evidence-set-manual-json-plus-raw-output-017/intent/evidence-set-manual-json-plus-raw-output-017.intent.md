# evidence-set-manual-json-plus-raw-output-017 intent

Purpose: describe evidence-set management expectations for V1AR.
Vendor/platform: Mixed topology-evidence

## raw
- Outcome: accepted
- Rejection/status reason: accepted
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: raw-output source remains raw-output..

## json
- Outcome: accepted
- Rejection/status reason: accepted
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: structured JSON source remains structured JSON..

## mixed
- Outcome: unsupported_format
- Rejection/status reason: unsupported_format
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain or report only
- Note: mixed payloads should stay conservative if shape is unclear..

OCC guidance: keep current_evidence safe, preserve source labels, preserve source kinds, keep rejected history visible, and avoid no_store_mutation failures on empty or malformed input.
