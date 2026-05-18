# evidence-set-rejected-record-retention-011 intent

Purpose: describe evidence-set management expectations for V1AR.
Vendor/platform: Mixed topology-evidence

## unknown-local
- Outcome: rejected_unknown_local
- Rejection/status reason: rejected_unknown_local
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain or report only
- Note: rejected records remain visible for audit..

## self-link
- Outcome: rejected_self_link
- Rejection/status reason: rejected_self_link
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain or report only
- Note: self-link rejections are retained or reported only..

## stale
- Outcome: stale_evidence
- Rejection/status reason: stale_evidence
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain or report only
- Note: stale evidence is tracked separately from active evidence..

OCC guidance: keep current_evidence safe, preserve source labels, preserve source kinds, keep rejected history visible, and avoid no_store_mutation failures on empty or malformed input.
