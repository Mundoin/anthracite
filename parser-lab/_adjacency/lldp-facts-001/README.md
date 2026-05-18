# LLDP facts adjacency prep

This pack is parser-prep only. It documents how LLDP-capable configs and
interface context should be treated when OCC later turns discovery evidence
into real topology edges.

## Role split

- Codex prepares corpus, notes, intent, and coverage only.
- OCC owns later integration into the topology pipeline.

## Hard boundary

- No Rust edits.
- No frontend edits.
- No `expected.json`.
- No parser version changes.
- No `DeviceModel` edits.
- No validator work.
- No `AGENTS.md` / `CLAUDE.md` edits.
- No commit or push.

## Workflow

1. Read the snippet file and the matching intent note.
2. Use the syntax notes to keep adjacency evidence truthful.
3. Treat LLDP enablement as support signal, not an edge by itself.
4. Leave real edge resolution to OCC.

## Current scope

- Pack: `lldp-facts-001`
- Feature area: LLDP-enabled adjacency support
- Vendor mix: Cisco IOS-XE, Cisco NX-OS, Juniper Junos
