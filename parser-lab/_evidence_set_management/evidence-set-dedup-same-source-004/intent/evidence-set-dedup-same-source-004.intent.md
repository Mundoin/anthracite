# evidence-set-dedup-same-source-004 intent

Purpose: describe evidence-set management expectations for V1AR.
Vendor/platform: Mixed topology-evidence

## same-source
- Outcome: duplicate_collapsed
- Rejection/status reason: duplicate_collapsed
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes, unless policy says otherwise
- Duplicate collapse: expected
- Rejected record retention: retain in history if helpful
- Note: same-source repeats collapse deterministically..

## ignored
- Outcome: ignored_duplicate
- Rejection/status reason: ignored_duplicate
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes, unless policy says otherwise
- Duplicate collapse: expected
- Rejected record retention: retain in history if helpful
- Note: ignored duplicate remains visible in summary..

## no-mutation
- Outcome: no_store_mutation
- Rejection/status reason: no_store_mutation
- Store mutation: none
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: duplicate-only replay should not change active_set..

OCC guidance: keep current_evidence safe, preserve source labels, preserve source kinds, keep rejected history visible, and avoid no_store_mutation failures on empty or malformed input.
