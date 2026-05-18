# evidence-set-audit-note-format-022 intent

Purpose: describe evidence-set management expectations for V1AR.
Vendor/platform: Mixed topology-evidence

## compact
- Outcome: accepted
- Rejection/status reason: accepted
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: audit note should be compact but explicit..

## reasons
- Outcome: accepted
- Rejection/status reason: accepted
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: audit note should include rejection reasons..

## labels
- Outcome: accepted
- Rejection/status reason: accepted
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: source labels and source kinds should be visible..

OCC guidance: keep current_evidence safe, preserve source labels, preserve source kinds, keep rejected history visible, and avoid no_store_mutation failures on empty or malformed input.
