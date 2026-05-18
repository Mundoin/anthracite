# TopologyLinkFact contract prep

This pack defines the prep-time contract for turning raw LLDP, CDP,
config-neighbor, and manual evidence into explicit `TopologyLinkFact`
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

## Contract goal

Keep one fact shape across evidence sources:

- `local_node`
- `local_interface`
- `remote_node` or `remote_node_hint`
- `remote_interface` or `remote_interface_hint`
- `evidence_kind`
- `evidence_source`
- `confidence`
- `record_state`
- `notes`
- `raw_evidence_ref`

## Workflow

1. Read the raw evidence or config hint.
2. Preserve the raw line or section reference.
3. Normalize endpoint names before deduping.
4. Keep unknown or self-linked candidates explicit.
5. Reject weak topology claims instead of inventing certainty.

## Current scope

- Pack: `topology-link-fact-contract-001`
- Feature area: TopologyLinkFact contract and evidence taxonomy
- Vendor mix: Cisco IOS-XE, Juniper Junos, Arista EOS
