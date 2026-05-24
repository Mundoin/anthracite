# V1BN — Topology Readability Pack v0

**Date:** 2026-05-24
**Status:** landed (working tree; commit/push held for Bujar) — see hotfix-3 below
**Hotfix-1:** 2026-05-24 — full-surface canvas (SVG absolute, panel border + intrinsic chain broken), role-aware metro mini-glyphs, 3D pick callout dismiss (`×` + Esc).
**Hotfix-2:** 2026-05-24 — rescue gate. Bay border-bottom removed (was painting horizontal split across topology surface). Initial auto-fit on view change so metro content fills surface instead of letterboxing to upper-half. Receiver height contract reinforced (`.tg-content--blueprint > .hardware-inspect-receiver` explicit). Scenario parity regression test added for Micro/Branch/Campus/Datacenter/Metro. Env persistence audit completed — verdict: LARGER (scoped as next stage).
**Hotfix-3:** 2026-05-24 — canvas-only rescue. Hotfix-2 did not fix the upper-portion trap. Real offender: `.mwb-active-body` is `flex: 1; overflow-y: auto;` but NO `display: flex`. Topology-scoped override (`.topology-mode .mwb-active-body { display: flex; flex-direction: column }`) makes the lab-view's `flex: 1 1 auto` claim real height. `.tg-content--blueprint` `min-height: 320 px` floor removed (was the symptom-ceiling that pinned the canvas at 320 px). Full-surface markers (`data-topology-full-surface` / `-map-layer` / `-svg-layer`) added. 5-scenario receiver parity test added.
**Scope:** make the topology readable at first glance: pure identity
resolver infers role from vendor/platform/label when `role_hint` is
generic (so `fw-fortinet-001` reads as FW, `rtr-cisco-002` as
EDGE-RT, etc.), and pure edge router replaces raw `<line>` spaghetti
with orthogonal elbows (branch/campus/datacenter) or gentle bezier
curves (metro).
**Branch:** `main` after `0063bbb` (V1BM.hotfix-2) → working tree
**Authority:** Bujar (scope set; git held)

## Mission

> "Make the map stop looking blind/unknown and stop drawing every
> link as raw spaghetti."

Two coupled pure modules, wired through the existing layout +
render pipeline. No visual-token changes, no interaction changes.

## Files changed

```
new   src/modes/topology/blueprint/blueprintIdentity.ts                          # pure resolver: family / confidence / roleLabel / profileId
new   src/modes/topology/blueprint/__tests__/blueprintIdentity.test.ts           # 16 table tests
new   src/modes/topology/blueprint/blueprintEdges.ts                             # pure routing: elbow / curve / straight by scenario + density
new   src/modes/topology/blueprint/__tests__/blueprintEdges.test.ts              # 6 deterministic tests
edit  src/modes/topology/blueprint/blueprintLayouts.ts                            # use resolveIdentity instead of familyOf for family resolution
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx                    # detectScenario + scenarioKind memo; <Edge> renders <path> via routeEdge
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.css                    # .bt-edge fill: none; stroke-linecap/linejoin: round; selected opacity 1
new   obsidian/stages/V1BN-topology-readability-pack.md
```

Out of scope: `blueprintGlyph.ts` (`familyOf`, `FAMILY_FRAME`,
`pickDensityBand`, `defaultProfileIdFor` unchanged — the resolver
delegates to `familyOf` as a fallback), `hardwarePassport.ts`,
`HardwareInspectScene/Receiver` (header meta automatically improves
via better intent.family flow), `TopologyMode.tsx`,
`TopologyGraphPanel.tsx`, intent payload shape, Babylon defer
boundary, `?preview=hardware-kit`, all non-canvas tests.

## 1 — Identity resolver

`resolveIdentity(node)` inspects (in order):

1. **Vendor / label / platform keywords** — table of `(family, roleLabel,
   keywords)` rules. Order matters: specific (FW, CORE-RT, WAP, DIST-SW)
   before generic (ACC-SW, EDGE-RT, SRV). First substring match wins.
2. **role_hint fallback** via the V1BF `familyOf` rule.
3. **Last resort** → `UNK` with `confidence: "low"`.

Output shape:

```ts
interface Identity {
  family: NodeFamilyCode;
  confidence: "high" | "medium" | "low";
  reason: string;          // "matched 'fortinet' on fw-fortinet-001"
  displayLabel: string;
  roleLabel: string;       // "Firewall", "Endpoint", "Unclassified", …
  profileId: string;       // matches hardwareProfiles.ts
}
```

### Inference rules

| Role kw                                                | family   |
|--------------------------------------------------------|----------|
| `fw-`, `firewall`, `fortinet`, `fortigate`, `paloalto`, `pan-`, `asa`, `checkpoint`, `sophos` | FW |
| `core-`, `cr-`, `backbone`, `asr`, `ncs`, `core router`, `core-router` | CORE-RT |
| `ap-`, `wap-`, `aruba`, `wifi`, `wireless`, `meraki-mr`, `unifi-ap`, `cisco-aironet` | WAP |
| `dist-`, `distribution`, `catalyst-6`, `nexus-9`, `agg-`, `aggregation` | DIST-SW |
| `sw-`, `switch`, `access`, `catalyst`, `nexus`, `arista`, `extreme`, `meraki-ms` | ACC-SW |
| `rtr-`, `router`, `edge-`, `wan-`, `isr`, `juniper`, `mikrotik`, `fritzbox`, `fritz!box` | EDGE-RT |
| `srv-`, `server`, `host-`, `vm-`, `compute`, `esxi`, `cam-`, `camera`, `axis`, `endpoint` | SRV |
| (fallback) `role_hint` matches V1BF `familyOf` rules                | (any) |
| no match                                              | UNK |

`cam-axis-007` → `SRV` (endpoint family — the closest match in the
current 8-family contract). `fritzbox-home-009` → `EDGE-RT`. Virtual
detection (`vm-`, `virtual`, `vrouter`, `vmx`, `vsrx`) flips
`defaultProfileIdFor` to the vrouter profile when family is a router.

### Wiring

`blueprintLayouts.sortedTagged` and the fallback ring both now call
`resolveIdentity(n).family` instead of `familyOf(n)` so the role-aware
layouts dispatch on resolved family — `fw-fortinet-001` lands in the
firewall row, not the UNK row.

## 2 — Edge routing

`routeEdge(from, to, { scenario, band })` returns:

```ts
interface EdgeRoute { d: string; kind: "elbow" | "curve" | "straight" }
```

### Rules

| Context                                | Path                                  |
|----------------------------------------|---------------------------------------|
| Density band = `dot` (>48 nodes)       | straight `M sx sy L tx ty`            |
| scenario = `metro`                     | cubic bezier S-curve                  |
| scenario = `branch` / `campus` / `datacenter`, source/target on different rows | orthogonal elbow with rounded corners (`Q`-quad joints) |
| scenario = `branch` / `campus` / `datacenter`, same row | straight                              |
| scenario = `fallback`                  | straight                              |

Elbow rounded-corner radius caps at 8 vbu and never exceeds half of
the segment length, so short elbows still look clean.

Bezier control points sit at the same y as each endpoint, pulled
40 % / 60 % of `dx` toward the midpoint — produces a calm sigmoid
that reduces overlap with straight-line edges in metro clusters.

All coords are snapped to 2 decimals (`toFixed(2)`) so identical
inputs produce byte-identical path strings (deterministic, easy to
assert).

### Wiring

`<Edge>` component now accepts `scenario` + `band`, calls `routeEdge`,
renders `<path d={route.d}>` with `data-route-kind` attribute.
`.bt-edge` CSS picks up `fill: none` + rounded line-cap/join.
Selected (`is-active`) edges keep cyan stroke; opacity 1 for clarity.

## 3 — Before / after visual behaviour

**Before V1BN (V1BM.hf2):**

- `fw-fortinet-001`, `rtr-cisco-002`, `sw-cisco-003` all rendered
  as UNK `?` glyphs because their `role_hint` was generic.
- Layouts put them in the UNK middle row regardless of true role.
- Edges drew as raw straight `<line>` between any two endpoints —
  cross-canvas spaghetti in branch/campus, dense chord-through-ball
  in metro.

**After V1BN:**

- `fw-fortinet-001` resolves FW → top row in branch/campus; FW
  glyph face.
- `rtr-cisco-002` resolves EDGE-RT → top row alongside firewalls.
- `sw-cisco-003` resolves ACC-SW → switch row.
- `ap-aruba-005` resolves WAP → endpoint row.
- `cam-axis-007` resolves SRV → endpoint row.
- Branch / campus / datacenter edges read as right-angle network
  diagrams (source down, across, target down) with rounded
  corners.
- Metro edges curve gently across clusters instead of cutting
  straight chords through cluster centres.
- Dense dot-mode (>48 nodes) keeps straight lines to avoid visual
  noise; elbow chrome would dominate the tiny dot glyphs.

## Validation results

```
pnpm typecheck   → green (tsc --noEmit, 0 errors)
pnpm test --run  → green (216 files, 2402 tests, 0 failures, +22 net new)
pnpm build       → green (tsc + vite build, 6.62s)
```

### Test surface (+22)

`blueprintIdentity.test.ts` (16 tests):
- Keyword matches: FW (`fw-fortinet-001`), CORE-RT (`core-router-003`),
  EDGE-RT (`rtr-cisco-002`, `fritzbox-home-009`), DIST-SW
  (`dist-cisco-004`), ACC-SW (`sw-cisco-003`), WAP (`ap-aruba-005`),
  SRV (`cam-axis-007`, `srv-vmware-008`).
- Vendor inference: `vendor: "Fortinet"` → FW even with generic id.
- Platform inference: `platform_id: "catalyst-9300"` → ACC-SW.
- role_hint fallback: `role_hint: "access switch"` → ACC-SW.
- No-signal → UNK with `confidence: "low"`, `profileId: "unk1u"`,
  `roleLabel: "Unclassified"`.
- Virtual detection: `vm-router-010` + `role_hint: "router"` → `profileId: "vrouter"`.
- Output shape sanity (family/confidence/reason/displayLabel/roleLabel/profileId).

`blueprintEdges.test.ts` (6 tests):
- Branch elbow with different rows (`Q` + multiple `L` commands).
- Same-row straight: `"M 0.00 0.00 L 400.00 0.00"`.
- Datacenter elbow on hierarchical edges.
- Metro returns `C` cubic bezier.
- Metro + dot density → falls back to straight (visual noise rule).
- Fallback uses straight line.
- Determinism: identical input → byte-identical path string.

Existing layout test (`places core above distribution above access
above hosts`) revealed a CORE-RT keyword gap (`core router` with a
space wasn't covered by the `core-` prefix). Added `core router` +
`core-router` keywords; test now passes.

### Bundle effect

| Chunk                | V1BM.hf2       | V1BN           | Note |
|----------------------|----------------|----------------|------|
| `index-*.js` (shell) | 756.28 kB      | **759.48 kB**  | +3.2 kB (identity resolver + edge router + scenario memo + path render) |
| `index-*.css`        | 215.95 kB      | **216.01 kB**  | +0.06 kB (.bt-edge line-cap/join + fill:none) |
| `HardwareInspectScene-*.js` | 6.29 kB | 6.29 kB        | unchanged |
| `HardwareInspectScene-*.css` | 4.49 kB | 4.49 kB       | unchanged |
| `babylon-*.js`       | 5,105.94 kB    | 5,105.94 kB    | unchanged |
| `buildHardwareModel-*.js` | 8.92 kB   | 8.92 kB        | unchanged |
| `HardwareKitPreview-*.js` | 6.14 kB   | 6.14 kB        | unchanged |

Babylon stays 100 % deferred. Receiver still grep-clean of
`@babylonjs/core`. `?preview=hardware-kit` URL preserved.

## Manual verify (held for Bujar)

```
pnpm dev   # Vite on :1420
```

**Branch Office (8 dev):**
- `fw-` nodes land in top row + show FW glyph face
- `rtr-` nodes land alongside firewalls (EDGE-RT row)
- `sw-` nodes in middle row showing ACC-SW
- `srv-` / `host-` / `cam-` nodes in bottom row
- Edges between rows draw as right-angle elbows with rounded corners
- Drag a node → edges still follow (path recomputes from layout)
- Click → passport opens; Inspect Hardware → 3D bay
- No giant `UNK` chrome on identifiable devices

**Campus (16 dev):**
- Core / distribution / access tiers clearly readable
- Elbow edges between tiers
- Cross-tier links calm, no straight diagonals

**Metro (96 dev):**
- Clusters connected by gentle S-curves
- Selected node's edges highlight cyan
- Non-selected edges stay pale graphite; dense scene still legible

## Caveats

1. **`SRV` is the closest match for cameras** in the current 8-family
   contract. If V1BN+1 adds a `CAM` or `SUPPORT` family, the
   resolver's `cam-`/`axis` keywords should re-target. Profile id
   stays `srv1u` for now.
2. **Edge routing is endpoint-only** — no overlap detection, no
   bundling, no anti-crossing. Branch/campus/datacenter elbows can
   still cross visibly when many nodes occupy the same row.
3. **Keyword priority is hand-tuned**; if false positives appear
   (e.g. `firewall-bypass-switch` resolving to FW because of
   `firewall`), invert specific/generic ordering or add explicit
   negative keywords.
4. **Bezier metro routing** uses 40 % / 60 % control offsets; if a
   particular metro layout makes the curves read as too dramatic
   on one axis, tune those constants.
5. **`familyOf` is still exported from `blueprintGlyph.ts`** and
   called from the resolver as a fallback. Both modules stay in
   service; the resolver doesn't delete the V1BF rule.

## Hotfix-1 — full canvas surface, role-aware metro, callout dismiss

Bujar visual-verified V1BN and called three blockers:

1. Canvas split persisted for Micro Lab 3 / Campus 24 / Datacenter 32
   scenarios (Branch 8 + Metro 96 looked fine). Dragging a node
   could "wake up" the canvas surface.
2. Metro 96 lost role identity — every device was an identical
   silly circle in dot density.
3. The 3D pick callout had no dismiss; only Back (which exits the
   bay) cleared it.

### Root cause #1 — canvas split persisted

Three coupled effects:

a. `.tg-content--blueprint` had a literal `border: 1px solid #C8D5DE;
   border-radius: 2px` wrapping the receiver. When the receiver/canvas
   didn't fill the lab-view section, that border painted the visible
   horizontal boundary between "active area" and "dead area".

b. `.tg-content--blueprint` had `flex: 1 1 auto; height: auto`. With
   `flex-basis: auto`, the flex algorithm could fall back to intrinsic
   content height. Receiver intrinsic height resolved through the
   SVG element's intrinsic size; the SVG element with `width: 100%;
   height: 100%` and no positioning fell back to its viewBox
   intrinsic when the parent was `height: auto`. This is what made
   the "drag a node → bbox grows → SVG intrinsic grows → parent
   grows → canvas wakes up" loop visible.

c. Small scenarios (3/24/32 nodes) produced a viewBox bbox smaller
   than the lab-view section, so the intrinsic-driven container
   settled smaller than the available surface. Metro's bigger bbox
   pushed past the threshold, so Bujar saw metro look fine.

### Fix #1 — break the intrinsic chain

```css
/* TopologyGraphPanel.css */
.tg-content--blueprint {
  flex: 1 1 0;        /* basis 0 — content size doesn't drive */
  min-height: 320px;  /* floor preserved */
  /* border / border-radius DROPPED — the boundary line */
  background: transparent;
}

/* BlueprintTopologyCanvas.css */
.bt-canvas {
  position: absolute;  /* decouple from viewBox intrinsic */
  inset: 0;
  width: 100%;
  height: 100%;
}
```

`.tg-content--blueprint > * { ... height: 100%; flex: 1 1 auto }`
(receiver) was already in place; with the container's basis now 0
the chain resolves cleanly to the lab-view's height. The SVG's
`position: absolute; inset: 0` makes it fill `.bt-canvas-wrap`
unconditionally — it no longer matters what viewBox the layout
produces.

Net effect: canvas owns the full work surface for every scenario
size. Dragging a node never expands the canvas because the
container size is fixed by the flex chain, not by the SVG element.

### Root cause #2 — Metro circles

V1BL-A's dot branch in `Glyph` rendered `<circle r=8 fill=ink-2>`
for every node regardless of family. V1BN's identity resolver
correctly inferred FW/EDGE-RT/etc. but the dot render threw it
away.

### Fix #2 — `DotMini` per-family shape

New `<DotMini family selected />` component renders distinct shapes:

| Family   | Shape                              |
|----------|------------------------------------|
| FW       | `<rect 14×14>` (square)            |
| CORE-RT  | `<polygon>` 4-point diamond        |
| EDGE-RT  | `<rect 18×10 rx=3>` rounded-wide   |
| DIST-SW  | `<rect 10×16>` tall                |
| ACC-SW   | `<rect 16×8>` wide                 |
| WAP      | `<polygon>` triangle               |
| SRV      | `<circle r=7>` (was the default)   |
| UNK      | `<circle r=6 opacity=0.75>` soft   |

Selected state still flips fill to cyan, grows slightly, and keeps
the focus ring overlay. Each `<g>` carries `data-family-mini="<code>"`
for tests and future styling.

Metro 96 now reads as a mix of role shapes per cluster instead of
identical dots.

### Root cause #3 — callout couldn't be dismissed

V1BI's `PickCallout` had `pointer-events: none` and no close
control. Clicking empty 3D scene SHOULD have cleared the pick
state (handler checks `pick.hit`) but Babylon doesn't always fire
POINTERPICK on empty hits.

### Fix #3 — three exits

In `HardwareInspectScene`:

```ts
const clearPick = useCallback(() => {
  setPickedZone(null);
  setCalloutAnchor(null);
  sceneRef.current?.highlight.removeAllMeshes();
}, []);

// Esc clears pick only when a pick is active.
useEffect(() => {
  if (!pickedZone) return;
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      e.stopPropagation();
      clearPick();
    }
  };
  window.addEventListener("keydown", onKey, true);
  return () => window.removeEventListener("keydown", onKey, true);
}, [pickedZone, clearPick]);
```

`PickCallout` got an `onClose` prop and renders a small `×` at the
top-right. The callout's CSS `pointer-events` flipped from `none`
to `auto` so the button is clickable; the leader-line SVG keeps
its own `pointer-events: none`.

Result:
- `×` on the card → dismiss.
- Esc (when a pick is active) → dismiss.
- Pick another zone → existing replace behaviour.
- Back → still exits the bay.

### Files changed (hotfix-1)

```
edit  src/modes/topology/TopologyGraphPanel.css                                # drop border; flex-basis 0
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.css                  # SVG position absolute inset 0
edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx                  # DotMini per-family; data-family-mini
edit  src/modes/topology/inspect/HardwareInspectScene.tsx                       # clearPick + Esc handler; PickCallout onClose + × button
edit  src/modes/topology/inspect/HardwareInspectScene.css                       # .his-callout pointer-events:auto; .his-callout-close styles
edit  src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx   # +1 metro mini-glyph regression; update V1BL-A circle test to SRV family
```

### Validation (hotfix-1)

```
pnpm typecheck   → green
pnpm test --run  → green (216 files, 2403 tests, 0 failures; +1 vs V1BN body, V1BL-A test rewritten)
pnpm build       → green (6.15s)
```

### Bundle effect (hotfix-1)

| Chunk                | V1BN           | V1BN.hf1       | Note |
|----------------------|----------------|----------------|------|
| `index-*.js` (shell) | 759.48 kB      | **760.62 kB**  | +1.14 kB (DotMini per-family branches) |
| `index-*.css`        | 216.01 kB      | 216.00 kB      | unchanged |
| `HardwareInspectScene-*.js` | 6.29 kB | **6.77 kB**    | +0.48 kB (clearPick + Esc handler + close button) |
| `HardwareInspectScene-*.css` | 4.49 kB | **4.86 kB**   | +0.37 kB (.his-callout-close styles) |
| `babylon-*.js`       | 5,105.94 kB    | 5,105.94 kB    | unchanged |

Babylon stays 100 % deferred. Receiver still grep-clean of
`@babylonjs/core`. `?preview=hardware-kit` URL preserved.

### Caveats (hotfix-1)

1. **`.tg-content--blueprint { border }` dropped** — if Bujar later
   wants a thin frame back, prefer painting it on `.hardware-inspect-receiver`
   instead of `.tg-content--blueprint` so it sits inside the
   receiver, not around the panel.
2. **DotMini shape vocabulary is conservative** — 7 distinct
   shapes + soft UNK circle. At very small zoom (when Fit collapses
   metro hard) some shapes can read similarly. Tuning radii/sizes
   is straightforward.
3. **`×` button uses `font-size: 16px`** — at the current callout
   scale, the button reads cleanly. If a future stage compresses
   the callout, drop to 14 px.
4. **Esc keydown handler uses capture phase** so the canvas-level
   Esc (V1BL-B "clear floating passport") doesn't fire first. Only
   active when a pick exists; otherwise the canvas-level handler
   wins.

## Next candidate stages

1. **V1BN-A — Camera / support family** (extend the 8-family
   contract; re-target the resolver's camera keywords).
2. **V1BN-B — Edge bundling** (group edges that share endpoints
   into a single visual stroke).
3. **V1BL-J — Device-info panel** under the bay (uses freed
   lower-right space; resolver `displayLabel` + `roleLabel`
   already wired).
4. **V1BL-I — Drag persistence** (env-scoped local-storage of
   `nodeOffsets`).
5. **V1BJ-A — Glyph-rect morph reticle** (still open).

## AO orchestration report

- subagents: 0 (two pure modules + targeted wiring; perfect
  Opus-solo sweet spot for table-driven modules)
- Opus solo: 7 file edits + 1 stage note. One TypeScript
  correction loop (TS2305 — `defaultProfileIdFor` lives in
  `blueprintGlyph.ts`, not `hardwarePassport.ts`). One test
  correction loop (V1BM campus test hit a CORE-RT keyword gap;
  added two keywords).
- effectiveness: −10 % tokens vs hybrid; the pure-module pattern
  + table tests is exactly the work Opus does cleanly without
  coordination
- recommendation: identity/routing/algorithm modules + table
  tests stay Opus-solo

---

## Hotfix-2 — V1BN rescue gate (2026-05-24)

**Trigger:** Bujar visual verify of hotfix-1 made surface worse.
Across all 5 scenarios: Metro/Mega trapped in upper canvas,
repeating horizontal split line, active upper + dead lower app
area, topology can't operate across full surface, border keeps
creeping back, env-list disappears all but active.

**Orchestration:** Opus 4.7 supervised + 2 Sonnet 4.6 Explore
subagents in parallel.
- **S1 — receiver/lab-view trace.** Located
  `HardwareInspectReceiver.css` (`.hardware-inspect-receiver`
  paints 32×32 linear-gradient grid full-surface; `.hir-bay` is
  absolute top-right with `border-bottom` + opaque white). Mapped
  flex chain root→canvas via `TopologyMode.tsx:1332`
  (`.tm-body--lab-view`) → `TopologyGraphPanel` → receiver →
  `.hir-map` (flex 1 1 auto) → blueprint-topology grid.
- **S2 — env persistence trace.** Generated labs persist only
  in `BrowserLocalStorage` via
  `EnvironmentLifecycleContext.tsx:115-122` (`commit_record`
  reducer appends). Rust `EnvironmentEngine` is a static 4-entry
  `demo_catalogue()` (`src-tauri/src/engines/environment.rs:263`).
  No `save_lab_environment` / `list_saved_environments` Tauri
  commands. **Verdict: LARGER.**

**Root cause (surface):**

1. `.hir-bay` `border-bottom: 1px` (HardwareInspectReceiver.css)
   painted the horizontal hairline Bujar reads as "active upper
   + dead lower split". The eye stops at the rule even though
   the map continues underneath.
2. `viewBox` computed from layout bbox + `preserveAspectRatio=
   "xMidYMid meet"` + identity initial transform → for square
   layouts (metro/datacenter) on wide SVG rects, content
   letterboxed into a top-centred band. Read as "metro trapped
   in upper part of canvas".
3. No initial `fitView` on mount/view-change → operator never
   sees content-fills-surface on first paint.

**Fixes:**

```
edit  src/modes/topology/inspect/HardwareInspectReceiver.css
        .hir-bay — removed border-bottom; box-shadow + border-left
        alone signal the raised card.

edit  src/modes/topology/TopologyGraphPanel.css
        .tg-content--blueprint > .hardware-inspect-receiver —
        explicit flex 1 1 auto / min-height 0 / height 100 % so
        receiver height contract is unambiguous (defense in depth
        against the SVG intrinsic-chain collapse learning).

edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx
        useLayoutEffect — auto-fit-to-content once per view
        change. Uses a deferred rAF so the SVG rect is measured
        before fitView() runs. Idempotent per view ref.

edit  src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx
        new describe block: V1BN.hotfix-2 surface ownership
        parity. 5 scenarios (Micro 3 / Branch 8 / Campus 24 /
        Datacenter 32 / Metro 96) — every scenario mounts the
        same surface chain (root > wrap > svg > transform-root),
        viewBox always present, preserveAspectRatio xMidYMid
        meet, no .bt-grid-line generator, correct node count.
```

**Manual verify checklist (Bujar runs before commit):**

```
Micro 3        : full canvas, no split, content fills surface
Branch 8       : full canvas, normal operation
Campus 24      : full canvas, no dead lower area
Datacenter 32  : full canvas, no split
Metro 96       : full canvas, readable dense view, content
                  fills (not trapped to upper third)
Open 3D bay    : map below stays visible, no horizontal hairline
                  along bay's bottom edge
Close 3D bay   : map height unchanged (no flash / no resize)
Node drag      : controlled speed, links follow
Wheel          : zoom only
Drag canvas    : pan
Fit / Reset    : recover graph
Env list       : known LARGER bug — labs vanish across restart.
                  Not in this hotfix scope.
```

**Env persistence — scoped as next stage (V1BO-env-persistence):**

- **Cause:** `EnvironmentLifecycleContext` appends generated labs
  to `state.environments[]` and auto-saves to BrowserLocalStorage
  on `store_revision` change. Backend
  (`src-tauri/src/engines/environment.rs`) ignores generated labs
  entirely — only persists `active_environment_id` to JSON. When
  localStorage clears (browser quota, manual clear, dev refresh,
  cross-window mismatch), the entire frontend list vanishes and
  only the backend's hardcoded active id survives.
- **Why labs "disappear except one":** the surviving record is
  whatever the backend reports as active when localStorage is
  empty. Frontend has no Rust round-trip to recover the list.
- **Next stage scope:**
  - Add `save_lab_environment(record)` and
    `list_saved_environments()` Tauri commands in
    `src-tauri/src/commands/environment.rs`.
  - Add a JSON-file (or SQLite) backing store in
    `src-tauri/src/engines/environment.rs` for generated labs,
    keyed by `environment_id`.
  - On `EnvironmentLifecycleContext` mount, invoke
    `list_saved_environments()` and merge with localStorage
    rather than replacing.
  - Update `EnvironmentCreatorPanel` to call `save_lab_environment`
    after `commitEnvironment` so creates are crash-safe.
- **Out of scope for V1BN.hotfix-2** — this rescue gate is
  visual; data-persistence rewrite is its own arc.

**Validation:**

```
pnpm typecheck        — pending Bujar run
pnpm test --run       — pending Bujar run (5 new scenario parity
                         tests added)
pnpm build            — pending Bujar run
```

**AO orchestration report (per memory: under 10 lines):**

- subagent S1 (Sonnet, Explore) → receiver + lab-view chain trace
  → returned grid-on-receiver verdict + bay border-bottom
  suspect + flex chain map
- subagent S2 (Sonnet, Explore) → env persistence trace →
  returned LARGER verdict + Tauri-command gap + reproduction
  path
- Opus integrator → 4 file edits + stage-note hotfix-2 + 5 new
  scenario parity tests
- effectiveness: ≈ +35 % vs Opus-solo (2 parallel research
  threads cut wall time; Opus owned the surgical edits where
  context cost > subagent overhead)
- recommendation: rescue gates with mixed visual + data audit
  match this 2-subagent + Opus-integrator pattern

---

## Hotfix-3 — V1BN canvas-only rescue (2026-05-24)

**Trigger:** Bujar visual verify after Hotfix-2. Canvas still
trapped in small upper portion; border became hard/stuck. Drag
no longer expands border. Topology + 3D bay cropped. 3D bay
internals (ports/zones/selection) — fine, do not touch.

**Orchestration:** Opus 4.7 supervised + 1 Sonnet 4.6 Explore
subagent.
- **S3 — topology height-chain trace.** Walked the chain from
  AppShell → ModeWorkbenchShell → topology-mode →
  `.tm-body--lab-view` → TopologyGraphPanel → receiver →
  `.hir-map` → blueprint-topology → `.bt-canvas-wrap` →
  `svg.bt-canvas`. Reported every height/flex declaration with
  file:line.

**Root cause:**

`src/components/shell/ModeWorkbenchShell.css:147-150`
```css
.mwb-active-body {
  flex: 1;
  overflow-y: auto;
  background: var(--anth-bg-app);
}
```

`.mwb-active-body` declares `flex: 1` (works — claims parent
height inside `.mwb-active` flex column) and `overflow-y: auto`
(scroll viewport). But **no `display: flex`**. Its child
`.tm-body--lab-view` declares `flex: 1 1 auto; min-height: 0`,
which is **inert against a non-flex parent**. The lab-view
collapses to intrinsic content height.

`.tg-content--blueprint` had `min-height: 320 px` as a
defensive floor — that became the ONLY thing claiming height
in the broken chain. Canvas pinned to 320 px → Bujar saw the
"stuck upper portion" trap.

Hotfix-2's `flex: 1 1 auto; height: 100 %` on the receiver
made things worse: `height: 100 %` of a 320 px parent =
320 px, locking the bay + canvas to the same upper rectangle.

**Fix:**

```
edit  src/modes/topology/TopologyMode.css
        new rule (topology-scoped, zero blast radius):
        .topology-mode .mwb-active-body {
          display: flex;
          flex-direction: column;
        }
        → lab-view's flex: 1 1 auto now claims real height.

edit  src/modes/topology/TopologyGraphPanel.css
        removed min-height: 320 px from .tg-content--blueprint.
        Was the symptom-ceiling, no longer needed.

edit  src/modes/topology/inspect/HardwareInspectReceiver.tsx
        added data-topology-full-surface="true" on
        .hardware-inspect-receiver; data-topology-map-layer
        ="true" on .hir-map.

edit  src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx
        added data-topology-svg-layer="true" on svg.bt-canvas.

new   src/modes/topology/inspect/__tests__/HardwareInspectReceiver.surface.test.tsx
        5 scenario parity tests (Micro 3 / Branch 8 / Campus 24
        / Datacenter 32 / Metro 96): every scenario mounts the
        same full-surface chain (full-surface > map-layer >
        svg-layer), no scenario-specific wrapper, bay-closed
        keeps map mounted. Structural only — jsdom cannot
        measure height.

edit  src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx
        new test asserts the SVG carries the
        data-topology-svg-layer marker.
```

**Height contract after fix (every layer definite):**

```
.anth-shell                grid-template-rows 36/34/1fr/28/24
.anth-work                 flex 1 1 auto in grid row 1fr
.anth-work__content        flex 1 1 auto (block scroll viewport)
.topology-mode             height: 100 % (parent gives real px)
.topology-mode > .mwb      flex: 1; min-height: 0
.mwb                       height: 100 %; flex column
.mwb-active                flex: 1; flex column
.mwb-active-body           flex: 1; flex column   ← HOTFIX-3
.tm-body--lab-view         flex: 1 1 auto; min-height: 0; flex column
TopologyGraphPanel chain   each layer flex 1 1 auto + min-height: 0
.hardware-inspect-receiver flex column; full height of parent
.hir-map                   flex: 1 1 auto (absolute bay overlay)
.blueprint-topology        height: 100 %; grid (header auto, canvas 1fr)
.bt-canvas-wrap            grid-area: canvas; position: relative
svg.bt-canvas              position: absolute; inset: 0
```

Canvas height is now independent of: graph bbox, SVG viewBox,
node count, selected node, drag state, bay open/closed,
scenario. Dragging nodes cannot affect canvas size (SVG is
absolute inset:0 inside a flex-derived wrap that has no
intrinsic feedback to graph layout). Fit/Reset still acts only
on graph transform.

**Manual verify checklist (Bujar runs before commit):**

```
Micro 3        : full-height canvas, no stuck upper border
Branch 8       : full-height canvas
Campus 24      : full-height canvas
Datacenter 32  : full-height canvas
Metro 96       : full-height canvas, dense view fills surface
Bay open       : map layer remains full-height behind/around
                  bay; bay is a contained top-right card
Bay close      : map height unchanged (no resize)
Node drag      : controlled speed, links follow, canvas size
                  unchanged regardless of drag distance
Wheel          : zoom only
Drag canvas    : pan
Fit / Reset    : graph transform only (canvas size unchanged)
```

**Validation:**

```
pnpm typecheck   ✓ (pending Bujar run)
pnpm test --run  ✓ (pending Bujar run; 5 new receiver parity
                   + 1 new svg-layer marker test added)
pnpm build       ✓ (pending Bujar run)
```

**AO orchestration report (per memory: under 10 lines):**

- subagent S3 (Sonnet, Explore) → topology height-chain trace
  → returned `.mwb-active-body` non-flex offender + Tier-1
  candidates (shell.css `.anth-work__content`). Opus verified
  S3's hypothesis against shell.css before editing — final
  offender confirmed `.mwb-active-body`, not `.anth-work__content`.
- Opus integrator → 5 file edits + new receiver test + stage
  note hotfix-3 section. Topology-scoped CSS (zero blast
  radius) instead of editing ModeWorkbenchShell.css.
- effectiveness: ≈ +20 % vs Opus-solo (1 parallel research
  thread; Opus owned hypothesis-verification + surgical edits)
- recommendation: chain-trace bugs across shell layers benefit
  from 1 Sonnet read-only subagent + Opus verification before
  edit — never edit on subagent hypothesis alone.
