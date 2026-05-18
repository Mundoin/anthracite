# Rejected unknown-node fixtures

This pack is parser-prep only. It documents neighbour evidence that must be
rejected when the remote node, local node, or evidence strength is not safe
enough for a `TopologyLinkFact`.

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

## Rejection patterns

- `unknown_remote_node`
- `unknown_local_node`
- `insufficient_evidence`

## Workflow

1. Preserve the raw evidence.
2. Record why the node could not be resolved.
3. Reject the fact instead of guessing.
4. Keep the raw evidence for later correlation.

## Current scope

- Pack: `rejected-unknown-node-fixtures-003`
- Feature area: unknown-node rejection
- Vendor mix: Cisco IOS-XE, Juniper Junos, Arista EOS
