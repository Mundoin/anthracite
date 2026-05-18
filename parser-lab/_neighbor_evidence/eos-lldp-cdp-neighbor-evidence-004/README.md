# EOS LLDP/CDP neighbor evidence prep

This pack is parser-prep only. It documents how Arista EOS neighbor evidence
should be read when OCC later converts it into explicit `TopologyLinkFact`
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

## Safe EOS evidence

- Local interface
- Remote chassis or system name
- Remote port ID
- Management address
- LLDP capability hints
- CDP capability hints where present
- Evidence notes and confidence

## Workflow

1. Preserve the raw EOS output.
2. Normalize the local interface and remote endpoint names.
3. Keep capability hints and management address as notes.
4. Treat CDP as cautious note-only evidence if the remote node is not clearly
   resolved.
5. Merge duplicate reports for the same endpoint pair.

## Current scope

- Pack: `eos-lldp-cdp-neighbor-evidence-004`
- Feature area: EOS LLDP and CDP neighbor evidence
- Vendor mix: Arista EOS
