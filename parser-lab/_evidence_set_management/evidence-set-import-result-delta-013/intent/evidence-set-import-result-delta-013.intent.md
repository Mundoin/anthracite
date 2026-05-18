# evidence-set-import-result-delta-013 intent

Purpose: describe evidence-set management expectations for V1AR.
Vendor/platform: Mixed topology-evidence

## added
- Outcome: added
- Rejection/status reason: added
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes, unless policy says otherwise
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: delta shows newly added evidence..

## replaced
- Outcome: replaced
- Rejection/status reason: replaced
- Store mutation: replace active_set
- Preserve existing evidence: yes, unless policy says otherwise
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: delta shows replaced evidence explicitly..

## ignored
- Outcome: ignored_duplicate
- Rejection/status reason: ignored_duplicate
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes, unless policy says otherwise
- Duplicate collapse: expected
- Rejected record retention: retain in history if helpful
- Note: delta shows ignored duplicates deterministically..

OCC guidance: keep current_evidence safe, preserve source labels, preserve source kinds, keep rejected history visible, and avoid no_store_mutation failures on empty or malformed input.
