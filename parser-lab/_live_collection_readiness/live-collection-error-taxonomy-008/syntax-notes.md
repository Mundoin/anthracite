# live-collection-error-taxonomy-008 syntax notes

## Observed shapes
- Error vocabulary
  - auth_failed
  - connection_failed
- Failure behaviour
  - preserve_current_evidence: true
  - no_store_mutation: true

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- error_code
- error_message

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- operator-facing error summary only
