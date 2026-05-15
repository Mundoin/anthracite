# V1B — Source of Truth and Architecture Map

- **Date:** 2026-05-15
- **Status:** Complete (documentation-only stage)
- **Owner:** Bujar (decisions), Claude (drafting)

## Goal

Establish Anthracite V1 doctrine before any further product coding.
Capture the mode set, the engine roster, the API rule, the deterministic
rule, the visual law, the build sequence, and the conditions under which
the Tauri stack remains acceptable.

This is a **documentation / architecture stage only**. No application
code is touched. No features are added. No `_NEXUS` source is migrated.

## What this stage created

- `docs/architecture/ANTHRACITE_V1_SOURCE_OF_TRUTH.md` — doctrine.
- `docs/architecture/MODES_AND_ENGINES_MAP.md` — modes, workflows,
  consumed engines, cross-mode dependencies. ASSESS top-bar status open.
- `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` — 16 deterministic
  engines, responsibilities, API surfaces, consumers, test requirements,
  ownership boundaries.
- `docs/architecture/BUILD_SEQUENCE.md` — 16-layer dependency-first
  order. Foundation before mode depth.
- `docs/architecture/STACK_DECISION_TAURI_PROBATION.md` — why Tauri
  stays for now, acceptance criteria, failure conditions.
- `docs/design/INDUSTRIAL_VISUAL_LAW.md` — visual law and screenshot
  gate.
- `obsidian/decisions/0003-tauri-probation-and-source-of-truth.md` —
  decision record.
- This stage record.

Pointer updates in `README.md`, `PRODUCT.md`, `AGENTS.md`, `CLAUDE.md`,
`GOALS.md` — small, only referencing the new source-of-truth docs.

## Why this stage matters

- The old product is real. Without a single doctrine, V1 will drift —
  re-deriving the mode set, re-inventing engines, over-indexing on
  topology, or growing domain logic inside screens.
- The visual law is a gate, not a polish phase. Without it, Tauri
  probation has no honest test.
- The engine-first rule is the only way to keep mode surfaces clean as
  capability grows.

## How future agents must use these docs

Every stage proposal (plan, PR, agent prompt) opens by **naming the
sections of `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` it obeys**. Stages that
fail to cite are rejected.

Specifically:

- Do **not** invent modes. The mode set is fixed in §5 of the source of
  truth and detailed in `MODES_AND_ENGINES_MAP.md`. Adding a mode
  requires editing both files first.
- Do **not** assume product structure beyond these docs.
- Do **not** create Claude / Codex prompts unless Bujar asks.
- Do **not** ship a visible stage without a passing screenshot review
  against the visual law.
- Do **not** grow engine-grade logic inside a mode. If two modes need the
  same fact, it belongs in an engine.
- Do **not** place an LLM inside an engine in V1.

## Notes on assumptions made

- ASSESS is recorded as a major top-level workflow and a mode entry. The
  question of an ASSESS top-bar status indicator alongside the mode rail
  is **explicitly left open** in the source of truth and in this stage.
- Older framing in `README.md`, `PRODUCT.md`, and `GOALS.md` that calls
  topology "the crown jewel" is **superseded** by the source-of-truth.
  Those files retain their existing content; pointer notes route readers
  to the new doctrine.
- Sentinel, Reporting, Forge/Knowledge, and Cortex Command engines are
  scheduled to land alongside their first real consumers per
  `BUILD_SEQUENCE.md`, not as a separate up-front layer.

## Validation

- `tools/workspace-status.ps1` ran clean.
- `tools/ops-readiness.ps1` reports `READY`.
- No code changes in `src/` or `src-tauri/`.
- No new dependencies.
- No commits, no pushes.
