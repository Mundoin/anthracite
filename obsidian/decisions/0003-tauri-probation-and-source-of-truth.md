# 0003 — Tauri on Probation, Source of Truth Established

- **Date:** 2026-05-15
- **Status:** Accepted
- **Stage:** V1B — Source of Truth and Architecture Map
- **Authors:** Bujar, Claude

## Context

Anthracite V1 is a clean-room rebuild of an already functional product
(old PyQt Anthracite at `D:\Repos\_NEXUS`). Prior framing in `README.md`,
`PRODUCT.md`, and `GOALS.md` over-indexed on topology as the front door
and did not capture:

- the full mode set (HOME, BUILD, OPERATE, DIAGNOSE, INTELLIGENCE,
  FORGE, ASSESS),
- the engine roster behind those modes,
- the deterministic-only rule (no LLM in product logic in V1),
- the industrial visual law,
- the conditions under which the chosen stack remains acceptable.

Without a single source of truth, future stages risk drifting toward
"just build a screen" or "topology-first" — both of which break the
product the team is rebuilding.

## Decision

1. **Adopt** `docs/architecture/ANTHRACITE_V1_SOURCE_OF_TRUTH.md` as
   Anthracite V1 doctrine. It supersedes prior framing where they
   conflict. Top-level docs (`README.md`, `PRODUCT.md`, `AGENTS.md`,
   `CLAUDE.md`, `GOALS.md`) point at it.
2. **Adopt** the mode set in the source-of-truth as the V1 mode set.
   HOME (Environment Command Centre) is the front door, not topology.
3. **Adopt** the engine roster and engine/API-first rule
   (`ENGINE_AND_API_BOUNDARIES.md`). Modes are surfaces, engines own
   logic.
4. **Adopt** deterministic-only product logic for V1. No LLM or fuzzy
   heuristic inside engines. Cortex Command Engine is deterministic in
   V1; any future LLM-driven Cortex sits outside the engine boundary.
5. **Adopt** the dependency-first build sequence (`BUILD_SEQUENCE.md`).
   Foundation before mode depth.
6. **Adopt** the industrial visual law (`INDUSTRIAL_VISUAL_LAW.md`) as a
   screenshot gate enforced at every visible stage.
7. **Continue with Tauri 2 on probation**. Tauri remains the stack only
   while the acceptance criteria in
   `STACK_DECISION_TAURI_PROBATION.md` hold.

## Reason

- The team needs a single doctrine before the cockpit grows. Without it,
  every stage re-litigates what the product is.
- The old product is real and proves the mode/engine map; codifying it
  is cheaper than re-deriving it from screens.
- Tauri's iteration speed is the right trade for an architecture-risk
  stage like V1, **provided** the visual law holds. The probation clause
  keeps that trade honest.

## Risk

- **Visual proof risk.** If the screenshot gate fails repeatedly, Tauri
  probation triggers a stack reconsideration. Mitigation: enforce the
  visual law at every visible stage, not at the end.
- **Doctrine drift.** Source of truth must be read before stages, not
  after. Mitigation: AGENTS.md and CLAUDE.md require stages to cite the
  sections they obey.
- **Old-repo gravity.** Pressure to copy code from `_NEXUS`. Mitigation:
  hard rule already in place; this decision reinforces it.

## Acceptance gate

Tauri stays only if, at the cockpit checkpoint:

- Visual law passes Bujar's screenshot review consistently,
- Topology renders credibly at the 400-device target,
- Rust owns engines, React stays out of domain logic, Babylon stays a
  renderer.

Any of those failing triggers a fresh decision record and a stack
reconsideration.

## Consequences

- New: `docs/architecture/ANTHRACITE_V1_SOURCE_OF_TRUTH.md`,
  `docs/architecture/MODES_AND_ENGINES_MAP.md`,
  `docs/architecture/ENGINE_AND_API_BOUNDARIES.md`,
  `docs/architecture/BUILD_SEQUENCE.md`,
  `docs/architecture/STACK_DECISION_TAURI_PROBATION.md`,
  `docs/design/INDUSTRIAL_VISUAL_LAW.md`,
  this decision,
  `obsidian/stages/V1B-source-of-truth-and-architecture-map.md`.
- Updated (small pointers only): `README.md`, `PRODUCT.md`, `AGENTS.md`,
  `CLAUDE.md`, `GOALS.md`.
- Future stages must cite the source-of-truth sections they obey.
- Topology-first framing is deprecated where it appears in older docs.
