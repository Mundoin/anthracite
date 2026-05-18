# evidence-set-multiple-imports-same-env-018 intent

Purpose: describe evidence-set management expectations for V1AR.
Vendor/platform: Mixed topology-evidence

## first
- Outcome: replaced
- Rejection/status reason: replace
- Store mutation: replace active_set
- Preserve existing evidence: yes, unless policy says otherwise
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: first replace sets the active_set..

## second
- Outcome: added
- Rejection/status reason: added
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes, unless policy says otherwise
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: second append or merge adds delta only..

## third
- Outcome: ignored_duplicate
- Rejection/status reason: ignored_duplicate
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes, unless policy says otherwise
- Duplicate collapse: expected
- Rejected record retention: retain in history if helpful
- Note: third duplicate replay is collapsed deterministically..

OCC guidance: keep current_evidence safe, preserve source labels, preserve source kinds, keep rejected history visible, and avoid no_store_mutation failures on empty or malformed input.
