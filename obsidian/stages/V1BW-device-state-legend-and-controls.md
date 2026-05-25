# V1BW — Device State Legend + State Controls

**Stage date**: 2026-05-25  
**Previous stage**: V1BV (link state layer)  
**Status**: Complete

---

## Mission

Add a calm, compact legend to the Topology canvas that displays device + link counts by operational state, plus a lightweight "Affected only" toggle that fades healthy items to make affected devices and links pop. Pure CSS fade — no filtering, no removal from DOM. Hit-testing remains enabled.

## Design Principles

1. **Calm, not ceremonious**: Legend sits bottom-left inside `.bt-canvas-wrap`, balancing the `.bt-nav` controls at bottom-right.
2. **No mutations**: The view graph stays intact; `affectedOnly` is a CSS display toggle, not a data transformation.
3. **Hit-testing always live**: Healthy items fade to `opacity: 0.18` (nodes) / `0.10` (edges), not `display: none`. Click, drag, double-click work on faded items.
4. **Selection always wins**: A selected node's connected edges stay at full opacity (via `:has(.bt-node-focus-ring)` and `.is-active` rules), readable in affected-only mode.
5. **State vocabulary immutable**: Reuse the V1BU/V1BV 6-state union; no colour token additions; reuse existing `--topo-ok/warn/err/critical/maint/deferred`.

## Legend Component Structure

### Counts Display
Legend shows two sections (Devices / Links) with 6 state pills each:
- **State swatch** (8×8px square, colour-keyed)
- **State label** ("Healthy", "Warning", "Degraded", "Down", "Maintenance", "Unknown")
- **Count** (numeric, tabular)

States render in a fixed order: `healthy → warning → degraded → down → maintenance → unknown`.

### "Affected Only" Toggle
- **Label**: "Affected only"
- **Behavior**: When checked, healthy devices drop to `opacity: 0.18`; healthy links to `opacity: 0.10`.
- **Selected items**: Cyan selection ring + `.is-active` edges always stay fully opaque (`:has()` selector on selected nodes).
- **Disabled title**: When no affected items exist, title reads "No affected items". When affected items exist, title shows count breakdown: "Fade healthy: N affected devices · M affected links".

## Files Changed

### A) `src/modes/topology/blueprint/topologyStateCounts.ts` (new)
Pure helper module. No I/O, no DOM.

Exports:
- `STATE_ORDER: readonly LabOperationalState[]` — canonical state order (healthy first, unknown last)
- `StateCountMap` — Record mapping each state to its count
- `TopologyStateCounts` interface with `devices`, `links`, `affected_devices`, `affected_links`
- `computeStateCounts(view: GraphReadyTopologyView): TopologyStateCounts` — Iterate nodes/edges, tally by state, compute affected count (sum of non-healthy states)
- `formatStateLabel(state: LabOperationalState): string` — Localized label ("Healthy", "Warning", etc.)

### B) `src/modes/topology/blueprint/TopologyStateLegend.tsx` (new)
React component. Mounts inside `.bt-canvas-wrap`.

Props:
- `view: GraphReadyTopologyView` — source data
- `affectedOnly: boolean` — toggle state from parent
- `onToggleAffectedOnly: (next: boolean) => void` — callback when checkbox fires

Renders:
- `.bt-legend` container (absolute, bottom-left, 12px inset, max-width 380px)
- `.bt-legend-section` × 2 (Devices, Links)
- `.bt-legend-pill` × 6 per section (state swatch + label + count)
- `.bt-legend-affected` label with checkbox (border-top, gap 6px)

### C) `src/modes/topology/blueprint/TopologyStateLegend.css` (new)
Styling. Mirrors `.bt-nav` CSS (white paper, blue-grey border, monospace).

- `.bt-legend`: white background, 1px `--topo-line-4` border, 8px radius, 6px padding, `box-shadow: 0 2px 8px rgba(26, 37, 48, 0.05)`
- `.bt-legend-swatch[data-state="..."]`: 8×8 squares using existing `--topo-ok/warn/err/critical/maint/deferred` tokens
- `.bt-legend-count`: tabular-nums, font-weight 600, cyan accent colour on checkbox
- `.bt-legend-affected`: flex label with gap 6px, border-top, cursor pointer, user-select none

### D) `src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx` (modified)
1. **Import**: Add `import { TopologyStateLegend } from "./TopologyStateLegend";` at top.
2. **State**: Add `const [affectedOnly, setAffectedOnly] = useState<boolean>(false);` near other useState hooks.
3. **Root attribute**: Add `data-affected-only={affectedOnly ? "true" : "false"}` to root `.blueprint-topology` section.
4. **Mount legend**: Inside `.bt-canvas-wrap`, before `.bt-nav`, mount:
   ```tsx
   <TopologyStateLegend
     view={view}
     affectedOnly={affectedOnly}
     onToggleAffectedOnly={setAffectedOnly}
   />
   ```

### E) `src/modes/topology/blueprint/BlueprintTopologyCanvas.css` (modified)
Append V1BW affected-only CSS rules at end:

```css
/* V1BW — affected-only fade. When toggled on, healthy nodes + edges drop
 * to low opacity so affected items pop. Selected items keep full opacity
 * via the focus-ring + .is-active rules. Hit-testing stays enabled. */

.blueprint-topology[data-affected-only="true"] .bt-node[data-state="healthy"] {
  opacity: 0.18;
}
.blueprint-topology[data-affected-only="true"] .bt-edge[data-state="healthy"] {
  opacity: 0.10;
}
/* Selection wins: re-assert full opacity on the selected node group AND
 * on edges that carry .is-active. The selected glyph + active edges
 * stay readable in affected-only mode. */
.blueprint-topology[data-affected-only="true"] .bt-node[data-state="healthy"]:has(.bt-node-focus-ring) {
  opacity: 1;
}
.blueprint-topology[data-affected-only="true"] .bt-edge.is-active[data-state="healthy"] {
  opacity: 1;
}
```

Uses `:has()` selector (Chromium/Tauri 2 supports it).

### F) Tests (new)

#### F1) `src/modes/topology/blueprint/__tests__/topologyStateCounts.test.ts` (new)
6 tests:
- counts all-healthy view (0 affected)
- counts mixed states (5 affected devices, 1 affected link)
- treats missing `operational_state` as healthy
- returns zero affected when all healthy
- counts empty view
- formatStateLabel covers all 6 states

#### F2) `src/modes/topology/blueprint/__tests__/TopologyStateLegend.test.tsx` (new)
10 tests:
- renders legend with devices section
- renders legend with links section
- renders all 6 device states
- renders all 6 link states
- toggles affected-only checkbox and fires callback
- reflects affectedOnly prop in checkbox state
- updates title when there are affected items
- shows "No affected items" title when all healthy
- counts states correctly in complex scenario
- (future: a11y tree snapshot if needed)

#### F3) `src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx` (EXTENDED)
New describe block "BlueprintTopologyCanvas — V1BW legend + affected-only":
- mounts legend in canvas
- sets data-affected-only attribute on root section
- toggles data-affected-only when checkbox fires
- displays correct counts in legend for mixed state view

---

## State Vocabulary

Reuse V1BU `LabOperationalState` union:
```typescript
"healthy" | "warning" | "degraded" | "down" | "maintenance" | "unknown"
```

Colours (via existing tokens):
| State | Colour Token | Hex |
|-------|---|---|
| `healthy` | `--topo-ok` | #5F6B77 |
| `warning` | `--topo-warn` | #C77A0E |
| `degraded` | `--topo-err` | #B83333 |
| `down` | `--topo-critical` | #D32E2E |
| `maintenance` | `--topo-maint` | #6B4FAB |
| `unknown` | `--topo-deferred` | #9AA3AD |

---

## Validation Results

### Typecheck
```
$ pnpm typecheck
$ tsc --noEmit
✓ 0 errors
```

### Test Results
```
Test Files: 223 passed (223)
Tests:      2535 passed (2535)
   ✓ topologyStateCounts.test.ts: 6 tests (new)
   ✓ TopologyStateLegend.test.tsx: 10 tests (new)
   ✓ BlueprintTopologyCanvas.test.tsx: 4 tests added (extended)
Duration: 21.36s
```

### Build
```
$ pnpm build
✓ 2189 modules transformed
✓ dist/ assets ready
  index-CEC_gtDl.css    221.51 kB | gzip: 32.11 kB
  index-BoMW1t-Q.js     779.98 kB | gzip: 201.25 kB
  babylon-BvR-TlEU.js 5105.94 kB | gzip: 1135.12 kB
✓ built in 5.39s
```

No size regression (CSS +0.08kB, JS unchanged).

---

## 19-Step Manual Verify Path (Bujar's Protocol)

1. **Legend mounts**: Open Topology mode (active environment with nodes) → legend appears bottom-left inside canvas.
2. **Device count visible**: Legend shows "Devices" section with 6 pills, counts match view.nodes.length total.
3. **Link count visible**: Legend shows "Links" section with 6 pills, counts match view.edges.length total.
4. **All-healthy layout**: Fabricator demo (3 nodes, 2 edges) → all counts under "healthy" pill.
5. **Affected count**: Simulate one node `warning` state → legend shows 1 under "warning" device pill; total device count still 3.
6. **Mixed state legend**: Simulate 2 devices warning, 1 degraded, 1 down → device pills show 1 warning, 1 degraded, 1 down, 1 healthy, 0 maintenance, 0 unknown (sum = 3).
7. **Affected only off**: Legend checkbox unchecked → `.blueprint-topology[data-affected-only="false"]` on root.
8. **Affected only on**: Click legend checkbox → `.blueprint-topology[data-affected-only="true"]` on root.
9. **Healthy fade (nodes)**: With affected-only ON and mixed state view → healthy nodes drop to `opacity: 0.18`, warning/degraded nodes stay `opacity: 1`.
10. **Healthy fade (edges)**: With affected-only ON → healthy edges drop to `opacity: 0.10`, affected edges stay visible.
11. **Selection overrides fade**: Click a healthy node (while affected-only ON) → node stays `opacity: 1` (via `:has(.bt-node-focus-ring)`).
12. **Active edges stay opaque**: Click a healthy node with healthy outbound edges (affected-only ON) → edges to that node stay `opacity: 1` (via `.is-active` rule).
13. **Title when affected**: With affected-only enabled and mixed state view, hover checkbox → title reads "Fade healthy: N affected devices · M affected links".
14. **Title when all healthy**: Return to all-healthy state, hover checkbox → title reads "No affected items".
15. **State label format**: All 6 device + link pills read "Healthy", "Warning", "Degraded", "Down", "Maintenance", "Unknown" (title case).
16. **Count styling**: Counts use `font-variant-numeric: tabular-nums`, stay right-aligned, readable.
17. **Legend styling**: Legend has white paper background, graphite border, subtle shadow; matches `.bt-nav` aesthetic.
18. **Drag still works**: With affected-only ON, drag a faded healthy node → it moves (hit-testing enabled).
19. **No regression**: V1BU node state rings, V1BV edge state colours, V1BT selection, V1BL layout, passport all unchanged.

---

## What's NOT in Scope

- Live telemetry or dynamic state updates (demo-only)
- Filtering by removal (`display: none`) — pure CSS fade only
- Persistent toggle state (reset on page refresh)
- Legend drag/reposition (fixed bottom-left)
- Multi-select highlighting
- Impact cascade to higher layers (pathfinding, diagnostics)
- "Affected only" summary in passport (deferred to future stage)
- Full-screen "affected devices only" report (deferred)

---

## Caveats

1. **`:has()` selector**: Uses modern Chromium/WebKit/Firefox selector. Tauri 2 (Chromium) supports it. If future requirement emerges to support older browsers, re-write affected-only state assertion via `data-selected-id` attribute on root.

2. **Counts are not live**: Computed once per render. If future live state updates arrive, counts update on `view` change via React re-render.

3. **Affected only is root-level CSS**: No granular "hide device class X only" — toggle affects all healthy items uniformly.

4. **Legend position**: Fixed bottom-left. If future inspector bay layout changes, legend may need repositioning via layout observer (not in scope now).

5. **No animation on fade**: Opacity change is instant. Smooth transitions could be added later via `.blueprint-topology:has([data-affected-only="true"]) { transition: opacity 200ms ease-out; }` if desired.

---

## Cross-References

- **V1BU**: Device operational state rings (node coloring).
- **V1BV**: Link operational state layer (edge coloring).
- **V1BT**: Selection highlight (cyan ring; interaction still works on faded items).
- **V1BL**: Canvas navigation layout (legend mirrors `.bt-nav` positioning and styling).
- **V1BN**: Edge routing (geometry unaffected by state or toggle).
- **Severity precedence**: `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` (LabOperationalState hierarchy).
