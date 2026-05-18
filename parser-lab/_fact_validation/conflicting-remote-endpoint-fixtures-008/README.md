# Conflicting remote endpoint fixtures

This pack is parser-prep only. It documents cases where different neighbour
reports disagree on the remote endpoint and should be rejected instead of
merged.

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

- `conflicting_remote_endpoint`

## Workflow

1. Preserve both raw reports.
2. Compare the remote endpoint claims.
3. Reject the candidate if the reports disagree materially.
4. Keep the conflict reason in the notes.

## Current scope

- Pack: `conflicting-remote-endpoint-fixtures-008`
- Feature area: conflicting remote endpoint rejection
- Vendor mix: Cisco IOS-XE, Juniper Junos, Arista EOS
