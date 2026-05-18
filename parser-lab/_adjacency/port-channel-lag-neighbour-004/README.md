# Port-channel / LAG neighbour prep

This pack is parser-prep only. It documents how bundle membership, trunk
settings, and LACP state can support future topology work without becoming a
remote edge by themselves.

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
2. Use syntax notes to keep LAG syntax truthful.
3. Treat bundle membership as local association only.
4. Leave remote edge resolution to OCC.

## Current scope

- Pack: `port-channel-lag-neighbour-004`
- Feature area: port-channel / LAG membership and peer context
- Vendor mix: Cisco IOS-XE, Cisco NX-OS, Juniper Junos
