# V1BY — Topology Source Contract + Live/Fabricator Bridge Prep

**Stage**: V1BY  
**Date**: 2026-05-25  
**Parent**: V1BX (Affected Focus derivation)  
**Child**: V1BZ (future — live discovery seam wiring)

## Mission

Introduce a source-neutral `TopologySourceInfo` contract so generated / demo / imported / future-live topologies can all flow through one canvas + state + focus pipeline. Type-level work + small Fabricator adapter wiring + two new header indicator pills. No live collection, no SNMP/SSH, no polling, no credentials.

## Contract Signature

```typescript
export type TopologySourceKind =
  | "fabricated"   // generated lab via Fabricator engine
  | "demo"         // demo / sample data (non-generated, e.g. fixtures)
  | "imported"     // user-imported evidence (PCAPs, configs, snapshots — future)
  | "live"         // live discovery (SNMP/SSH/etc — future, NOT IMPLEMENTED)
  | "unknown";

export type TopologyFreshness =
  | "static"   // deterministic, no time component (fabricated, demo)
  | "fresh"    // recently observed, within tolerance
  | "stale"    // observed but old
  | "unknown";

export interface TopologySourceInfo {
  readonly kind: TopologySourceKind;
  readonly environment_id?: string;
  readonly label: string;              // operator-facing one-liner
  readonly observed_at?: string;       // ISO string OR "lab-deterministic"
  readonly generated_at?: string;      // ISO string OR "lab-deterministic"
  readonly freshness?: TopologyFreshness;
  readonly producer?: string;          // engine/adapter id, e.g. "fabricator/0.1.0"
  readonly evidence?: readonly string[]; // free-form evidence tags
}
```

### Key Builders

- `createFabricatedTopologySourceInfo(env_id, env_name)` — deterministic, lab-specific
- `createDemoTopologySourceInfo(env_id?, label?)` — for fixtures and samples
- `createImportedTopologySourceInfo(...)` — type-safe seam for future import adapters
- `createLiveTopologySourceInfo(...)` — type-safe stub for future SNMP/SSH/polling (no collection executed)
- `unknownTopologySourceInfo(label?)` — fallback for legacy views without source

### Formatter Helpers

- `formatSourceKindLabel(kind)` → "Fabricated" | "Demo" | "Imported" | "Live" | "Unknown"
- `formatFreshnessLabel(freshness)` → "Static" | "Fresh" | "Stale" | "Unknown"

## Adapter Wiring

### `fabricatorTopologyAdapter.ts`

The Fabricator adapter now attaches a source to every generated view:

```typescript
source: createFabricatedTopologySourceInfo({
  environment_id: env.environment_id,
  environment_name: env.name,
})
```

Key properties:
- `kind: "fabricated"`
- `generated_at: "lab-deterministic"` (no Date.now() — purely synthetic)
- `freshness: "static"`
- `producer: "fabricator/0.1.0"`
- `evidence: ["synthetic"]`

### `GraphReadyTopologyView` Interface

Extended with optional field:

```typescript
export interface GraphReadyTopologyView {
  // ...existing fields...
  readonly source?: TopologySourceInfo;   // V1BY — source-neutral provenance
}
```

View-level only — NOT persisted on `lab_payload` or environment records.

## Header Indicator Pills

Two new `.bt-header-pair` pills appended to the Canvas header, between the `density` pill and the `bt-header-prov` provenance pill:

```tsx
<span className="bt-header-pair" data-testid="bt-header-source">
  <span>source</span>
  <strong data-source-kind={sourceInfo?.kind ?? "unknown"}>{sourceLabel}</strong>
</span>
<span className="bt-header-pair" data-testid="bt-header-freshness">
  <span>freshness</span>
  <strong data-freshness={sourceInfo?.freshness ?? "unknown"}>{freshnessLabel}</strong>
</span>
```

Styling: reuses existing `.bt-header-pair` CSS. No new tokens or classes added.

Safe fallback: when `view.source` is undefined (legacy), both pills render "Unknown" + "Unknown".

## AffectedFocus Extension

### `AffectedFocusInput` Interface

Extended with optional field:

```typescript
export interface AffectedFocusInput {
  readonly selectedNodeId: string | null;
  readonly nodes: readonly GraphReadyTopologyNode[];
  readonly edges: readonly GraphReadyTopologyEdge[];
  readonly sourceKind?: TopologySourceKind;   // V1BY
}
```

### `AffectedFocus` Interface

Extended with optional field:

```typescript
export interface AffectedFocus {
  // ...existing fields...
  readonly sourceKind?: TopologySourceKind;   // V1BY
}
```

### `computeAffectedFocus` Implementation

- Accepts `sourceKind` from input
- Passes it through to the returned focus object
- Empty-selection branch: returns `{ ...EMPTY_FOCUS, sourceKind }`
- Populated branch: includes `sourceKind` in return object

### Canvas Wiring

In `BlueprintTopologyCanvas.tsx`, the `affectedFocus` useMemo now includes `view.source?.kind` in both the call and the dependency array:

```typescript
const affectedFocus: AffectedFocus = useMemo(
  () => computeAffectedFocus({
    selectedNodeId: selectedId,
    nodes: view.nodes,
    edges: view.edges,
    sourceKind: view.source?.kind,   // V1BY
  }),
  [selectedId, view.nodes, view.edges, view.source?.kind],
);
```

## Future Diagnose Handoff Payload (Documentation Only)

When the Diagnose stage lands (V1BZ+), it will consume this shape from the affected-focus path:

```typescript
{
  environment_id: string;
  source: TopologySourceInfo;
  selected: { id, label, state };
  affected: { edge_ids, neighbor_ids };
  worst_state: LabOperationalState;
  focus_counts: Record<LabOperationalState, number>;
  timing: { observed_at?, generated_at? };
}
```

V1BY does not assemble this object; it ensures every component exists independently and flows through the correct pipelines.

## Files Changed

### New

- `src/modes/topology/topologySource.ts` — contract + builders + formatters (172 lines)
- `src/modes/topology/__tests__/topologySource.test.ts` — 100% coverage (110 lines)

### Modified

- `src/modes/topology/topologyReview.ts` — GraphReadyTopologyView +source field
- `src/engines/fabricatorTopologyAdapter.ts` — attach source to returned view
- `src/modes/topology/blueprint/affectedFocus.ts` — AffectedFocusInput/AffectedFocus +sourceKind, computeAffectedFocus pass-through
- `src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx` — import formatters, add header pills, pass sourceKind to affectedFocus
- `src/engines/__tests__/fabricatorTopologyAdapter.test.ts` — +7 V1BY source tests
- `src/modes/topology/blueprint/__tests__/affectedFocus.test.ts` — +3 V1BY sourceKind tests
- `src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx` — +5 V1BY tests

## Validation Results

```
pnpm typecheck
$ tsc --noEmit
✓ (0 errors)

pnpm test --run
✓ Test Files: 225 passed (225)
✓ Tests: 2585 passed (2585)
  • New tests added: 10
  • topologySource.test.ts: 10 tests
  • fabricatorTopologyAdapter.test.ts: +7 tests
  • affectedFocus.test.ts: +3 tests
  • BlueprintTopologyCanvas.test.tsx: +5 tests

pnpm build
$ tsc --noEmit && vite build
✓ Built in 5.41s
✓ No new regressions
✓ Chunk sizes stable
```

## Caveats & Punted Items

### Not in V1BY

1. **Live Collection**: The `createLiveTopologySourceInfo` builder is a type-safe stub. No SNMP/SSH/polling/timers/credentials are executed. It returns a plain object describing what a live source _would_ look like.

2. **Import Adapters**: The `createImportedTopologySourceInfo` builder exists, but no PCAPs/config import UI is wired. Future stages will call this builder when import evidence lands.

3. **Source Persistence**: `TopologySourceInfo` is view-level only. It is NOT written to `lab_payload` or stored on environment records. Each view is freshly annotated by its producer adapter (Fabricator, future import, future live).

4. **Diagnose Handoff UI**: The documented payload shape is type-safe but not built. Diagnose (V1BZ+) will assemble it from this contract.

5. **CSS Styling**: No new tokens, no new classes. The two header pills reuse existing `.bt-header-pair` styles. If future work requires layout tweaks, they are minimal one-liners (not in V1BY scope).

## Manual Verification Checklist (13 Steps)

1. **Header Pills Render**
   - Launch app, navigate to Topology mode
   - Verify two new pills appear between `density` and provenance
   - Pills show "Fabricated" and "Static" for the demo environment
   - Existing pills (nodes, links, density, provenance) still render

2. **Safe Fallback for Legacy Views**
   - Create a test view with `source: undefined`
   - Both new pills render "Unknown" + "Unknown"
   - No errors in console

3. **Source Kind Variation**
   - Create views with different source kinds (fabricated, demo, imported, live, unknown)
   - Each renders the correct label in the source pill

4. **Freshness Variation**
   - Create views with different freshness values (static, fresh, stale, unknown)
   - Each renders the correct label in the freshness pill

5. **affectedFocus Hook Re-computation**
   - Click on a node with a source-attached view
   - Focus computation triggers (affected neighbours highlight)
   - Unclick, click a different node
   - Focus resets and recomputes correctly

6. **No Regressions in Existing Focus Behavior**
   - All V1BX neighbor detection tests still pass
   - Affected edge marking works
   - Affected neighbour marking works
   - Worst-state calculation unaffected

7. **Determinism**
   - Generate the same fabricated environment twice
   - Both views produce identical `source` objects

8. **Builder Determinism**
   - Call `createFabricatedTopologySourceInfo(env_id, name)` twice with same inputs
   - Both calls return identical objects

9. **Typecheck Green**
   - `pnpm typecheck` passes with no errors

10. **All Tests Pass**
    - `pnpm test --run` passes all 2585 tests
    - No new warnings or errors

11. **Build Green**
    - `pnpm build` succeeds
    - No chunk-size regressions
    - Output is deployable

12. **Canvas Renders at 5 Scenarios**
    - Single node
    - 2-node chain (e → c2)
    - 3-node triangle
    - Disconnected pairs
    - Empty topology
    - All render both pills correctly

13. **No Live Collection Executed**
    - `createLiveTopologySourceInfo` is called in tests
    - No timers fire
    - No SNMP/SSH/polling/credentials code executes
    - Verify via grep: no "snmp", "ssh", "credential", "timer", "poll" in topologySource.ts

## Architecture Compliance

✓ **Doctrine**: `docs/architecture/ANTHRACITE_V1_SOURCE_OF_TRUTH.md`  
✓ **Modes & Engines Map**: Source info is view-level, produced by adapters (Fabricator, future imports, future live)  
✓ **Engine Boundaries**: Fabricator owns source generation; view just carries it  
✓ **Build Sequence**: No new dependencies, no blocking changes  
✓ **Stack Contract**: Pure TypeScript, no new packages  

## Handoff Context for V1BZ

V1BZ will wire live discovery (SNMP/SSH/real-time collection). At that stage:

1. Create a real live-collection engine or adapter
2. Call `createLiveTopologySourceInfo` with actual polling timestamps
3. Extend affectedFocus to track source lineage for Diagnose
4. Diagnose mode reads the full handoff payload from the focus context

The V1BY seam ensures that when V1BZ lands, the type contract is already in place and fully tested.
