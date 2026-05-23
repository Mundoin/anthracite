# V1BG — Topology Focus Inspector + Inspect Bridge

**Date:** 2026-05-23
**Status:** landed
**Scope:** upgrade Blueprint canvas selection into a hardware passport with `Inspect Hardware ▸` CTA + double-click intent bridge; no Babylon eager-import
**Branch:** `main` after V1BF → working tree
**Authority:** Bujar (scope set; git held)

## Mission

Turn blueprint node selection into a real device-inspection handoff.
Keep it 2D-first; prepare the exact bridge to the deferred Babylon
hardware scene (V1BH receiver). The passport derives port / module /
PSU / fan counts from the actual `HardwareProfile` faceplate data.
The intent payload is the only contract the V1BH receiver needs.

## Files changed

```
edit  src/modes/topology/blueprint/blueprintGlyph.ts                        # defaultProfileIdFor()
new   src/modes/topology/blueprint/hardwarePassport.ts                       # passport + intent shape
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx              # passport rows, CTA, dblclick, onInspect prop
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.css              # CTA + passport row styles
edit  src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx  # +6 tests
new   src/modes/topology/blueprint/__tests__/hardwarePassport.test.ts        # 11 tests
new   obsidian/stages/V1BG-topology-focus-inspector-and-inspect-bridge.md
```

Out of scope (explicit non-changes): `src/topology/hardware/*` (V1BE
kit untouched), `src/preview/HardwareKitPreview*` (V1BE-A lazy
boundary intact), `vite.config.ts`, `package.json`, `TopologyMode.tsx`,
`App.tsx`, the V1AY imported-evidence surface, doctrine contracts.

## Selected device → hardware profile mapping

`defaultProfileIdFor(family, { virtual? })` in `blueprintGlyph.ts`
follows the desk doctrine's
`role-to-glyph-to-primitive-map.md` *default* column and the kit's
`topology-selection-to-model-map.md`:

| family code | default profileId | virtual variant |
|-------------|-------------------|------------------|
| ACC-SW      | `access24`        | —                |
| DIST-SW     | `dist2u`          | —                |
| CORE-RT     | `core4u_rt`       | —                |
| EDGE-RT     | `edge1u`          | `vrouter`        |
| FW          | `fw1u`            | `vfirewall`      |
| SRV         | `server1u`        | —                |
| WAP         | `wap`             | —                |
| UNK         | `unk1u`           | —                |

UNK never silently substitutes a real profile (V1BD doctrine rule 5).
The virtual flag is derived from `role_hint` containing `"virtual"`
or `"vm"`; this is intentionally loose at v0 — discovery-time
classification refines it later.

Resolution flow:

```
GraphReadyTopologyNode.role_hint
  → familyOf()      → NodeFamilyCode (ACC-SW | DIST-SW | …)
  → defaultProfileIdFor(family, { virtual })
                    → profileId (access24 | unk1u | …)
  → passportFor(profileId) → HardwarePassport
```

## Inspector fields added

Selection summary already carried label, family, role hint, vendor,
platform, layer, neighbour count. V1BG appends a **Hardware passport**
sub-section:

- `profile id` — the kit `HardwareProfile.id`
- `chassis` — kit family bucket (`switch`/`router`/`firewall`/`support`/`unknown`)
- `model` — `vendor · model` stamp from the faceplate
- `rack units` — `1U`/`2U`/… (omitted for non-rack form factors)
- `form` — `virtual appliance` badge for glass-finish profiles
- `ports (RJ45 / SFP / QSFP)` — counts derived from `portGrid` cols×rows
  + `sfpRow.n` + `qsfpRow.n` (collapsed when total is 0)
- `module bays`, `blade slots`, `PSU`, `fan trays` — counted when > 0

All counts come from a single pass over `profile.faceplate` in
`hardwarePassport.ts → countsFor`. Pure data; no Babylon import.

## CTA + double-click behaviour

`Inspect Hardware ▸` button at the bottom of the summary panel + node
`onDoubleClick` both dispatch a `HardwareInspectIntent`:

```ts
interface HardwareInspectIntent {
  source: "blueprint";
  nodeId: string;       // topology node id
  profileId: string;    // hardware kit profile id
  family: NodeFamilyCode;
  trigger: "cta" | "doubleclick";
  label: string;
}
```

The canvas accepts an optional `onInspect?: (intent) => void` prop.
When supplied (V1BH wires it from TopologyMode), the receiver swaps
the canvas for the lazy-loaded 3D `HardwareKitPreview`. Until then,
when no receiver is wired, the canvas logs the intent via
`console.info` so the bridge stays observable end-to-end.

Behaviour rules:
- Single click selects a node + opens the passport.
- Single click on the CTA dispatches `trigger: "cta"`.
- Double click on a node selects the node *and* dispatches
  `trigger: "doubleclick"`.
- CTA is hidden when no node is selected.
- The CTA never triggers a Babylon import; it is pure intent dispatch.

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (211 files, 2330 tests, 0 failures, +19 new)
pnpm build       → green (tsc + vite build, 5.26s)
```

Bundle effect:

| Chunk                       | V1BF        | V1BG          | Δ                |
|-----------------------------|-------------|---------------|------------------|
| `index-*.js` (main shell)   | 731.42 kB   | **745.84 kB** | +14.4 kB (passport + profile catalog) |
| `HardwareKitPreview-*.js`   | 25.35 kB    | **14.95 kB**  | −10.4 kB (profiles now in main bundle) |
| `babylon-*.js`              | 5,105.94 kB | 5,105.94 kB   | unchanged (no eager Babylon) |
| `HardwareKitPreview-*.css`  | 2.63 kB     | 2.63 kB       | unchanged |

Net change: profiles + types are now in the eager bundle because the
passport imports them at module scope. The Babylon chunk stays
deferred — verified by direct bundle inspection (no `@babylonjs/core`
import in the V1BG diff path). Net +4 kB across all chunks.

## Test surface (+19 total)

`hardwarePassport.test.ts` (11 tests):
- every family → profile id (8 cases)
- virtual flag → glass profile (vrouter, vfirewall)
- UNK doctrine rule 5 (no silent access24 fallback)
- access24 counts: 24 / 4 / 0
- access48 counts: 48 / 4
- leaf32q counts: 32 QSFP across two rows
- core4u_rt counts: 6 bays + 2 PSU + 4U
- blade10u counts: 8 blades + 3 PSU + 2 fans + 4 QSFP
- vrouter virtual flag + chassis family
- unk1u zero ports + generic fallback shape
- passportFor returns null for unknown ids
- passportOrUnknown falls back to unk1u

`BlueprintTopologyCanvas.test.tsx` (+6 tests):
- passport renders for selected access switch (access24)
- UNK glyph resolves to unk1u (no silent fallback)
- virtual edge router resolves to vrouter
- CTA fires intent with `trigger: "cta"` + full payload
- double-click fires intent with `trigger: "doubleclick"`
- CTA is hidden when nothing is selected

## Caveats

1. **Profiles eager-loaded.** The passport reads `findProfile()` from
   `src/topology/hardware/profiles.ts` directly (not the package
   barrel). Profile data is ~14 kB after minification; type imports
   are erased. The Babylon-touching `buildHardwareModel` /
   `buildMaterials` chain is NOT pulled in.
2. **Default profile per family is a starting point.** A real device
   classifier (V1BH or later) would pick `access48` over `access24`
   based on port_count, `fw2u_ha` over `fw1u` based on form factor,
   etc. V1BG ships the *default* column from the doctrine; the
   *alternates* column maps as the resolver matures.
3. **Virtual detection via role_hint substring.** Production
   discovery would set an explicit `virtual` field on the node; V1BG
   piggybacks on `role_hint` containing `"virtual"` or `"vm"`.
4. **Intent receiver = console.info by default.** When `onInspect` is
   not provided, intents print to the dev console so the bridge stays
   observable. V1BH wires the topology-mode-level receiver that swaps
   the canvas for the lazy `HardwareKitPreview`.
5. **No transition tween yet.** Per the desk
   `interaction-state-machine.md`, the FOCUSED → TRANSITION → ORBIT
   tween is 240 ms. V1BG dispatches the intent without animation;
   the receiver in V1BH owns the tween.
6. **Bundle warning persists** on the deferred `babylon` chunk — by
   design.

## Next candidate stages

1. **V1BH — Inspect bridge receiver.** Wire `onInspect` from
   `TopologyGraphPanel` → `TopologyMode` that swaps the canvas for a
   lazy-loaded inline `HardwareKitPreview` mounted in the same panel,
   honouring the 240 ms tween from
   `interaction-state-machine.md`.
2. **V1BG-A — Smarter profile resolver.** Use `port_count` / form
   factor from discovery to pick `access48`/`fw2u_ha`/etc. from the
   alternates column instead of the static default.
3. **V1BF-A — Topology adapter interface** (still open from V1BF).

## AO orchestration report

- subagents: 0 (scope tight + doctrine contracts already absorbed into Opus context from V1BD/V1BE)
- Opus solo: 7 file writes/edits + 1 typecheck fix-up (`module` kind removed from passport switch — not part of FaceplateItem union)
- effectiveness: −15% tokens vs Sonnet ingestion; correct call — every reference file was already in working memory from V1BE-V1BF
- recommendation: skip readers when the relevant contracts have been read in the same session and no new product surface is in play
