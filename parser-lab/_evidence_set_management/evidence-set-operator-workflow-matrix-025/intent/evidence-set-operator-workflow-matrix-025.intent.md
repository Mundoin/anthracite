# evidence-set-operator-workflow-matrix-025 intent

Purpose: describe evidence-set management expectations for V1AR.
Vendor/platform: Mixed topology-evidence

## review
- Outcome: accepted
- Rejection/status reason: accepted
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: workflow begins with review..

## import
- Outcome: accepted
- Rejection/status reason: accepted
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: workflow continues with import..

## clear
- Outcome: clear
- Rejection/status reason: clear
- Store mutation: clear active_set
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: workflow ends with explicit clear or keep..

OCC guidance: keep current_evidence safe, preserve source labels, preserve source kinds, keep rejected history visible, and avoid no_store_mutation failures on empty or malformed input.
