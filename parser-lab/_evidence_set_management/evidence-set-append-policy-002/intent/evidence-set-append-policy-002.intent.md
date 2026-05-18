# evidence-set-append-policy-002 intent

Purpose: describe evidence-set management expectations for V1AR.
Vendor/platform: Mixed topology-evidence

## append
- Outcome: added
- Rejection/status reason: added
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes, unless policy says otherwise
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: append keeps current_evidence and adds new rows..

## duplicate
- Outcome: ignored_duplicate
- Rejection/status reason: ignored_duplicate
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes, unless policy says otherwise
- Duplicate collapse: expected
- Rejected record retention: retain in history if helpful
- Note: duplicate rows are ignored or collapsed deterministically..

## rejected
- Outcome: rejected
- Rejection/status reason: rejected_unknown_remote
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain or report only
- Note: rejected rows are retained or reported only..

OCC guidance: keep current_evidence safe, preserve source labels, preserve source kinds, keep rejected history visible, and avoid no_store_mutation failures on empty or malformed input.
