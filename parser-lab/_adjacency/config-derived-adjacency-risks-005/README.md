# Config-derived adjacency risks prep

This pack is parser-prep only. It documents where config can resemble
topology evidence without actually proving a physical or logical edge.

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

1. Read the snippet file and matching intent note.
2. Use syntax notes to keep routing and MLAG syntax truthful.
3. Treat routing, bundle, and peer statements as risk surfaces only.
4. Leave edge promotion to OCC.

## Current scope

- Pack: `config-derived-adjacency-risks-005`
- Feature area: adjacency-like config signals and false-positive control
- Vendor mix: Cisco IOS-XE, Arista EOS, Juniper Junos
