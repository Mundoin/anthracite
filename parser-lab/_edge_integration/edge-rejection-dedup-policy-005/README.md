# Edge rejection and dedup policy prep

This pack defines the conservative policy for merging duplicate topology
signals and rejecting weak ones before they become `TopologyLinkFact`
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

## Policy goals

- Merge the same endpoint pair from LLDP, CDP, config hints, and manual notes.
- Keep one fact per real edge, not one fact per source.
- Reject self-links and unknown-node claims unless a synthetic note says the
  example is intentionally incomplete.
- Prefer conservative rejection over speculative promotion.

## Workflow

1. Normalize endpoint names.
2. Build a stable pair key.
3. Merge supporting evidence.
4. Reject self-links and weak unknown-node claims.
5. Preserve the rejection reason in the notes.

## Current scope

- Pack: `edge-rejection-dedup-policy-005`
- Feature area: dedup and rejection policy
- Vendor mix: Cisco IOS-XE, Juniper Junos, Arista EOS
