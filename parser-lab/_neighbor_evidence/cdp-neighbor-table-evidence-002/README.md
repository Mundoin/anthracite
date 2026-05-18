# CDP neighbor-table evidence prep

This pack is parser-prep only. It documents how raw Cisco CDP neighbor-table
evidence should be read when OCC later converts it into explicit
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

## Safe CDP evidence

- Local interface
- Device ID
- Remote port ID
- Capability hints
- IP address, if present
- Evidence notes and confidence

## Workflow

1. Preserve the raw command output.
2. Normalize device-id and interface names.
3. Keep capability hints and IP address as notes.
4. Reject self-links and unresolved peers conservatively.
5. Merge duplicates for the same endpoint pair.

## Current scope

- Pack: `cdp-neighbor-table-evidence-002`
- Feature area: CDP neighbor-table evidence
- Vendor mix: Cisco IOS-XE, Cisco NX-OS
