# V1BD — Topology Hardware Doctrine Merge

**Date:** 2026-05-23
**Status:** landed (doctrine only; no runtime port yet)
**Scope:** doctrine reconciliation between desk design board and model kit v0
**Branch:** `main` at `30186ce` → working tree
**Authority:** Bujar (ruled on all seven divergences)

## Goal

Resolve the seven drift points between
`design-review/anthracite-topology-hardware-desk-design-board/` and
`design-review/anthracite-topology-hardware-model-kit-v0/` so the next stage
(runtime port into Anthracite Vite/Tauri) starts from a single consistent
contract.

## Inputs read (every letter)

- Desk: README, MANIFEST, 7 contract files, preview index.html + 2 CSS, 4 storyboard JSX
- Kit: README, MANIFEST, 4 contract files, 10 `src/*.ts`, preview HTML/CSS, optional-glb stubs

## Decisions and files (see decision record)

See `obsidian/decisions/2026-05-23-topology-hardware-doctrine-merge.md` for the seven
decisions and the file-by-file delta.

Summary:

| Decision                          | Files touched |
|-----------------------------------|---------------|
| Zone taxonomy → 10 kinds          | desk taxonomy + kit id contract |
| Single role→glyph→model map       | desk role-map + kit selection-map |
| UNK is real profile (`unk1u`)     | desk node-family + kit selection-map + kit `hardwareProfiles.ts` |
| Mesh ID `<modelId>.<zone>.<idx>`  | desk babylon-notes |
| Transition lifecycle              | desk interaction-state-machine |
| DETAIL payload triad              | desk interaction-state-machine |
| GLB optional only                 | (no change — restated in decision)|

Plus a thin runtime patch:
- `buildHardwareModel.ts` — `screen` and `label` cases now dense-index per profile;
  non-`vendorPlate` labels become pickable.

## Acceptance

- Desk contract files and kit contract files reference each other and agree on the
  10-kind taxonomy, mesh ID format, and UNK profile.
- `unk1u` exists in `hardwareProfiles.ts` with a generic 1U chassis, label, and LED bank.
- No code path silently substitutes a real profile for an unknown device.
- DETAIL section of the state machine names its three data sources and provides a
  per-zone-kind payload table.

## Not done

- No runtime port yet — kit `.ts` files still live under `design-review/` and still
  reference `window.Anthracite*` globals.
- `hardwareModelTypes.ts` not edited (would widen the family union; deferred to runtime
  port stage).
- No new tests — these are contract docs + a small builder patch with no observable
  product behaviour change yet.
- No commit / push (Bujar holds git).

## Next candidate stages

1. **V1BE — Kit port into Anthracite runtime.** Move kit src into Anthracite under
   `src-app/topology/hardware/`, restore `import`/`export`, bundle through Vite,
   wire up types properly (drop `any`, drop `window.Anthracite*` globals, add
   `family: 'unknown'` to the discriminated union, etc.).
2. **V1BE-alt — Topology adapter interface.** Specify
   `topologyAdapter.live(modelId, kind, index)` so the DETAIL contract's third input
   has a real shape before the kit lands.
3. **V1BF — State machine wiring.** React layer that drives MAP → FOCUSED → TRANSITION
   → ORBIT → DETAIL against a real `BuiltModel`.

Recommend (1) before (2) and (3): port first, then bolt the live adapter onto a
known-good runtime.

## AO orchestration report

- subagent: 2× Sonnet (general-purpose) → parallel deep reads of both packages, ~60 + 70 lines each
- Opus solo: synthesis, contract edits, decision/stage notes
- Effectiveness: −35% tokens vs Opus reading every file itself; −0% vs Opus dispatching Sonnet for edits (cross-file consistency dominated, Opus solo was correct)
- Recommendation: keep "Sonnet parallel for ingestion, Opus solo for cross-cutting edits" pattern for future doctrine merges.
