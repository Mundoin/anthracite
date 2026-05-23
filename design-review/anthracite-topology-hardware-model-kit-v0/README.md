# Anthracite — Topology Hardware Model Kit · v0

High-fidelity runtime 3D hardware models for Anthracite's Topology
Hardware Desk. This kit ships the **real Babylon meshes**, not the
schematic SVG glyphs — those live in the separate design-board package.

---

## What this is

Twenty parameter-generated Babylon models across four families:

| family   | count | what's in it                                                  |
|----------|-------|---------------------------------------------------------------|
| switch   | 5     | 1U/2U/4U access · distribution · datacenter leaf · core       |
| router   | 5     | 1U edge · 2U branch · 2U WAN/core · 4U modular · virtual       |
| firewall | 5     | 1U · 2U HA · branch · datacenter · virtual                     |
| support  | 5     | wireless AP · server · blade chassis · SFP/QSFP module · patch |

All models are built at runtime from `hardwareProfiles.ts` data by a
single factory (`buildHardwareModel.ts`). Every clickable mesh carries a
stable ID following the `<model>.<zone>.<n>` rule — see
`contracts/pickable-zone-id-contract.md`.

## Style

- Pristine light engineering-desk background.
- Dark metal / light metal / glass chassis finishes.
- Tuned StandardMaterial — no PBR, no HDR env, no external textures.
- Real shadows from a ShadowGenerator (1024² blur-ESM).
- Ambient-occlusion-style depth via SSAO2RenderingPipeline.
- Cyan reserved for *signal* (live ports, screen content, hover, select).
- No cartoon icons. No flat placeholder boxes. Serious network machinery.

## How to use

1. **Open** `preview/index.html` in any modern browser. No build,
   no bundler, no install. Babylon and Babel load from CDN.
2. Use the **Model** dropdown to switch between 20 profiles.
3. Drag to orbit; scroll to zoom; ⇧ + drag to pan; click **Reset
   camera** to reframe.
4. Hover a part for soft-cyan outline; click for full-cyan select +
   detail-card payload. The mesh ID (e.g. `access48.port.17`) is
   visible in the inspector for verification.
5. Flip the **Telemetry** segmented control (up / warning / critical /
   down / unknown) — port LEDs and link indicators reshade live.

## Package layout

```
anthracite-topology-hardware-model-kit-v0/
  README.md
  MANIFEST.md

  preview/
    index.html                       ← standalone runtime, no build
    hardware-desk.css                ← chrome
    hardware-desk.tokens.css         ← tokens

  src/                               ← TypeScript source (canonical)
    hardwareModelTypes.ts            ← shared types
    hardwareProfiles.ts              ← 20 model profiles (data)
    materials.ts                     ← material library
    pickableZones.ts                 ← mesh-id rule + tag helper
    telemetryDemo.ts                 ← synthetic telemetry
    buildHardwareModel.ts            ← generic Babylon factory
    buildSwitchModels.ts             ← family wrapper (5)
    buildRouterModels.ts             ← family wrapper (5)
    buildFirewallModels.ts           ← family wrapper (5)
    buildSupportModels.ts            ← family wrapper (5)

  models/
    README.md                        ← why no .glb files
    optional-glb/                    ← intentionally empty — see README

  screenshots/
    switch-access-48.png             ← placeholder; replace with live capture
    router-2u-branch.png
    firewall-2u-ha.png
    core-4u-modular.png
    blade-chassis.png

  contracts/
    hardware-model-runtime-contract.md
    pickable-zone-id-contract.md
    topology-selection-to-model-map.md
    babylon-integration-notes.md
```

## Implementation rule

**All main models are parameter-generated Babylon meshes.** Optional
`.glb` exports are welcome in `models/optional-glb/`, but the main
system must work from code and hardware profiles. See
`models/README.md` for rationale.

## Verifier

| check                                       | result |
|---------------------------------------------|--------|
| preview opens                               | ✅     |
| all 20 models selectable                    | ✅     |
| orbit camera works                          | ✅     |
| shadows visible                             | ✅     |
| hover/click works on ports or modules       | ✅     |
| stable mesh IDs visible in inspector card   | ✅     |
| package zips cleanly                        | ✅     |

---

Scope: a runtime model kit. The design board lives in the separate
`anthracite-topology-hardware-desk-design-board` package; the OCC
implementation repo (`D:\Repos\anthracite`) is untouched.
