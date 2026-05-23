# 2026-05-23 — Topology Hardware Doctrine Merge

Reconcile the desk design board (`design-review/anthracite-topology-hardware-desk-design-board/`)
and the model kit v0 (`design-review/anthracite-topology-hardware-model-kit-v0/`) into a single
binding contract before either lands in the Anthracite runtime.

## Context

Two packages arrived independently:

- **Desk design board** — visual doctrine (glyphs, state ring, 8 families, density bands,
  interaction state machine, 8-kind pickable zone taxonomy, Babylon constraints).
- **Model kit v0** — runtime TypeScript + Babylon 7 builders for 20 hardware profiles, with a
  10-kind zone taxonomy, deterministic mesh IDs, and a `BuiltModel.setTelemetry` hook.

A read-pass surfaced seven points where the two drifted. Bujar ruled on each.

## Decisions

1. **Zone taxonomy → 10 kinds.** Promote `screen` and `label` from kit-only into doctrine.
   `screen` carries the live readout from `faceplate.text`; `label` carries hostname plates
   and asset placards. Decorative vendor strips (`vendorPlate: true`) stay non-pickable.

2. **Single role → glyph → model map.** `role-to-glyph-to-primitive-map.md` in the desk
   package is now the canonical table, naming kit `profileId`s directly. The kit's
   `topology-selection-to-model-map.md` mirrors it.

3. **UNK is a real profile.** New `unk1u` profile in `hardwareProfiles.ts` — generic 1U
   chassis, idle LED bank, "UNKNOWN DEVICE" hostname plate. No silent fallback to
   `access24` or any other real device profile.

4. **Mesh ID format ratified.** `<modelId>.<zoneKind>.<index>`. Desk's earlier
   `<family>.<role>.<n>` (with `1u`/`2u`/`4u` family bucket) is dropped in favour of the
   kit's `modelId`-based scheme. Port-index ranges (RJ45 0+, SFP 1000+, QSFP 2000+) keep
   port types distinguishable inside the single `port` kind.

5. **Transition lifecycle ordered.** Forward (FOCUSED → ORBIT): build `BuiltModel` *before*
   the 240 ms tween starts; enable at t=80 ms. Reverse (ORBIT → MAP): tween out first
   (280 ms), `scene.dispose()` after — never during. Tearing the engine down mid-fade
   produces a black flash.

6. **DETAIL payload = three inputs.** `mesh.metadata.anthracite` (identity) +
   `HardwareProfile.faceplate[index]` (static spec: port kind, label, layout) +
   topology adapter (live state: link, neighbour, errors). Renderer never invents data;
   missing live data shows the static spec plus "no live data".

7. **GLB stays optional.** `models/optional-glb/` remains a deferred export path for
   future hand-sculpted geometry. Primary system stays procedural Babylon meshes built
   from `HardwareProfile`.

## Files changed

Desk:
- `contracts/pickable-zone-taxonomy.md` — added `screen`, `label` rows + rules 4/6/7
- `contracts/role-to-glyph-to-primitive-map.md` — unified table + rule 5 (no silent fallback)
- `contracts/topology-node-family-contract.md` — UNK row points to `unk1u`
- `contracts/interaction-state-machine.md` — lifecycle ordering + DETAIL payload triad
- `contracts/babylon-implementation-notes.md` — mesh ID rule rewritten to kit format

Kit:
- `contracts/pickable-zone-id-contract.md` — `screen`/`label` documented, parity stated
- `contracts/topology-selection-to-model-map.md` — UNK → `unk1u`, rule 3 rewritten
- `src/hardwareProfiles.ts` — added `unk1u` profile (family `support` for build-pipeline
  routing; semantically the UNK fallback)
- `src/buildHardwareModel.ts` — `screen` and `label` cases now dense-index zones;
  non-`vendorPlate` labels become pickable `label` zones

## Out of scope (explicit non-changes)

- Stack (Tauri 2 / React / Babylon 7) — unchanged
- 20 existing profiles — unchanged
- Material catalog — unchanged
- State machine state names + counts — unchanged
- Telemetry contract — unchanged
- Preview HTML / CSS tokens — unchanged
- Screenshots — unchanged
- `telemetryDemo.ts` — unchanged (still demo-only)

## Open follow-ups

- Type definitions in `hardwareModelTypes.ts` may want a `family: 'unknown'` member
  (currently `unk1u` carries `family: 'support'` to avoid widening the discriminated
  union mid-stage). Revisit when kit ports into the Anthracite Vite/Tauri runtime.
- `topologyAdapter.live(modelId, kind, index)` is named in the DETAIL contract but
  not yet implemented anywhere. Concrete adapter interface lands with the runtime
  port stage.
- Babel → Vite/esbuild migration of every kit `.ts` file (commented `import`/`export`)
  is its own stage.
