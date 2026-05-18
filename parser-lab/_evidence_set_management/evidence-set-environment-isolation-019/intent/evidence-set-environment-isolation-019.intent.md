# evidence-set-environment-isolation-019 intent

Purpose: describe evidence-set management expectations for V1AR.
Vendor/platform: Mixed topology-evidence

## env-a
- Outcome: accepted
- Rejection/status reason: accepted
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: environment A should not affect environment B..

## env-b
- Outcome: accepted
- Rejection/status reason: accepted
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: each environment keeps its own active_set..

## cross-env
- Outcome: no_store_mutation
- Rejection/status reason: no_store_mutation
- Store mutation: none
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: cross-env bleed must not occur..

OCC guidance: keep current_evidence safe, preserve source labels, preserve source kinds, keep rejected history visible, and avoid no_store_mutation failures on empty or malformed input.
