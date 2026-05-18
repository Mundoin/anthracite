# Accepted CDP fact fixtures

This pack is parser-prep only. It documents the Cisco CDP neighbour evidence
shapes that should become accepted `TopologyLinkFact` records.

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

## Safe acceptance pattern

- Local interface is known.
- Device ID is known.
- Remote port ID is known.
- IP address and capability hints are retained as notes.
- The same neighbour can be accepted from multiple Cisco outputs.

## Workflow

1. Preserve the raw CDP evidence.
2. Normalize device-id and interface names.
3. Accept only when the remote node is resolvable.
4. Keep notes for IP address, capabilities, and source label.
5. Leave unknown or self-linked cases to the rejection packs.

## Current scope

- Pack: `accepted-cdp-fact-fixtures-002`
- Feature area: accepted CDP facts
- Vendor mix: Cisco IOS-XE, Cisco NX-OS
