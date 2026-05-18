# live-collection-redaction-policy-007 syntax notes

## Observed shapes
- Redaction examples
  - raw: username admin password hunter2
  - redacted: username <redacted> password <redacted>
- Raw handoff
  - raw_output_preserved: true
  - redaction_notes: stored separately

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- redacted_line
- raw_line_hash

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- secret material is redacted, not interpreted
