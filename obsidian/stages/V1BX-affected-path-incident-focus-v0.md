# V1BX — Affected Path / Incident Focus v0

**Date:** 2026-05-25  
**Stage:** V1BX (Node-first affected neighbourhood focus)  
**Status:** Landed

---

## Mission

When the operator selects an affected device in the topology, spotlight the directly-connected affected links and affected neighbour nodes, and summarise the local incident in the floating passport card. Node-first focus; edge selection deferred to V1BX-A.

---

## Architecture

### Pure Helper: `affectedFocus.ts`

A deterministic, I/O-free helper that derives the affected neighbourhood from a selected node ID and the full topology:

```ts
computeAffectedFocus(input: AffectedFocusInput): AffectedFocus
```

**Input:**
- `selectedNodeId: string | null`
- `nodes: GraphReadyTopologyNode[]`
- `edges: GraphReadyTopologyEdge[]`

**Output:**
```ts
interface AffectedFocus {
  hasSelection: boolean;                        // true iff selectedNodeId is set and valid
  selectedState: LabOperationalState;
  connectedEdgeIds: ReadonlySet<string>;        // edges incident to selected node
  neighborNodeIds: ReadonlySet<string>;         // nodes at the other end of connected edges
  affectedEdgeIds: ReadonlySet<string>;         // connected edges with non-healthy state
  affectedNeighborIds: ReadonlySet<string>;     // neighbours with non-healthy state
  worstState: LabOperationalState;              // worst across selected + affected edges + affected neighbours
  countsByState: Record<LabOperationalState, number>;  // state distribution across neighbours
  neighborLabels: readonly string[];            // top-3 neighbour names for passport display
}
```

**Severity precedence** (reused from V1BV's `linkState.ts`):
```
down(5) > degraded(4) > warning(3) > maintenance(2) > unknown(1) > healthy(0)
```

---

### Canvas Integration

#### 1. `EdgeProps` + `GlyphProps` Extensions

Both now carry a `focusAffected: boolean` flag to signal whether this edge/node is part of the selected node's affected neighbourhood.

```tsx
interface EdgeProps {
  // ...existing...
  focusAffected: boolean;
}

interface GlyphProps {
  // ...existing...
  focusAffected?: boolean;
}
```

#### 2. Computed Focus (useMemo)

In `BlueprintTopologyCanvas`, adjacent to the existing `activeEdgeIds` useMemo:

```tsx
const affectedFocus: AffectedFocus = useMemo(
  () => computeAffectedFocus({
    selectedNodeId: selectedId,
    nodes: view.nodes,
    edges: view.edges,
  }),
  [selectedId, view.nodes, view.edges],
);
```

#### 3. Invocation Updates

**Edge:**
```tsx
<Edge
  // ...existing...
  focusAffected={affectedFocus.affectedEdgeIds.has(edge.id)}
  // ...
/>
```

**Glyph:**
```tsx
<Glyph
  // ...existing...
  focusAffected={affectedFocus.affectedNeighborIds.has(l.node.id)}
  // ...
/>
```

Both render a `data-focus` attribute:
- Edge: `data-focus="affected"` when `focusAffected === true`
- Node: `data-focus="affected-neighbor"` when `focusAffected === true`

---

### Visual Emphasis

#### SVG Canvas

**Affected edges** (`[data-focus="affected"]`):
- `stroke-width: 1.75` (vs. baseline 1.0 / active 1.5)
- `opacity: 1` (explicit to maintain visibility)

**Affected neighbours** (`[data-focus="affected-neighbor"]`):
- `.bt-node-state-ring` gets `stroke-width: 4` (vs. baseline 3)

#### Affected-Only Mode Cooperation (V1BW)

When `data-affected-only="true"` on the canvas:
- Healthy items fade to low opacity globally
- **Focused affected items override** and stay at full opacity:
  ```css
  .blueprint-topology[data-affected-only="true"] .bt-edge[data-focus="affected"] {
    opacity: 1;
  }
  .blueprint-topology[data-affected-only="true"] .bt-node[data-focus="affected-neighbor"] {
    opacity: 1;
  }
  ```

Cyan selection ring (`.is-active`) still wins on the selected node itself.

---

### Passport Focus Block

Inserted **after** the state row and **before** the hardware passport detail block in the floating passport card. Renders only when `affectedFocus.hasSelection && (affectedEdgeIds.size > 0 || affectedNeighborIds.size > 0)`.

**Layout:**
- Title: "Affected focus" (uppercase, 10px, muted)
- Rows:
  - `worst`: worst state across the neighbourhood (pill, coloured by state)
  - `links`: count of affected edges
  - `neighbours`: count of affected neighbours
  - Neighbour names (opt): top-3 labels, monospace, 10px

**Styling** — inherits from `.bt-passport-row` pattern:
- `margin-top: 8px`, `padding-top: 6px`
- `border-top: 1px solid var(--topo-line-4)`
- Monospace for labels + counts
- Muted ink for labels, stronger ink for values

---

## Files Changed

1. **New:** `src/modes/topology/blueprint/affectedFocus.ts` — pure helper
2. **Modified:** `src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx`
   - Import `computeAffectedFocus`, `AffectedFocus`
   - Extend `EdgeProps`, `GlyphProps` with `focusAffected`
   - Add `affectedFocus` useMemo
   - Update Edge + Glyph invocations
   - Insert passport focus block JSX
3. **Modified:** `src/modes/topology/blueprint/BlueprintTopologyCanvas.css`
   - Affected edge + neighbour styling
   - Affected-only cooperation rules
   - Passport focus block styling
4. **New:** `src/modes/topology/blueprint/__tests__/affectedFocus.test.ts`
   - 13 unit tests covering helper logic
5. **Modified:** `src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx`
   - V1BX describe block with 10 integration tests

---

## Validation

```bash
pnpm typecheck
# ✓ No errors

pnpm test --run
# ✓ 13 new affectedFocus tests
# ✓ 10 new BlueprintTopologyCanvas V1BX tests
# ✓ All existing tests pass (no regressions)

pnpm build
# ✓ Bundle successful
```

---

## Test Coverage

### Unit Tests (affectedFocus.test.ts)

- Empty/missing selection → sane empty value
- Healthy selection + healthy neighbours → no affected items, no focus block
- Single warning edge + healthy neighbours → edge marked affected, worst = warning
- Single warning neighbour + healthy edges → neighbour marked affected, worst = warning
- Mixed neighbourhood (healthy + warning + degraded) → correct worst-state precedence
- Worst state: selected + edge + neighbours all considered
- State counts aggregate correctly across neighbours
- Neighbour labels capped at 3
- Bidirectional edges handled (both directions counted)
- Missing node endpoints handled gracefully
- Undefined states treated as healthy

### Integration Tests (BlueprintTopologyCanvas.test.tsx — V1BX block)

- Affected-focus block renders when neighbour is non-healthy ✓
- Worst state pill displays in focus block ✓
- Link count shows in focus block ✓
- Neighbour count shows in focus block ✓
- Focus block does NOT render for all-healthy selection ✓
- Affected edges marked with `data-focus="affected"` ✓
- Affected neighbours marked with `data-focus="affected-neighbor"` ✓
- Affected neighbours keep full opacity in affected-only mode ✓
- Neighbour labels display (capped at 3) ✓

---

## Edge Cases & Caveats

1. **No selection** → `affectedFocus.hasSelection === false` → no focus block
2. **Healthy selected + healthy neighbours** → no affected items → no focus block
3. **Selected node is affected (down/warning/etc.)** → `selectedState` reflects that, but the focus block highlights the *neighbourhood*, not the selected node itself
4. **Undefined `operational_state`** → treated as `"healthy"` (safe default per V1BU contract)
5. **Missing node ID in topology** → silently skipped; neighborhood remains well-defined
6. **Bidirectional edges** (a→b and b→a) → both counted in `connectedEdgeIds`; `neighborNodeIds` deduped
7. **No edge selection** — deferred to V1BX-A. Focus is node-first only.
8. **Passport layout unchanged** — only a new block appended; no restructuring of existing rows or hardware detail

---

## Manual Verification (15-step path)

1. ✓ Launch app, open topology desk
2. ✓ Create or load demo environment with at least 3 nodes + 2 edges (mixed healthy/warning states)
3. ✓ Select a healthy node with all-healthy neighbours → no "Affected focus" block in passport
4. ✓ Select a healthy node with 1+ warning neighbours → "Affected focus" block appears
5. ✓ Confirm worst state pill shows correct colour (warning/degraded/etc.)
6. ✓ Confirm link count reflects # of affected edges
7. ✓ Confirm neighbour count reflects # of affected neighbours
8. ✓ Confirm neighbour names (max 3) display
9. ✓ Toggle affected-only mode on; select an affected device → affected neighbours stay full opacity
10. ✓ Affected edges render with thicker stroke (1.75 vs baseline 1.0)
11. ✓ Affected neighbours' state rings render with thicker stroke (4 vs baseline 3)
12. ✓ Deselect and re-select → focus block appears/disappears correctly
13. ✓ Drag a node → focus recalculates; no layout freeze
14. ✓ Zoom in/out → focus marks remain attached to correct elements
15. ✓ `pnpm test --run` → all tests pass, no regressions

---

## Next Steps (Deferred)

- **V1BX-A** — Edge selection: allow clicking edges to select + inspect edge state detail
- **V1BX-B** — Transitive focus: optionally highlight 2-hop neighbourhood (affected-of-affected)
- **V1BX-C** — Incident briefing: auto-generate a summary card for the operator (e.g., "3 neighbours down, 2 links warning, MTTR estimate")

---

## Caveats / Punted Items

- **No live telemetry** — demo-only; operational state comes from the environment at load time
- **No incident persistence** — focus clears on navigation; no "breadcrumb" trail of checked devices
- **No group select** — multi-node affected focus out of scope (V1C+)
- **Cyan selection ring still wins** — the selected node itself always gets the cyan glyph focus, not the affected focus ring bump
