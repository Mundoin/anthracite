# ANTHRACITE_INDEX

Entry point for the Anthracite v1 project memory vault.

## What this vault is

Long-form, markdown-first project memory for **Anthracite** — a living network
intelligence cockpit. This vault is the *narrative* counterpart to the code
and to `PRODUCT.md` / `GOALS.md`.

## Layout

- [`stages/`](./stages/) — one note per build stage (V1A, V1B, V1C, …).
- [`decisions/`](./decisions/) — ADR-style decisions, dated `YYYY-MM-DD-<slug>.md`.
- [`agents/`](./agents/) — agent-specific notes (Claude, Codex, AO).
- [`build-log/`](./build-log/) — chronological session log.

## Stage map

| Stage | Status        | Note |
|-------|---------------|------|
| V1A   | in progress   | [stages/V1A-ground-zero.md](./stages/V1A-ground-zero.md) |
| V1B   | planned       | Topology engine |
| V1C   | planned       | Sentinel skeleton |
| V1D   | planned       | Cortex skeleton |
| V1E   | planned       | Forge skeleton |
| V1F   | planned       | First vertical slice |

## Conventions

- Vault is read-write for both Claude and Codex.
- One note per stage. Stage notes link forward and backward.
- Decisions are dated and never deleted — superseded decisions link to their
  replacement.
- Build log entries are short and chronological. Stage notes are the long form.

## Source-of-truth pointers

- Product: [`../PRODUCT.md`](../PRODUCT.md)
- Goals: [`../GOALS.md`](../GOALS.md)
- Codex: [`../AGENTS.md`](../AGENTS.md)
- Claude: [`../CLAUDE.md`](../CLAUDE.md)
- README: [`../README.md`](../README.md)
