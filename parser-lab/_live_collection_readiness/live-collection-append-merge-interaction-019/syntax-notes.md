# live-collection-append-merge-interaction-019 syntax notes

## Observed shapes
- Append
  - append: added evidence only
  - ignored_duplicate: reported
- Merge
  - merge: collapse duplicates
  - conflicting_remote_endpoint: retained

## Safe parsing
- command_allowlist
- operator_initiated
- dry_run_preview
- raw_output
- source_label
- source_kind
- exact_inventory_match
- append
- merge
- duplicate_collapsed
- conflicting_remote_endpoint

## Evidence-only notes
- management address exact-match notes only if the inventory schema supports it
- capability hints stay as evidence notes
- redaction notes stay separate from raw text
- unsupported or deferred platforms stay conservative
- replace remains explicit and operator-controlled
