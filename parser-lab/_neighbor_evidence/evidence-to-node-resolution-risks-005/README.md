# Evidence-to-node resolution risks prep

This pack documents the cases where neighbor evidence cannot safely be tied
to a real node, or where duplicate and stale reports should be rejected
instead of promoted.

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

## Risk goals

- Show unresolved remote nodes explicitly.
- Show stale and duplicate evidence explicitly.
- Show self-link rejection explicitly.
- Preserve a rejection reason rather than guessing.

## Workflow

1. Preserve the raw evidence.
2. Compare local interface and remote endpoint claims.
3. Reject unresolved or self-linked candidates.
4. Keep duplicate evidence grouped.
5. Record why node resolution failed.

## Current scope

- Pack: `evidence-to-node-resolution-risks-005`
- Feature area: node-resolution risks and rejection policy
- Vendor mix: Cisco IOS-XE, Juniper Junos, Arista EOS
