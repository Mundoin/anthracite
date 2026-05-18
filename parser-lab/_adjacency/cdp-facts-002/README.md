# CDP facts adjacency prep

This pack is parser-prep only. It documents how Cisco CDP-capable configs
should be handled when OCC later merges topology evidence.

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

1. Read the snippet file and the intent note.
2. Use the syntax notes to keep CDP syntax truthful.
3. Treat CDP enablement as a support signal, not a topology edge.
4. Leave remote neighbor resolution to OCC.

## Current scope

- Pack: `cdp-facts-002`
- Feature area: CDP support and adjacency hints
- Vendor mix: Cisco IOS-XE and Cisco NX-OS
