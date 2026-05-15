# 0001 — Agent Operating Layer must land before V1 product coding

**Status:** accepted (2026-05-15).
**Stage:** V1A (amended).

## Decision

Anthracite V1 product coding (V1B onward) starts only after the Agent
Operating Layer is green inside `D:\Repos\anthracite`:

- Graphify installed, wired for Claude (Windows) and Codex, with a generated
  `graphify-out/GRAPH_REPORT.md` and `graphify-out/graph.json` for this repo.
- AgentOps installed: Claude plugin, Codex install, `ao` CLI on PATH.
- `ao doctor` clean (or only documented warnings).
- `.agents/` rig initialized with at least a README.
- `AGENTS.md` and `CLAUDE.md` carry the Claude / Codex role split.
- `tools/ops-readiness.ps1` reports `READY`.

This is a **hard gate**, not a recommendation.

## Role split (locked at this decision)

- **Bujar** — product owner; final judge; only commit/push authority.
- **Claude** — main coding agent (architecture, Tauri / React / Babylon / Rust
  implementation, refactors, product-shaping decisions).
- **Codex** — admin / operations agent (status, Graphify refresh, AO probes,
  validation scripts, handoff packaging, docs/index upkeep, hygiene).

Codex absorbs menial repo work so Claude is preserved for product value.

## Context

V1A is the ground-zero repo factory. The risk of skipping the operating-layer
gate is that agents start writing product code before:

- They can see the codebase (Graphify).
- They leave evidence (AO).
- Their handoffs are reproducible (AO + Obsidian).
- Bujar acts as a manual relay between Claude and Codex.

Skipping the layer collapses the agentic model back into "one agent doing
everything by hand". This decision forecloses that path.

## Consequences

- V1A scope is amended to include the operating layer.
- `docs/operations/AGENT_OPERATING_LAYER.md` exists and is canonical.
- `tools/ops-readiness.ps1` exists and is the mechanical truth signal.
- Until ops-readiness reports `READY`, agents prioritize layer work over
  product work.
- Graphify and AO are first-class dependencies, documented in `AGENTS.md` /
  `CLAUDE.md` / `README.md`.

## Supersedes

Nothing. First decision in the new vault that touches the agent layer
specifically; complements `2026-05-15-stack-lock.md` (which locks the *code*
stack).
