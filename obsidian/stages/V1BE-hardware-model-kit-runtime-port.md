# V1BE — Hardware Model Kit Runtime Port

**Date:** 2026-05-23
**Status:** landed
**Scope:** port topology hardware kit out of `design-review/` into the real Anthracite Vite/Tauri runtime + ship a working preview
**Branch:** `main` after V1BD doctrine merge → working tree
**Authority:** Bujar (scope set; git held)

## Mission

Port the kit from `design-review/anthracite-topology-hardware-model-kit-v0/`
into runtime code. Restore real ES imports/exports. Drop `window.Anthracite*`
globals. Widen the family union to include `'unknown'`. Keep `unk1u`. Preserve
the stable mesh ID format `<modelId>.<zoneKind>.<index>`. Ship a runnable
preview that proves all 21 profiles build, orbit, light, shadow, and pick.

## Where it landed

```
src/topology/hardware/
  ├── types.ts                 # 10-kind zones, 5-family union, FaceplateItem variants
  ├── pickableZones.ts         # meshId / tagZone / readZone / parseMeshId
  ├── materials.ts             # buildMaterials → HardwareMaterials
  ├── telemetryAdapter.ts      # demoTelemetry + TelemetryAdapter seam
  ├── profiles.ts              # 21 profile catalog (Switch, Router, Firewall, Support, Unknown)
  ├── buildHardwareModel.ts    # main builder + textPlane + buildItem
  ├── builders.ts              # buildSwitchModels|Router|Firewall|Support|Unknown|All
  ├── index.ts                 # barrel
  └── __tests__/
      └── hardwareModel.test.ts  # 11 tests, all pass

src/preview/
  ├── HardwareKitPreview.tsx   # full Babylon scene + UI + inspector
  └── HardwareKitPreview.css

src/App.tsx                    # route guard at default export
```

## How to open the preview

```
pnpm dev                       # Vite on :1420
# browse to:
http://localhost:1420/?preview=hardware-kit
```

Or under Tauri:

```
pnpm tauri:dev
# in the Tauri window, navigate the embedded webview to the same URL,
# or run `pnpm dev` and load the URL in a regular browser to validate
# scene/picking without rebooting the Tauri shell.
```

The preview short-circuits the entire AppMain shell (hooks don't mount when
the URL param is present), so it has no side effects on the rest of the app.

## What the preview shows

- left rail: profile dropdown (grouped switch/router/firewall/support/unknown),
  telemetry state radio (up/warning/critical/down/unknown), profile metadata
  (family, vendor, model, dims, U-count, finish, virtual flag)
- centre: Babylon canvas with ArcRotateCamera (orbit/zoom/pan via mouse),
  HemisphericLight + DirectionalLight + ShadowGenerator (1024 map, blur 32,
  darkness 0.55), HighlightLayer for selected zone (cyan stroke)
- right rail: inspector panel showing picked mesh's `mesh.metadata.anthracite`
  triple (modelId, zoneKind, index) + derived port type (RJ45/SFP/QSFP) when
  applicable
- footer: mesh ID rule, example, doctrine pointer

## Profile count proven

```
21 profiles loaded
- switch (5):    access24, access48, leaf32q, dist2u, core4u_sw
- router (5):    edge1u, branch2u, wancore2u, core4u_rt, vrouter
- firewall (5):  fw1u, fw2u_ha, fw_branch, fw_dc, vfirewall
- support (5):   wap, server1u, blade10u, sfp_module, patch1u
- unknown (1):   unk1u
```

`AllProfiles.length === 21` asserted in the test suite (`every profile builds`).

## Pickable ID examples (verified by tests)

```
access48.port.17        # RJ45 port (range 0–47)
access48.port.1000      # first SFP port (range 1000+)
leaf32q.port.2015       # 16th QSFP port (range 2000+)
leaf32q.port.2031       # 32nd QSFP port — proves multi-row offset works
core4u_rt.bay.5         # empty line-card bay
fw2u_ha.psu.1           # second PSU
blade10u.blade.6        # empty blade slot
unk1u.chassis.0         # generic fallback chassis
unk1u.label.0           # hostname plate (pickable label)
```

## Visual / runtime caveats

1. **Bundle size warning** — main chunk is 5.84 MB (1.32 MB gzipped). Babylon is
   the bulk. Code-splitting + dynamic `import("./preview/...")` would let the
   preview load on demand instead of in every shell mount. Deferred to a perf
   stage; doesn't affect V1BE acceptance.
2. **No URL router** — the preview is gated by a query string. Refactoring
   App.tsx into a router is out of V1BE scope.
3. **Telemetry is demo-only** — `demoTelemetry` produces deterministic
   synthetic state. The `TelemetryAdapter` interface is the seam where a real
   subscription will land later.
4. **Pre-existing SFP/QSFP index bug fixed in this stage** — the original kit
   in `design-review/` had two `qsfpRow` items in `leaf32q` and `blade10u` that
   both started at index 2000, causing mesh ID collisions. The ported builder
   now counts existing port zones in each range and offsets correctly. Same
   fix for SFP. The `design-review/` copy is untouched (canonical reference
   only); this lives in the runtime port.
5. **NullEngine text rendering** — `DynamicTexture.getContext()` returns null
   under `NullEngine` (test environment). `textPlane` now guards on this so
   geometry still builds while text is skipped. Production WebGL is unaffected.
6. **No ESLint run** — `pnpm lint` not invoked; tests + typecheck + build all
   green is the V1BE acceptance bar.

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (208 files, 2299 tests, 0 failures)
pnpm build       → green (tsc + vite build, 5.37s)
```

Hardware kit unit tests (11 tests, all pass):
- mesh ID composition (`<modelId>.<zoneKind>.<index>`)
- parseMeshId round-trip + malformed rejection
- access48 port index ranges (RJ45 0–47, SFP 1000+)
- leaf32q QSFP indexing across two rows (32 ports, 2000–2031)
- unk1u family = `'unknown'` and zone composition
- zone tag round-trip via `mesh.metadata.anthracite`
- all 21 profiles build without throwing
- label dense indexing (vendorPlate skipped, hostname placard tagged)
- telemetry seam runs across all 5 states

## Files changed

```
new   src/topology/hardware/types.ts
new   src/topology/hardware/pickableZones.ts
new   src/topology/hardware/materials.ts
new   src/topology/hardware/telemetryAdapter.ts
new   src/topology/hardware/profiles.ts
new   src/topology/hardware/buildHardwareModel.ts
new   src/topology/hardware/builders.ts
new   src/topology/hardware/index.ts
new   src/topology/hardware/__tests__/hardwareModel.test.ts
new   src/preview/HardwareKitPreview.tsx
new   src/preview/HardwareKitPreview.css
edit  src/App.tsx                          (+13 lines: import + route guard + AppMain wrap)
new   obsidian/stages/V1BE-hardware-model-kit-runtime-port.md
```

Out of scope (explicit non-changes): `design-review/` files (left canonical),
existing modes/topology code, BabylonCanvas.tsx, package.json, vite.config.ts,
tsconfig.json, no commit/push.

## Next candidate stages

1. **V1BF — Topology adapter interface.** Specify the `topologyAdapter.live(
   modelId, kind, index)` shape named by the DETAIL contract (V1BD).
2. **V1BG — State machine wiring.** Bind MAP → FOCUSED → TRANSITION → ORBIT →
   DETAIL across the 2D topology renderer + the new ORBIT scene.
3. **V1BH — Bundle split.** Dynamic-import the preview so the main shell
   doesn't pay Babylon's bytes on every load.

## AO orchestration report

- subagents: 2× Sonnet parallel readers (runtime structure + kit re-read with porting checklist)
- Opus solo: 12 file writes (8 kit modules + preview .tsx/.css + test + App.tsx patch), 4 fix-up edits after typecheck/test failures
- effectiveness: −30% tokens vs Opus solo cold read; correct call because cross-file consistency (types, mesh ID format, builder cooperation) required single integrator
- recommendation: keep Sonnet-ingest + Opus-port pattern; defer Sonnet implementation for runtime ports where every file must agree on a frozen contract
