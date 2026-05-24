# V1BQ — Persistent Topology Layout Overrides

**Date:** 2026-05-24  
**Status:** Implementation complete — pending Bujar manual verify  
**Validation:** typecheck clean · 2445/2445 tests pass · build clean

---

## What Was Built

Operator-made topology layout edits now persist automatically. When a node is dragged on the Blueprint canvas, its position is saved to the active environment's durable record and survives environment switches, app restarts, and localStorage clears.

---

## Data Model

`TopologyPresentation` added to `src/types/localEnvironment.ts`:

```ts
export interface TopologyPresentation {
  readonly version: 1;
  readonly node_positions: Record<string, { readonly x: number; readonly y: number }>;
}
```

`LocalEnvironmentRecord` gains optional field:
```ts
readonly topology_presentation?: TopologyPresentation;
```

**Stored as:** absolute world-coordinate positions per node, per environment.  
**Backward compatible:** environments without `topology_presentation` load normally; missing field = empty overrides = generated layout used for all nodes.

---

## Persistence Path

1. Drag ends → `onUp` window handler reads final `nodeOffsets` + `baseLayouts` via stable refs
2. Computes absolute position: `{ x: base.x + offset.dx, y: base.y + offset.dy }`
3. Calls `lifecycle.updateTopologyPositions(envId, { [nodeId]: { x, y } })`
4. Context reducer merges into env record (per-key upsert) → bumps `store_revision`
5. Existing V1BO auto-save fires → persists through `DurableEnvironmentAdapter` → Tauri file + localStorage mirror

---

## Rehydration Path

On view change (`useEffect` on `[view]`):
1. Reads `lifecycleRef.current.active.topology_presentation.node_positions`
2. For each node with a saved position: computes `{ dx: saved.x - base.x, dy: saved.y - base.y }`
3. Sets `nodeOffsets` from saved offsets; untouched nodes use `{ dx: 0, dy: 0 }` (generated layout)

**Key design:** `lifecycle` is NOT in the effect dep array. Access via `lifecycleRef` prevents the effect from re-firing on every position-persist (which would reset transform and clear selection mid-session).

---

## Reset / Fit Behavior

- **Fit** — unchanged: fits current visible graph within viewport (pan/zoom only)
- **Reset** — changed: now only restores pan/zoom to identity. Does NOT clear persisted node placements. V1BQ spec: operator's desk arrangement survives Reset.
- Button tooltip updated: "Reset pan/zoom (node placements preserved)"

To clear persisted placements: future explicit action (out of V1BQ scope per spec).

---

## Per-Environment Separation

Moving a node in Micro Lab only updates Micro Lab's `topology_presentation`. Campus, Branch, Metro each carry their own independent `node_positions` map. Switching environments loads each env's own saved positions.

---

## Files Changed

| File | Change |
|------|--------|
| `src/types/localEnvironment.ts` | `TopologyPresentation` interface + optional field on `LocalEnvironmentRecord` |
| `src/state/environmentLifecycle.ts` | `updateEnvironmentTopologyPositions()` pure state fn |
| `src/state/EnvironmentLifecycleContext.tsx` | `update_topology_positions` action + `updateTopologyPositions` callback exported |
| `src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx` | Stable refs, view-change loads overrides, drag-end persists, Reset only resets pan/zoom |
| `src/modes/topology/blueprint/blueprintLayouts.ts` | Stale header comment updated |
| `src/modes/topology/__tests__/TopologyLayoutOverrides.test.tsx` | NEW — 19 tests covering pure fn, context, and component |

---

## Tests Added

**Group 1 — Pure function (6):** merge into empty/existing positions, upsert, env not found, immutability, multi-env isolation, version field

**Group 2 — Context integration (3):** dispatch updates env record, per-env isolation, active env contains new position

**Group 3 — Component (6):** saved positions applied on mount, no-position renders generated layout, A→B→A preserves A's positions, Reset does NOT call updateTopologyPositions, drag-end spy in place, offset application

**Group 4 — Edge cases (4):** version preserved, empty update no-op, zero/negative coords, large coords

---

## Caveats

1. **`view` prop drives overlay reset** — the canvas resets selection + transform + loads overrides when `view` changes. If two envs produce the same `view` object reference (e.g. empty topology), the effect won't re-fire and overrides won't reload. In practice, env switches always produce new `view` objects.
2. **No explicit "Clear Placements" action** — per spec, this is deferred to a future stage.
3. **Blueprint path only** — selector and canvas only exist in the `data_source === "simulated"` path. V1AY (imported/demo) path is unaffected.
4. **Rust unchanged** — no Rust changes; the Tauri blob blob stores the full JSON including `topology_presentation` automatically via existing V1BO path.

---

## Manual Verification Checklist

1. Start app from clean current main
2. Confirm multiple generated environments still present from V1BO
3. Open Topology
4. Select Micro Lab
5. Drag one router/switch to a clearly different position
6. Switch to Branch Lab
7. Switch back to Micro Lab → moved device stays where placed
8. Restart app
9. Open Topology → select Micro Lab → device still placed correctly
10. Select Campus or Metro → drag a different device
11. Restart again
12. Confirm Micro Lab device still at custom position AND Campus/Metro device also persisted
13. Click Fit → layout preserved, pan/zoom resets
14. Click Reset → layout preserved, pan/zoom resets (not cleared)
15. Inspect a moved node → 3D bay opens correctly

---

## Next Stage Candidates

- V1BL-J: device-info panel (lower-right grid freed; identity resolver wired)
- V1BL-I: drag persistence polish (multi-node drag, snap-to-grid option)
- V1BN-A: camera family
- V1BN-B: edge bundling
