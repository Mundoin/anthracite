# live-collection-timeout-policy-006 syntax notes

## Observed shapes
- Timeout window
  - timeout_seconds: 30
  - retry_policy: operator_review_only
- Timeout result
  - timeout: true
  - connection_failed: false

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- timeout_seconds
- retry_policy

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- retries remain operator-controlled
