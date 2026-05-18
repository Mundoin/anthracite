# LLDP neighbor-table evidence prep

This pack is parser-prep only. It documents how raw LLDP neighbor-table
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

## Safe LLDP evidence

- Local interface
- Remote chassis ID
- Remote system name
- Remote port ID
- Management address, if present
- Capability hints, if present
- Evidence notes and confidence

## Workflow

1. Preserve the raw command output.
2. Normalize local and remote endpoint names.
3. Keep management address and capability hints as notes.
4. Reject unresolved remote nodes conservatively.
5. Merge duplicate reports for the same endpoint pair.

## Current scope

- Pack: `lldp-neighbor-table-evidence-001`
- Feature area: LLDP neighbor-table evidence
- Vendor mix: Cisco IOS-XE, Cisco NX-OS, Juniper Junos
