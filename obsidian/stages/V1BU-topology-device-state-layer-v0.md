# V1BU — Topology Device State Layer v0

**Date:** 2026-05-25  
**Status:** Complete  
**Commits:** Implementation in main branch  

## Mission

Add a lightweight, deterministic device-state layer so generated topology devices display operational condition. Demo-only implementation with no live data ingestion.

## State Vocabulary

Added new operational state union type for lab/fabricated devices:

```typescript
export type LabOperationalState =
  | "healthy"
  | "warning"
  | "degraded"
  | "down"
  | "maintenance"
  | "unknown";
```

Mapping to existing semantic colour tokens:
- `healthy` → `--topo-ok` (graphite, calm)
- `warning` → `--topo-warn` (amber)
- `degraded` → `--topo-err` (red)
- `down` → `--topo-critical` (hot red, thick stroke)
- `maintenance` → `--topo-maint` (muted violet, dashed stroke)
- `unknown` → `--topo-deferred` (neutral grey)

## Per-Scenario State Map

Deterministic state assignment per scenario/hostname. All unlisted devices default to `"healthy"`.

| Scenario | Non-Healthy Devices |
|---|---|
| `micro-lab` | none (all healthy) |
| `branch-office` | `branch-wap-02` → warning |
| `campus` | `campus-dist-04` → warning, `campus-acc-08` → warning, `campus-wap-02` → maintenance |
| `datacenter-pod` | `dc-leaf-04` → warning, `dc-leaf-12` → degraded, `dc-srv-03` → warning, `dc-fw-01` → maintenance |
| `metro-mega-city` | `metro-pe-03` → warning, `metro-agg-07` → warning, `metro-cpe-09` → warning, `metro-agg-16` → warning, `metro-cpe-02` → degraded, `metro-cpe-11` → degraded, `metro-isp-04` → down, `metro-fw-03` → maintenance |

`env-fab-demo` devices all remain `"healthy"`.

## Projection Path

```
LabDevice (operational_state?: optional)
  ↓
FabricatedDevice (operational_state?: optional)
  ↓
GraphReadyTopologyNode (operational_state?: optional)
  ↓
BlueprintTopologyCanvas (data-state attribute + passport row + CSS ring colour)
```

Each stage defaults to `"healthy"` if the field is absent.

## Files Modified

### Types
- `src/types/labEnvironment.ts` — added `LabOperationalState` union, optional field on `LabDevice`
- `src/types/fabricator.ts` — imported union, optional field on `FabricatedDevice`

### Engine Logic
- `src/engines/networkLabEngine.ts` — added deterministic state assigner; wired into both fab-demo and scenario paths
- `src/engines/labProjections.ts` — pass state through `toFabricatorView`
- `src/engines/fabricatorTopologyAdapter.ts` — map state into `GraphReadyTopologyNode`

### UI & Styling
- `src/modes/topology/topologyReview.ts` — added optional field to `GraphReadyTopologyNode`
- `src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx` — state-driven ring colour, passport state row
- `src/modes/topology/blueprint/BlueprintTopologyCanvas.css` — added `--topo-maint` token; CSS colour rules for data-state; passport state styling

### Tests
- `src/engines/__tests__/networkLabEngine.test.ts` — V1BU deterministic state tests (all scenarios, per-scenario assertions, determinism check)
- `src/engines/__tests__/labProjections.test.ts` — V1BU operational state projection tests (preserve, default, multiple values)
- `src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx` — V1BU state visualisation tests (data-state attr, default, formatting, passport display)

## Validation Results

### TypeScript
```
✓ pnpm typecheck — no errors
```

### Tests
```
✓ 2502 tests passed (220 files)
  - Added 20 new tests for V1BU functionality
  - All existing tests remain green
```

### Build
```
✓ pnpm build — dist ready
  - No new warnings
  - Bundle size within expected range
```

## Manual Verification Checklist

1. **Micro-lab (3 devices):** All three glyphs show healthy ring (graphite), passport shows "Healthy"
2. **Branch-office (8 devices):** Click `branch-wap-02` → ring turns amber, passport shows "Warning"
3. **Campus (24 devices):**
   - `campus-dist-04` shows warning ring + "Warning" in passport
   - `campus-acc-08` shows warning ring
   - `campus-wap-02` shows dashed violet ring + "Maintenance" in passport
4. **Datacenter-pod (32 devices):**
   - `dc-leaf-04` warning (amber ring)
   - `dc-leaf-12` degraded (red ring)
   - `dc-srv-03` warning
   - `dc-fw-01` maintenance (dashed violet)
5. **Metro-mega-city (96 devices, dot density):**
   - Dense view: dots change outline colour per state
   - Click to full: ring colours reflect state
   - 8 non-healthy dots visible (4 warning, 2 degraded, 1 down, 1 maintenance)
6. **Env-fab-demo:** All three demo devices show healthy (graphite) ring
7. **Passport state row:** Present on all nodes, formatted correctly (first letter capital)
8. **CSS styling:** State colours apply via data-state attribute; maintenance stroke is dashed
9. **Consistency:** Reopen same scenario → same state assignment (deterministic)
10. **Backward compat:** Load old saved environments (no operational_state field) → devices show "Healthy" default
11. **Zoom/pan:** State colours remain readable across all zoom levels
12. **Colour contrast:** All state colours pass WCAG AA on white canvas background
13. **Ring appearance:** Healthy (3px), down (4px thick + no dash), maintenance (3px + dashed)
14. **Legacy OperationalState untouched:** Old ring-colour token `OperationalState` remains unused; no rename

## Caveats

- **No live data:** State is hardcoded per scenario/hostname. Real SNMP/event ingestion is out of scope.
- **Demo-only:** State persists in saved environments as optional field, but does not affect persistence schema version (backward compatible).
- **No timeline:** State is static snapshot; no temporal progression or alerts.
- **Canvas-only:** State rendering only on Babylon canvas currently; topology review list does not display states (can be added in future stage).
- **Link state absent:** Links are not coloured by endpoint state; each link renders neutrally (can be extended).
- **No threshold logic:** States are preset, not computed from metrics (e.g., utilization, packet loss).

## Future Extensions

- V1BV: Live SNMP/syslog state updates (integrate with event bus)
- V1BW: Topology review list state column
- V1BX: Link colour driven by endpoint state
- V1BY: State-based filtering/search
- V1BZ: Alert timeline + state history

## Reference

- `docs/architecture/ANTHRACITE_V1_SOURCE_OF_TRUTH.md` — device vocabulary
- `obsidian/decisions/2026-05-23-quick-d4d-d4e-d4f-network-lab-engine-foundation.md` — lab engine design
- `obsidian/decisions/2026-05-24-svg-canvas-intrinsic-chain-collapse.md` — SVG canvas constraints
