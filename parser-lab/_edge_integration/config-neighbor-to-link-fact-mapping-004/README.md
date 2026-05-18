# Config-neighbor to TopologyLinkFact mapping prep

This pack documents how config-derived neighbor statements should map into
explicit `TopologyLinkFact` records, or into explicitly rejected candidates
when the evidence is too weak.

## Role split

- Codex prepares corpus, notes, intent, and coverage only.
- OCC owns later bridge integration and record creation.

## Hard boundary

- No Rust edits.
- No frontend edits.
- No `expected.json`.
- No parser version changes.
- No `DeviceModel` edits.
- No validator work.
- No `AGENTS.md` / `CLAUDE.md` edits.
- No commit or push.

## Safe config-neighbor fields

- `local_node`
- `local_interface`
- `remote_node_hint`
- `remote_interface_hint`
- `evidence_kind = config-neighbor`
- `evidence_source = config`
- `confidence`
- `record_state`
- `reject_reason`
- `notes`

## Workflow

1. Keep the raw neighbor statement.
2. Separate routing peers from physical links.
3. Preserve hints without inventing certainty.
4. Reject weak claims with an explicit reason.

## Current scope

- Pack: `config-neighbor-to-link-fact-mapping-004`
- Feature area: config-neighbor mapping and conservative rejection
- Vendor mix: Cisco IOS-XE, Juniper Junos, Arista EOS
