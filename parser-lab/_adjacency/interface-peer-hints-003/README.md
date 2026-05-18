# Interface peer hints adjacency prep

This pack is parser-prep only. It documents how interface names, descriptions,
and routed-link context can hint at a peer without becoming a topology edge on
their own.

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
2. Use syntax notes to keep interface syntax truthful.
3. Treat descriptions and naming as hints only.
4. Leave edge promotion to OCC.

## Current scope

- Pack: `interface-peer-hints-003`
- Feature area: interface-derived peer hints
- Vendor mix: Cisco IOS-XR, Arista EOS, Nokia SR OS
