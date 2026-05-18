# Junos LLDP neighbor evidence prep

This pack is parser-prep only. It documents how Junos LLDP neighbor evidence
should be read when OCC later converts it into explicit `TopologyLinkFact`
records.

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

## Safe Junos LLDP evidence

- Local interface
- Remote chassis ID
- Remote system name
- Remote port ID
- Management address
- Capability hints
- Evidence notes and confidence

## Workflow

1. Preserve the raw Junos output.
2. Normalize the local unit and remote endpoint names.
3. Keep management address and capabilities as notes.
4. Reject unresolved or stale nodes conservatively.
5. Merge duplicate reports from the same endpoint pair.

## Current scope

- Pack: `junos-lldp-neighbor-evidence-003`
- Feature area: Junos LLDP neighbor evidence
- Vendor mix: Juniper Junos
