# evidence-set-merge-policy-003 intent

Purpose: describe evidence-set management expectations for V1AR.
Vendor/platform: Mixed topology-evidence

## merge
- Outcome: added
- Rejection/status reason: added
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes, unless policy says otherwise
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: merge combines compatible evidence..

## conflict
- Outcome: conflicting_remote_endpoint
- Rejection/status reason: conflicting_remote_endpoint
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain or report only
- Note: conflicts are preserved, not silently overwritten..

## duplicate
- Outcome: duplicate_collapsed
- Rejection/status reason: duplicate_collapsed
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes, unless policy says otherwise
- Duplicate collapse: expected
- Rejected record retention: retain in history if helpful
- Note: exact duplicates collapse deterministically..

OCC guidance: keep current_evidence safe, preserve source labels, preserve source kinds, keep rejected history visible, and avoid no_store_mutation failures on empty or malformed input.
