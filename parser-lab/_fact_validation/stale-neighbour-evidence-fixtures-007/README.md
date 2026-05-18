# Stale neighbour evidence fixtures

This pack is parser-prep only. It documents neighbour evidence that should be
treated as stale or downgraded because the report age is too old or the
evidence no longer looks current.

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

## Rejection pattern

- `stale_evidence`

## Workflow

1. Preserve the raw stale report.
2. Record the age or holdtime note.
3. Reject or downgrade stale evidence per OCC policy.
4. Keep the raw evidence for later confirmation.

## Current scope

- Pack: `stale-neighbour-evidence-fixtures-007`
- Feature area: stale evidence handling
- Vendor mix: Cisco IOS-XE, Juniper Junos, Arista EOS

## Safe handling pattern

- Keep the raw evidence and the age note.
- Reject or downgrade stale evidence explicitly.
- Do not let stale data overwrite fresher resolved facts.

## Workflow

1. Preserve the stale report.
2. Record the age or holdtime note.
3. Reject or downgrade per OCC policy.
4. Keep the raw evidence for later confirmation.
