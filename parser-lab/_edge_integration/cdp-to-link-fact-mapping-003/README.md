# CDP to TopologyLinkFact mapping prep

This pack documents how raw Cisco CDP evidence should map into explicit
`TopologyLinkFact` records.

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

## Safe CDP fields

- `local_node`
- `local_interface`
- `remote_node`
- `remote_interface`
- `evidence_kind = cdp`
- `evidence_source`
- `confidence`
- `record_state`
- `notes`

## Workflow

1. Keep the CDP payload intact.
2. Normalize device-id and port-id fields.
3. Treat platform and capabilities as evidence notes.
4. Merge duplicate records from the same endpoint pair.

## Current scope

- Pack: `cdp-to-link-fact-mapping-003`
- Feature area: CDP evidence mapping
- Vendor mix: Cisco IOS-XE, Cisco NX-OS
