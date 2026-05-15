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
| V1A   | complete      | [stages/V1A-ground-zero.md](./stages/V1A-ground-zero.md) |
| V1B   | complete      | Source of truth + architecture map |
| V1C   | complete      | [stages/V1C-environment-centre-spine.md](./stages/V1C-environment-centre-spine.md) |
| V1D   | complete      | [stages/V1D-environment-persistence.md](./stages/V1D-environment-persistence.md) |
| V1E   | complete      | [stages/V1E-environment-readiness.md](./stages/V1E-environment-readiness.md) |
| V1E-B | complete      | [stages/V1E-B-graphite-light.md](./stages/V1E-B-graphite-light.md) |
| V1F   | planned       | Next engine (AAA / shared domain — TBD) |

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
