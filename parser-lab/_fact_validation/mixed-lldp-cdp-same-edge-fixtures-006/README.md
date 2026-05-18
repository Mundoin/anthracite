# Mixed LLDP/CDP same-edge fixtures

This pack is parser-prep only. It documents cases where LLDP and CDP report
the same edge and should merge into one `TopologyLinkFact`.

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

## Merge pattern

- LLDP and CDP can both support the same edge.
- LLDP and CDP should collapse into one canonical fact.
- The raw evidence source label should retain both protocols.

## Workflow

1. Preserve both raw protocol reports.
2. Normalize the local and remote endpoints.
3. Merge into one fact if the pair resolves cleanly.
4. Keep both protocol labels in the notes.

## Current scope

- Pack: `mixed-lldp-cdp-same-edge-fixtures-006`
- Feature area: LLDP and CDP same-edge merge
- Vendor mix: Cisco IOS-XE, Cisco NX-OS, Arista EOS

## Safe merge pattern

- LLDP and CDP can describe the same canonical edge.
- The merged fact should preserve both source labels.
- If one source is weaker, keep it as a note rather than a new edge.

## Workflow

1. Preserve both raw protocol reports.
2. Normalize the local and remote endpoints.
3. Merge into one fact if the pair resolves cleanly.
4. Keep both protocol labels in the notes.
5. Leave edge conflicts to the conflicting-endpoint pack.
