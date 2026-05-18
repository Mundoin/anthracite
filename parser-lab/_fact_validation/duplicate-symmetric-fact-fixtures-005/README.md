# Duplicate symmetric fact fixtures

This pack is parser-prep only. It documents the case where the same edge is
reported twice, once from each side, and should collapse into one canonical
`TopologyLinkFact`.

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

## Merge pattern

- Canonical pair key is symmetric.
- A->B and B->A become one fact.
- Duplicate evidence sources should be retained as notes.

## Workflow

1. Preserve both raw reports.
2. Normalize local and remote endpoints.
3. Collapse the symmetric pair into one fact.
4. Keep source labels and raw evidence references.

## Current scope

- Pack: `duplicate-symmetric-fact-fixtures-005`
- Feature area: symmetric duplicate collapse
- Vendor mix: Cisco IOS-XE, Juniper Junos, Arista EOS
