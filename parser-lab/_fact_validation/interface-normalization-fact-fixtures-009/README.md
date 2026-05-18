# Interface normalization fact fixtures

This pack is parser-prep only. It documents how interface names should
normalize across vendors before a `TopologyLinkFact` is accepted.

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

## Normalization goal

- Keep the local interface stable across casing and naming variants.
- Preserve the original spelling in the notes.
- Accept only when the remote node is still resolvable after normalization.

## Workflow

1. Preserve the raw interface spelling.
2. Normalize the interface name deterministically.
3. Accept only if the neighbor still resolves.
4. Keep the original spelling in notes.

## Current scope

- Pack: `interface-normalization-fact-fixtures-009`
- Feature area: interface name normalization
- Vendor mix: Cisco IOS-XE, Cisco NX-OS, Juniper Junos, Arista EOS, Cisco IOS-XR, Nokia SR OS

## Normalization goal

- Normalize spelling and casing without losing the original label.
- Keep the local-interface note stable across vendors.
- Accept only when the remote node stays resolvable after normalization.

## Workflow

1. Preserve the raw interface spelling.
2. Normalize the interface name deterministically.
3. Accept only if the neighbor still resolves.
4. Keep the original spelling in notes.
