# live-collection-device-credential-boundary-004 syntax notes

## Observed shapes
- Credential boundary
  - username: <redacted>
  - password: <redacted>
- Authentication failure
  - auth_failed: true
  - message: authentication rejected by device

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- redacted_username
- redacted_password

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- credential failure details stay in error notes only
