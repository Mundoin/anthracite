# evidence-set-duplicate-collapsed-policy-016 intent

Purpose: describe evidence-set management expectations for V1AR.
Vendor/platform: Mixed topology-evidence

## same-source
- Outcome: duplicate_collapsed
- Rejection/status reason: duplicate_collapsed
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes, unless policy says otherwise
- Duplicate collapse: expected
- Rejected record retention: retain in history if helpful
- Note: same-source duplicate collapse is explicit..

## cross-source
- Outcome: duplicate_collapsed
- Rejection/status reason: duplicate_collapsed
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes, unless policy says otherwise
- Duplicate collapse: expected
- Rejected record retention: retain in history if helpful
- Note: cross-source exact collapse is explicit..

## summary
- Outcome: accepted
- Rejection/status reason: accepted
- Store mutation: append/merge/dedup according to policy
- Preserve existing evidence: yes
- Duplicate collapse: context-dependent
- Rejected record retention: retain in history if helpful
- Note: summary should count duplicate-collapsed rows separately if helpful..

OCC guidance: keep current_evidence safe, preserve source labels, preserve source kinds, keep rejected history visible, and avoid no_store_mutation failures on empty or malformed input.
