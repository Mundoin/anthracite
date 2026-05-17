# 0004 — HOME mode deferred to a dedicated navigation-IA stage

**Date:** 2026-05-17
**Status:** accepted
**Stage:** V1W-R
**Supersedes:** —
**Superseded by:** —

## Context

The V1W proposal (now halted) introduced a `home` ModeId as the
default landing surface and demoted the existing `hierarchy`
foundation to a normal mode. Pre-implementation verification of the
actual repo state showed that:

- `ModeRail` already declares 11 ModeIds in 4 groups (Foundation /
  Run / Governance / Workshop) with the `rail-foot` Ops Console.
- `App.tsx` defaults to `activeMode = "hierarchy"` and renders a
  full hierarchy / environments dashboard at root.
- Adding `home` would force coordinated choices about ModeRail
  group placement, hierarchy demotion, default-mode policy, and
  the existing D1/D2 dashboard's place in the navigation IA.

Those choices belong in a dedicated stage, not bolted on under
V1W. The Architect re-scoped V1W into V1W-R, which deliberately
omits HOME.

## Decision

`home` is **not** added in V1W-R. `hierarchy` remains the default
landing mode. The 11-ModeId catalogue is unchanged.

`home` will be revisited when a dedicated navigation-IA stage
takes up the question of which surface is the foundation, what
`home` would actually contain (router vs. environment switcher vs.
something else), and how the existing hierarchy dashboard
participates.

## Rationale

- The original V1W premise contradicted repo state; pretending
  otherwise would have required destructive edits to ModeRail,
  AppShell, and App.tsx outside any narrow stage scope.
- A landing surface is a product-IA decision, not a side-effect of
  shipping a viewer. Conflating the two costs more than it saves.
- The `assess` ModeId pre-existed in `ModeRail` and had no
  implementation. Giving it concrete semantics (per decision 0005)
  is the smallest possible step toward a third real mode and
  carries no IA consequences.

## Revisit when

- Operator workflow surfaces a need for a non-hierarchy landing.
- A second equally-foundational surface (e.g. Discovery) lands
  and forces a choice between two landing candidates.
- The product narrative explicitly calls for a `home` distinct
  from `hierarchy`.

## Pointers

- `docs/architecture/ASSESS_SURFACE_CONTRACT.md` — V1W-R surface
  scope.
- `obsidian/decisions/0005-assess-is-batchrun-export-viewer.md` —
  paired decision narrowing the `assess` ModeId.
- `obsidian/stages/V1W-R-assess-artifact-viewer.md` — stage note.
