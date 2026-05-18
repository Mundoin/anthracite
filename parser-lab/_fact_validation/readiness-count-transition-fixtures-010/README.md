# Readiness count transition fixtures

This pack is parser-prep only. It documents the validation-state transitions
from `none_available` to `partial` to `ready` as neighbour evidence starts to
produce accepted `TopologyLinkFact` records.

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

## Readiness states

- `none_available`
- `partial`
- `ready`

## Workflow

1. Count accepted, rejected, and unresolved evidence.
2. Track state transition explicitly.
3. Preserve the raw evidence that drove the count.
4. Do not treat counts as topology by themselves.

## Current scope

- Pack: `readiness-count-transition-fixtures-010`
- Feature area: readiness-count transitions
- Vendor mix: mixed Cisco / Juniper / Arista

## Safe transition pattern

- `none_available` means no accepted facts yet.
- `partial` means some accepted facts exist but coverage is incomplete.
- `ready` means the batch has enough accepted facts to proceed.

## Workflow

1. Count accepted, rejected, and unresolved evidence.
2. Track state transition explicitly.
3. Preserve the raw evidence that drove the count.
4. Do not treat counts as topology by themselves.
