# LLDP to TopologyLinkFact mapping prep

This pack documents how raw LLDP discovery evidence should map into explicit
`TopologyLinkFact` records.

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

## Safe LLDP fields

- `local_node`
- `local_interface`
- `remote_node`
- `remote_interface`
- `remote_chassis_id`
- `remote_port_id`
- `evidence_kind = lldp`
- `evidence_source`
- `confidence`
- `record_state`
- `notes`

## Workflow

1. Keep the LLDP payload intact.
2. Normalize local and remote endpoint names.
3. Keep management address and capabilities as notes unless OCC says otherwise.
4. Merge duplicates from the same endpoint pair.

## Current scope

- Pack: `lldp-to-link-fact-mapping-002`
- Feature area: LLDP evidence mapping
- Vendor mix: Cisco IOS-XE, Cisco NX-OS, Juniper Junos
