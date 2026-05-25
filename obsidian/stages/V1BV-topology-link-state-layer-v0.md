# V1BV — Topology Link State Layer v0

**Stage date**: 2026-05-25  
**Previous stage**: V1BU (device operational state)  
**Status**: Complete

---

## Mission

Derive a lightweight, deterministic edge/link operational state from endpoint device states (V1BU surfaced node state). Project it onto Blueprint edges so the fabric reflects the operational condition of the network links. Demo-only — no live telemetry or polling.

## Vocabulary

Reuse V1BU `LabOperationalState` union exactly. **No new union created**:

```typescript
"healthy" | "warning" | "degraded" | "down" | "maintenance" | "unknown"
```

## Severity Precedence

Link state derives via highest-severity rule:

| Rank | State | Meaning | Visual |
|------|-------|---------|--------|
| 1 (highest) | `down` | Link or endpoint(s) unreachable | Dashed red (#D32E2E), 1.5px, opacity 0.95 |
| 2 | `degraded` | Reduced capacity, packet loss | Orange-red (#B83333), 1.25px, opacity 0.95 |
| 3 | `warning` | Elevated metrics but operational | Amber (#C77A0E), 1px, opacity 0.95 |
| 4 | `maintenance` | Planned downtime / maintenance | Violet dashed (#6B4FAB), 3-2px dash, opacity 0.9 |
| 5 | `unknown` | State indeterminate | Muted graphite (#9AA3AD), 0.7 opacity |
| 6 (lowest) | `healthy` | Normal operation | Graphite (#D6DBE0), 1px, opacity 0.85 |

**Selection rule**: When both endpoints have state, choose the higher-severity state.  
**Missing endpoint**: Treat as `"unknown"`.

## Projection Path

```
V1BU device.operational_state
    ↓
fabricatorTopologyAdapter.toGraphReadyTopologyView()
    ├─ Build stateByNodeId Map from nodes[]
    └─ For each link: deriveLinkState(sourceState, targetState) → edge.operational_state
    ↓
GraphReadyTopologyEdge.operational_state
    ↓
BlueprintTopologyCanvas.Edge component
    └─ Add data-state={edge.operational_state ?? "healthy"}
    ↓
BlueprintTopologyCanvas.css
    └─ .bt-edge[data-state="..."] rules + stroke/dash/opacity
    ↓
Rendered link with state colour + selection (is-active) overlay
```

## Files Changed

### Core Implementation
- **`src/modes/topology/blueprint/linkState.ts`** (new)  
  Pure derivation function `deriveLinkState(a, b) → LabOperationalState`.

- **`src/modes/topology/topologyReview.ts`**  
  `GraphReadyTopologyEdge` interface: added `operational_state?: LabOperationalState`.

- **`src/engines/fabricatorTopologyAdapter.ts`**  
  `toGraphReadyTopologyView()`: build stateByNodeId map; derive edge state via `deriveLinkState()`.

- **`src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx`**  
  `Edge` component: add `data-state={edge.operational_state ?? "healthy"}` attribute.

- **`src/modes/topology/blueprint/BlueprintTopologyCanvas.css`**  
  New `.bt-edge[data-state="..."]` rules for warning, degraded, down, maintenance, unknown states.  
  Selection (`.bt-edge.is-active`) cascades after data-state rules → active colour wins.

### Tests
- **`src/modes/topology/blueprint/__tests__/linkState.test.ts`** (new)  
  - 7 tests: boundary cases (healthy/healthy, warning/healthy, degraded beats warning, down beats all, maintenance hierarchy, undefined → unknown, commutativity).

- **`src/engines/__tests__/fabricatorTopologyAdapter.test.ts`**  
  - 2 new tests: edge state derivation (all edges have state, state reflects endpoint severity).

- **`src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx`**  
  - 5 new tests: edge state rendering (healthy, warning, degraded, down), selection + state overlay.

---

## Sample Derivations

| Source State | Target State | Derived Link State | Rationale |
|--------------|--------------|-------------------|-----------|
| `healthy` | `healthy` | `healthy` | Both endpoints nominal |
| `warning` | `healthy` | `warning` | One endpoint elevated |
| `degraded` | `warning` | `degraded` | Degraded > warning (severity) |
| `down` | `healthy` | `down` | Down is highest severity |
| `maintenance` | `unknown` | `maintenance` | Maintenance > unknown |
| `undefined` | `healthy` | `unknown` | Missing endpoint → unknown |

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
Test Files: 221 passed (221)
Tests:      2516 passed (2516)
   ✓ linkState.test.ts: 7 tests
   ✓ fabricatorTopologyAdapter.test.ts: +2 tests (to 12 total)
   ✓ BlueprintTopologyCanvas.test.tsx: +5 tests (to 59 total)
Duration: 21.69s
```

### Build
```
$ pnpm build
✓ 2186 modules transformed
✓ dist/ assets ready
  index-4RT29jyu.css    219.43 kB | gzip: 31.84 kB
  index-CWmqjNDq.js     777.51 kB | gzip: 200.68 kB
  babylon-BvR-TlEU.js 5105.94 kB | gzip: 1135.12 kB
✓ built in 5.97s
```

---

## 17-Step Manual Verify Path (Bujar's Protocol)

1. **Device states visible**: Open Topology mode; confirm nodes show operational state rings (V1BU).
2. **Healthy fabric**: In fabricator demo (3 nodes, 2 links), all devices start `healthy` → all edges start `healthy` (default graphite, 0.85 opacity).
3. **Single warning**: Simulate one node → `warning` state (in memory only; no schema bump).
   - Connected edges → amber stroke.
   - Non-connected edges → stay graphite.
4. **Both endpoints warning**: Two connected nodes both `warning` → their edge `warning`.
5. **One degraded, one warning**: Connected nodes with mixed states → edge shows `degraded` (highest severity).
6. **Down state**: Simulate endpoint `down` → connected edges show dashed red (#D32E2E, 4-3 dash, 1.5px).
7. **Maintenance**: Simulate `maintenance` state → violet-dashed edges (3-2 dash).
8. **Unknown (missing endpoint)**: Leave one node state undefined → derive as `unknown`, muted graphite (0.7 opacity).
9. **Selection overlay**: Click a node; connected edges get cyan `.is-active` overlay on top of state colour (cyan wins).
10. **Metro density**: Zoom to 96+ nodes (dot band) → edge state colours still visible at small scale.
11. **Scenario stability**: Switch scenarios (branch, campus, metro) → edge states remain stable across layout recompute.
12. **Passport consistency**: Select a node; passport shows node state → connected edges match derived state.
13. **Commutativity**: Swap endpoint order in a test pair → derived state is identical.
14. **No state on node**: Render a node without `operational_state` field → edge defaults to `healthy`.
15. **CSS cascade**: Active edge stays cyan even when base state is red (no `!important` hack; order matters).
16. **No regression**: V1BU node rings, V1BN edge routing, V1BT selection, V1BU passport still work.
17. **Demo is deterministic**: Refresh page multiple times → same 3 nodes, same 2 edges, same states every time.

---

## What's NOT in Scope

- Live telemetry or polling (demo-only state)
- Edge impact on higher-layer pathfinding or diagnostics
- Legend / control panel (deferred to V1BW)
- "Affected link count" passport row (deferred to V1BW)
- Live SNMP / utilization animation
- Schema bump to `LAB_GENERATOR_VERSION` (edge state is derived, not persisted)
- Change to `LabOperationalState` union (reused from V1BU)

---

## Caveats

1. **Demo data only**: Fabricator always generates `healthy` devices; state derivation is testable via unit tests that inject state manually.
2. **No persistence**: Edge states are re-derived on every `toGraphReadyTopologyView()` call — no caching.
3. **Severity precedence is deterministic but asymmetric for selection**: When both endpoints differ, the higher-severity state wins; commutativity is preserved in derivation.
4. **CSS rule order matters**: Data-state rules must appear before `.is-active` so selection (cyan) cascades on top.
5. **No future 3D adaptation yet**: The `operational_state` field is present on `GraphReadyTopologyEdge` for future Babylon.js consumption, but no 3D logic is present in V1BV.

---

## Cross-References

- **V1BU**: Device operational state rings and passport condition row.
- **V1BN**: Edge routing (geometry unaffected by state).
- **V1BT**: Selection highlight (visual layer unaffected by state).
- **V1BW** (deferred): Legend panel + link impact cascade + "affected link count" passport row.
- **Severity precedence doctrine**: `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` (operational state hierarchy).

