# V1BS — Icon-as-Frame Device Glyphs

**Date:** 2026-05-25
**Status:** Implementation complete — pending Bujar manual verify
**Validation:** typecheck clean · 2462/2462 tests pass · build clean
**Prior stages on main:** V1BO durability · V1BP topology selector · V1BQ persistent layout overrides · V1BR archive + colour polish (with HF1/HF2/HF3)

---

## Mission

Replace the rectangle-frame device glyph with proper schematic SVG icons authored by Design Claude. Icon-as-frame: the icon IS the device shape. Family colour drives icon stroke via `currentColor`. All existing behaviours (drag, pan, zoom, click, double-click Inspect, passport, env selector, archive, V1BQ persistent positions) preserved. Only the visual changes.

---

## Icon Set

Eight canonical icons copied from `design-review/device-icons/` to `src/assets/device-icons/`:

| File | Family | Size |
|---|---|---|
| `icon-fw.svg` | `FW` | 896 B |
| `icon-core-rt.svg` | `CORE-RT` | 911 B |
| `icon-edge-rt.svg` | `EDGE-RT` | 860 B |
| `icon-dist-sw.svg` | `DIST-SW` | 1391 B |
| `icon-acc-sw.svg` | `ACC-SW` | 979 B |
| `icon-wap.svg` | `WAP` | 505 B |
| `icon-srv.svg` | `SRV` | 908 B |
| `icon-unk.svg` | `UNK` | 281 B |

Three extras (`icon-cloud.svg`, `icon-vpn.svg`, `icon-wan.svg`) parked in `design-review/device-icons/` — not in `NodeFamilyCode` union; drop in via a future stage when the taxonomy expands.

Spec compliance: viewBox `0 0 64 64`, `stroke="currentColor"`, `fill="none"`, round caps/joins, `vector-effect="non-scaling-stroke"` on every shape, no metadata / transforms / inline styles / forbidden tags. Design Claude shipped at `stroke-width="0.75"` (vs the contracted `2`) — handled by a runtime CSS override (`1.5`).

---

## Registry

**`src/modes/topology/blueprint/deviceIcons.tsx`** — `DEVICE_ICON: Record<NodeFamilyCode, JSX.Element>` exposes each icon's inner SVG content (no `<svg>` wrapper) plus `DEVICE_ICON_VIEWBOX = { w: 64, h: 64 }`. Each icon is wrapped in a `<g data-network-icon="...">` so tests + CSS can target it.

The canvas wraps the registry entry in a `<g transform="translate scale">` that maps the 64×64 source box onto the family's `FAMILY_FRAME` w/h centred at the node origin.

---

## Canvas Wiring

`src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx`:

- Imports `DEVICE_ICON` + `DEVICE_ICON_VIEWBOX`.
- In the full/faceplate-band render block:
  - `.bt-node-frame` rect kept in DOM as transparent hit-target (`fill: transparent; stroke: none;`). Drives drag bbox, focus-ring anchor, click hit detection.
  - `.bt-node-faceplate` rect REMOVED entirely.
  - Family-code `<text>` kept but moved from centre to just above the hostname (`y={frame.h/2 - 1}`) at reduced font-size — icon is the headline element now.
  - New `<g className="bt-node-icon" transform="translate(-w/2, -h/2) scale(w/64, h/64)">` wraps `DEVICE_ICON[family]`.
- `data-family` attribute unchanged on `.bt-node`.
- Metro `DotMini` (dot-density) untouched — V1BR.hotfix-3 outline-only rendering still applies.

---

## CSS

`src/modes/topology/blueprint/BlueprintTopologyCanvas.css`:

- `.bt-node-frame` → invisible (`fill: transparent; stroke: none;`).
- V1BR.hotfix-3 per-family stroke rules → REPLACED with `color:` cascade. The icon strokes use `currentColor`, so setting `color: var(--topo-fam-...)` on `.bt-node[data-family=...]` paints the entire icon at once.
  - `[data-family="FW"]` → `color: var(--topo-fam-fw)`
  - `[data-family="CORE-RT" | "EDGE-RT"]` → `color: var(--topo-fam-router)`
  - `[data-family="ACC-SW" | "DIST-SW" | "WAP"]` → `color: var(--topo-fam-switch)`
  - `[data-family="SRV"]` → `color: var(--topo-fam-server)`
  - `[data-family="UNK"]` → `color: var(--topo-node-unknown-stroke)`
- Stroke-width runtime override: `.bt-node-icon [vector-effect="non-scaling-stroke"] { stroke-width: 1.5; }` (Design Claude shipped at 0.75 — bumped at runtime so the family colour reads at our render scale).
- Hover: `.bt-node:hover .bt-node-icon { stroke-width: 1.75; }`.
- `.bt-node-family-code` reduced to `font-size: 6.5px`, `opacity: 0.6`, positioned just inside the bottom edge of the frame. Small recessed cue, not the headline.

---

## Behaviour Contract

| Aspect | Result |
|---|---|
| Device visual | Schematic icon (chassis with port indicators / rack drawing) |
| Outline colour | Family colour (FW green, routers blue, switches teal, SRV blue, UNK muted) via `currentColor` |
| Interior | Empty (icon strokes only) |
| Family-code text | Small (6.5 px), recessed (opacity 0.6), tucked above hostname |
| Hostname | Unchanged — same position, same font |
| Selected ring | Unchanged (cyan focus ring overlay) |
| State ring | Unchanged |
| Drag bbox | Unchanged (transparent `.bt-node-frame` rect drives it) |
| Click / passport | Unchanged |
| Double-click → 3D bay | Unchanged |
| Persistent positions (V1BQ) | Unchanged |
| Env selector (V1BP) | Unchanged |
| Archive (V1BR Part A) | Unchanged |
| Metro DotMini | Unchanged (V1BR.hotfix-3 outline dots) |
| Hover | Slight stroke-width bump on the icon |

---

## Tests Added

`src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx` — `V1BS icon-as-frame` describe block:

- `renders the family icon group inside each device node` — FW + CORE-RT + EDGE-RT + ACC-SW all surface `[data-network-icon=...]` in the DOM.
- `hit-target frame stays in the DOM (drag/click rely on it)` — `.bt-node-frame` still queryable.
- `UNK family renders its dashed icon group` — `[data-network-icon="unk"]` present.

No pixel/colour assertions (jsdom can't compute CSS variables reliably).

---

## Validation

```
pnpm typecheck       → clean
pnpm test --run      → 220/220 files, 2462/2462 tests (+3 from V1BR's 2459)
pnpm build           → built in 5.57s, no errors
```

---

## Files Changed

```
src/assets/device-icons/icon-fw.svg          (new)
src/assets/device-icons/icon-core-rt.svg     (new)
src/assets/device-icons/icon-edge-rt.svg     (new)
src/assets/device-icons/icon-dist-sw.svg     (new)
src/assets/device-icons/icon-acc-sw.svg      (new)
src/assets/device-icons/icon-wap.svg         (new)
src/assets/device-icons/icon-srv.svg         (new)
src/assets/device-icons/icon-unk.svg         (new)
src/modes/topology/blueprint/deviceIcons.tsx (new)
src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx
src/modes/topology/blueprint/BlueprintTopologyCanvas.css
src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx
obsidian/stages/V1BS-icon-as-frame-device-glyphs.md (this file)
```

---

## Manual Verification Path

1. Start app. Open Topology with Micro scenario.
2. Confirm devices render as schematic icons (chassis with port indicators), not rectangles.
3. Confirm outline colour matches family: FW green, routers blue (CORE-RT, EDGE-RT), switches teal (ACC-SW, DIST-SW, WAP), SRV blue, UNK dashed muted.
4. Confirm the family code (EDGE-RT etc.) shows as a small recessed label above the hostname.
5. Confirm hostname still readable at the bottom.
6. Switch through Branch / Campus / Datacenter / Metro scenarios. Confirm icons scale into each family's FAMILY_FRAME w/h cleanly. Confirm Metro density still shows the V1BR.hotfix-3 coloured dot rings (icon-as-frame applies only to full / faceplate bands).
7. Click a node — confirm cyan focus ring still pops and the passport card opens.
8. Drag a node — confirm drag persistence (V1BQ) still saves.
9. Double-click — confirm Hardware Inspect 3D bay opens.
10. Switch environments via the selector (V1BP) — confirm no regression.
11. Archive / restore an environment (V1BR Part A) — confirm no regression.
12. Restart app — confirm persistence intact, icons reload cleanly.

---

## Caveats

- Stroke-width override lives in the canvas CSS rather than the icon source. If a future contract requires a different render scale, change one CSS rule rather than re-cutting 8 SVGs.
- The 3 extras (cloud / vpn / wan) are parked. Wiring them requires extending `NodeFamilyCode`, `roleLabelFor`, `FAMILY_FRAME`, the resolver keywords, plus several test files. Defer to a future stage.
- The `.bt-node-faceplate` CSS class is no longer rendered but the rule remains in the stylesheet. Cosmetic cleanup; remove on a later sweep if you want.
- `--topo-node-frame-fill`, `--topo-node-text-strong` and other HF1/HF2 tokens are still defined; only the per-family stroke rules from HF3 were replaced. No churn on tokens themselves.

Wait for Bujar manual verify before commit/push.

---

## Hotfix-1 — 2026-05-25

**Trigger:** Bujar visual review: 3D window works; 2D nodes still showed the old frame shape with black lines/squares inside; Metro MEGA Lab empty.

**Root cause:** When I extracted icon content from source SVGs, I dropped the outer `<svg>` element — but that element carried the `stroke="currentColor"` + `fill="none"` presentation attributes that the inner shapes inherited via SVG attribute inheritance. The `<g data-network-icon>` wrapper had no stroke attribute, so the inner `<rect>` / `<line>` / `<circle>` / `<path>` elements rendered with SVG defaults (black stroke or no stroke), ignoring the CSS `color:` cascade entirely. Result: icons looked like generic black geometry inside the (correctly invisible) hit-target frame.

**Fix:** Restore the presentation attributes on every `<g data-network-icon>` wrapper in `deviceIcons.tsx`:

```tsx
<g
  data-network-icon="fw"
  stroke="currentColor"
  fill="none"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  …
</g>
```

Applied to all 8 family entries (FW, CORE-RT, EDGE-RT, DIST-SW, ACC-SW, WAP, SRV, UNK). Now SVG presentation-attribute inheritance carries `stroke="currentColor"` down to each shape, the CSS `color: var(--topo-fam-*)` rule on `.bt-node[data-family=...]` resolves `currentColor` to the family colour, and every icon paints in its family hue.

**Metro "empty inside":** That's the correct V1BR.hotfix-3 outline-only dot behaviour (dense Metro 96+ scenarios render `DotMini` which uses outline-only shapes per family). DotMini has its own inline `stroke={dotFamilyStroke(family)}` path and was never affected by this defect; it already paints family colours. The "empty" reading is the intended outline-only visual, not a bug. If you want filled dots at Metro density later, a separate stage can flip the `DotMini` fill.

**Files modified:**
- `src/modes/topology/blueprint/deviceIcons.tsx` — 8 wrapper edits

**Validation:** typecheck clean · 2462/2462 tests pass · build clean (5.54s).

---

## Hotfix-2 — 2026-05-25

**Trigger:** Bujar visual review after HF1: Micro + Branch render correctly. Campus onward drops hostname labels. Metro (densest) nodes are not draggable / not double-clickable — pointer events fall through outline-only dots.

**Root causes:**

1. **Labels missing on Campus+** — `showLabel = band === "full"` gated hostnames to Micro only. Campus = `"silhouette"` band, Datacenter / Metro = `"dot"` band — both rendered no hostname.
2. **Metro not interactive** — dot-density branch returned early with only `DotMini` + focus ring as children. `DotMini` shapes after V1BR.hotfix-3 are outline-only (`fill="none"`), and `pointer-events: visiblePainted` means only the ~1.25 px stroke catches clicks. With dots at ~10 px, the hit-target is functionally absent. Drag pointer-down and double-click never fire.

**Fix:**

- `BlueprintTopologyCanvas.tsx`:
  - `showLabel` changed to `true` — hostnames render on every band (full / faceplate / silhouette).
  - Dot branch now renders: invisible hit-target `.bt-node-frame` rect (24×24, rx=3) — drives drag/click/double-click pointer events; the existing `DotMini` outline shapes paint over it. Added `data-family={family}` (alongside the existing `data-family-mini`) so the family-colour CSS cascade reaches the dot branch the same way it reaches the full branch. Hostname rendered with new `.bt-node-label--dot` class.
- `BlueprintTopologyCanvas.css`:
  - New `.bt-node-label--dot { font-size: 7px; opacity: 0.85 }` — smaller label so Metro density doesn't crowd.
- Tests:
  - Updated the legacy "96-node dot scenario" assertion: was asserting `.bt-node-label.length === 0` (old contract); now asserts `.bt-node-label--dot.length > 0`.
  - New test: `dot-density nodes render an invisible hit-target frame for drag/click` (asserts `.bt-node-frame` inside `[data-density="dot"]`).
  - New test: `hostname labels render across all bands (full / faceplate / silhouette / dot)` — covers 5 / 20 / 40 / 96 node graphs.

**Files modified:**
- `src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx`
- `src/modes/topology/blueprint/BlueprintTopologyCanvas.css`
- `src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx`

**Validation:** typecheck clean · 2464/2464 tests pass (+2 net from 2462) · build clean (5.43s).
