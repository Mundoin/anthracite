# evidence-set-replace-policy-001 intent

Purpose: describe evidence-set management expectations for V1AR.
Vendor/platform: Mixed topology-evidence

## replace
- Outcome: replaced
- Rejection/status reason: replace
- Store mutation: replace active_set
- Preserve existing evidence: yes, unless policy says otherwise
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: replace the current active_set only when import succeeds..

## empty
- Outcome: empty_output
- Rejection/status reason: empty_output
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain or report only
- Note: empty import must not wipe current evidence..

## malformed
- Outcome: malformed_output
- Rejection/status reason: malformed_output
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain or report only
- Note: malformed import must not wipe current evidence..

OCC guidance: keep current_evidence safe, preserve source labels, preserve source kinds, keep rejected history visible, and avoid no_store_mutation failures on empty or malformed input.
