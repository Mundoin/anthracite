# Rejected self-link fixtures

This pack is parser-prep only. It documents neighbour evidence that must be
rejected when the remote endpoint resolves back to the local node.

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

## Rejection pattern

- `self_link`

## Workflow

1. Preserve the raw evidence.
2. Check whether the remote endpoint normalizes to the local node.
3. Reject self-links explicitly.
4. Keep the rejection reason in the notes.

## Current scope

- Pack: `rejected-self-link-fixtures-004`
- Feature area: self-link rejection
- Vendor mix: Cisco IOS-XE, Juniper Junos, Arista EOS
