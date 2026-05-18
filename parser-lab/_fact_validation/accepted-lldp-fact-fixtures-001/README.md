# Accepted LLDP fact fixtures

This pack is parser-prep only. It documents the LLDP neighbour evidence
shapes that should become accepted `TopologyLinkFact` records after the
parser-to-topology bridge runs.

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
- Remote chassis or system name is known.
- Remote port ID is known.
- Management address and capability hints are retained as notes.
- The same neighbour can be accepted from multiple vendor outputs.

## Workflow

1. Preserve the raw neighbour evidence.
2. Normalize local and remote endpoint names.
3. Accept only when the remote node is resolvable.
4. Keep notes for management address, capabilities, and source label.
5. Leave conflicting or incomplete cases to the rejection packs.

## Current scope

- Pack: `accepted-lldp-fact-fixtures-001`
- Feature area: accepted LLDP facts
- Vendor mix: Cisco IOS-XE, Cisco NX-OS, Juniper Junos, Arista EOS
