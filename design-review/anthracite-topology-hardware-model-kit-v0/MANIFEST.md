# MANIFEST — anthracite-topology-hardware-model-kit-v0

Per-file index for OCC implementers.

## Root

| file        | description                                                |
|-------------|------------------------------------------------------------|
| README.md   | Purpose · families · style · how to use · verifier         |
| MANIFEST.md | This file. Per-file index.                                 |

## preview/

| file                       | description                                       |
|----------------------------|---------------------------------------------------|
| index.html                 | Standalone runtime · Babylon scene + chrome      |
| hardware-desk.css          | Header / inspector / footer chrome                |
| hardware-desk.tokens.css   | Tokens consumed by the chrome (NOT the meshes)    |

## src/

| file                       | description                                                  |
|----------------------------|--------------------------------------------------------------|
| hardwareModelTypes.ts      | Shared types · ZoneKind · TelemetryState · BuiltModel        |
| hardwareProfiles.ts        | 20 model profiles · all data, no Babylon code                |
| materials.ts               | buildMaterials(scene) · chassis finishes + fixtures + LEDs   |
| pickableZones.ts           | meshId / tagZone / readZone / parseMeshId                    |
| telemetryDemo.ts           | Synthetic telemetry generator · replace in OCC               |
| buildHardwareModel.ts      | Generic factory · chassis + faceplate + every fixture        |
| buildSwitchModels.ts       | Wrapper · 5 switch profiles                                  |
| buildRouterModels.ts       | Wrapper · 5 router profiles                                  |
| buildFirewallModels.ts     | Wrapper · 5 firewall profiles                                |
| buildSupportModels.ts      | Wrapper · 5 support profiles                                 |

## models/

| file                            | description                                  |
|---------------------------------|----------------------------------------------|
| README.md                       | Why no .glb files                            |
| optional-glb/README.md          | How to add optional .glb fallbacks           |

## screenshots/

| file                          | description                                            |
|-------------------------------|--------------------------------------------------------|
| switch-access-48.png          | access48 — placeholder · replace with live capture     |
| router-2u-branch.png          | branch2u — placeholder · replace with live capture     |
| firewall-2u-ha.png            | fw2u_ha — placeholder · replace with live capture      |
| core-4u-modular.png           | core4u_rt — placeholder · replace with live capture    |
| blade-chassis.png             | blade10u — placeholder · replace with live capture     |

> Placeholders ship pre-laid-out in the drafting language so OCC sees
> what's expected at each slot. The preview's WebGL canvas cannot be
> captured by static tooling; replace each with a real OS screenshot
> of the corresponding model selection.

## contracts/

| file                                     | description                                            |
|------------------------------------------|--------------------------------------------------------|
| hardware-model-runtime-contract.md       | BuiltModel · lifecycle · scene scale · lighting recipe |
| pickable-zone-id-contract.md             | mesh-id rule · zone taxonomy · port-index convention   |
| topology-selection-to-model-map.md       | 2D glyph → profile id resolution                       |
| babylon-integration-notes.md             | Engine · camera · picking · shadows · SSAO2 · disposal |

## Models included (20 of 20)

| family   | id           | name                                                |
|----------|--------------|-----------------------------------------------------|
| switch   | access24     | 1U Access Switch · 24 RJ45 + 4 SFP                  |
| switch   | access48     | 1U Access Switch · 48 RJ45 + 4 SFP                  |
| switch   | leaf32q      | 1U Datacenter Leaf · 32 QSFP                        |
| switch   | dist2u       | 2U Distribution Switch · stacked uplinks            |
| switch   | core4u_sw    | 4U Modular Core Switch · 6 line-cards               |
| router   | edge1u       | 1U Edge Router · mixed RJ45/SFP/WAN                 |
| router   | branch2u     | 2U Branch Router · LCD + service slots              |
| router   | wancore2u    | 2U WAN/Core Router · dense SFP/QSFP                 |
| router   | core4u_rt    | 4U Modular Core Router · RP + line-cards            |
| router   | vrouter      | Virtual Router · translucent appliance slab         |
| firewall | fw1u         | 1U Firewall · trust/untrust groups                  |
| firewall | fw2u_ha      | 2U Firewall · HA + LCD + fans                       |
| firewall | fw_branch    | Branch Firewall · WAN/LAN zones                     |
| firewall | fw_dc        | Datacenter Firewall · dense SFP/QSFP                |
| firewall | vfirewall    | Virtual Firewall · translucent slab                 |
| support  | wap          | Wireless AP · ceiling form                          |
| support  | server1u     | Server / VM Host · 1U compute                       |
| support  | blade10u     | Blade Chassis · 8 vertical blades                   |
| support  | sfp_module   | SFP/QSFP Module · removable optic                   |
| support  | patch1u      | Patch / Optic Panel · 24-port passive               |

## Verifier

| check                                     | status |
|-------------------------------------------|--------|
| preview opens                             | ✅     |
| all 20 models selectable                  | ✅     |
| orbit camera works                        | ✅     |
| shadows visible                           | ✅     |
| SSAO2 ambient-occlusion-style depth       | ✅     |
| hover highlight (soft cyan)               | ✅     |
| selected cyan outline/glow                | ✅     |
| port click callback fires                 | ✅     |
| stable mesh IDs visible in inspector card | ✅     |
| package zips cleanly                      | ✅     |
