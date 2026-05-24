# V1BR — Environment Archive State + Topology Device Color Polish

**Date:** 2026-05-25
**Status:** Implementation complete — pending Bujar manual verify
**Validation:** typecheck clean · 2456/2456 tests pass · build clean
**Prior stages on main:** V1BO durability · V1BP topology selector · V1BQ persistent layout overrides

---

## Mission

Two independent slices, one stage:

- **Part A.** Surface durable environment archive state so archived environments persist, are visible somewhere recoverable, and never silently delete.
- **Part B.** Replace the ugly gray / military-bland 2D device node fills with a soft, calm professional blue palette across all blueprint topology views.

Boundaries honored: no Fabricator, no live devices, no parser work, no broad topology redesign. V1BO/V1BP/V1BQ behavior preserved.

---

## Part A — Environment Archive State

### Starting position

The archive data layer was already complete in the V1BO foundation:

- `LocalEnvironmentRecord.lifecycle_state: "active" | "available" | "archived"` field.
- `archiveEnvironment` / `restoreEnvironment` reducer ops (state update, never deletion).
- `visible_environments` derived list filtered to non-archived.
- `EnvironmentLifecycleContext` exposes `archive(id)`, `restore(id)`, `listAll(includeArchived?)`.
- The whole record (including `lifecycle_state` and `topology_presentation`) is serialized via `serializeStore` → reloaded via `deserializeSnapshot` → durable via V1BO Tauri+localStorage mirror.

The gap was a hardcoded `lifecycle.listAll(false)` in the Environment Store panel: archived envs had nowhere to surface.

### What changed

**`src/modes/environments/panels/EnvironmentStorePanel.tsx`**

- Added `showArchived` state + a "Show archived" checkbox toggle in the filter row (`data-testid="archive-toggle"`).
- Derived `includeArchived = showArchived || filter === "archived"` and threaded it through `lifecycle.listAll(includeArchived)`.
- "All" filter now respects the toggle: shows archived alongside non-archived when toggle is on.
- "Archived" pill auto-shows archived envs without requiring the toggle.
- Empty state branches on the truly-empty signal (`lifecycle.listAll(true).length === 0`), so "Create your first Environment" no longer misfires when the only env in the store is archived but currently filtered out.
- Restore button (already present) restores via `lifecycle.restore(id)`.
- Archive button (already present) archives via `lifecycle.archive(id)`.

**`src/modes/environments/panels/EnvironmentStorePanel.css`**

- Added `.environment-store-panel__filter-pills` flex wrapper and `.environment-store-panel__archive-toggle` styling. Toggle sits to the right of the filter pills (`margin-left: auto`).

**`src/state/environmentPersistence.ts`**

- `deserializeSnapshot` now treats missing `lifecycle_state` as a soft repair, defaulting to `"available"`. Legacy V1BO snapshots (written before `lifecycle_state` was a documented field) load as available environments.

### Behavior contract

| Scenario | Result |
|---|---|
| Operator clicks Archive | Env keeps full record; `lifecycle_state → "archived"`; `store_revision` bumps; auto-save persists via V1BO |
| Toggle OFF, filter "All" | Archived envs hidden (default) |
| Toggle ON, filter "All" | Archived envs visible alongside available envs |
| Filter "Archived" | Archived envs visible regardless of toggle |
| Click Restore on archived row | `lifecycle_state → "available"`; row returns to default view |
| App restart with archived env on disk | Env remains archived after rehydrate |
| Archived env's `topology_presentation` | Preserved through archive → durable round-trip → restore (V1BQ overrides intact) |
| Legacy snapshot missing `lifecycle_state` | Defaults to `"available"`, env visible by default |

### Tests added

- `src/modes/environments/panels/__tests__/EnvironmentStorePanel.test.tsx`
  - `renders the 'Show archived' toggle`
  - `archived envs are hidden by default after archiving`
  - `archived envs are visible when 'Show archived' toggle is enabled`
  - `clicking 'Archived' pill shows archived envs without the toggle`
  - `clicking Restore on an archived env returns it to the default view`
- `src/state/__tests__/EnvironmentLifecycleContext.test.tsx`
  - `21. Archive and restore lifecycle_state round-trip` (provider-level)
  - `22. Legacy snapshot without lifecycle_state field defaults to 'available'` (backward compat)
  - `23. archive preserves topology_presentation and survives durable round-trip` (state-level: archive → serialize → deserialize → restore, asserting `lifecycle_state` and `topology_presentation.node_positions` are preserved at every step)

---

## Part B — Topology / 2D Device Node Color Polish

### Starting position

Existing `:root` tokens were cyan/paper/ink-based, but device-node visuals leaned on neutral graphites (`--topo-ink-2 #3A4654`, `--topo-ink-3 #5F6B77`, `--topo-line-2 #4F5A66`). In Metro dot mode (96+ nodes) every unselected device read as flat military gray.

### What changed

**`src/modes/topology/blueprint/BlueprintTopologyCanvas.css`**

New `:root` token block (added under the existing palette, clearly headered):

```css
/* V1BR — soft device node palette */
--topo-node-fill:           #F1F6FB;
--topo-node-stroke:         #5B7A93;
--topo-node-unknown-fill:   #EDF1F5;
--topo-node-unknown-stroke: #8FA0B0;
--topo-node-dot-known:      #B8D9E8;
--topo-node-dot-unknown:    #D4DEE8;
--topo-node-hover-stroke:   #3F6582;
```

Swaps:

- `.bt-node-frame` stroke: `var(--topo-line-2)` → `var(--topo-node-stroke)` (warmer blue-grey edge on every device frame).
- `.bt-node-family-code--unk` fill: `var(--topo-ink-4)` → `var(--topo-node-unknown-stroke)` (unknown `?` glyph reads as muted blue, not dead gray).

**`src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx`** — `DotMini()` (Metro dot mode):

- Known dot fill: `var(--topo-ink-2)` → `var(--topo-node-dot-known)`.
- Known dot stroke: `var(--topo-line-2)` → `var(--topo-node-stroke)`.
- Unknown dot fill: `var(--topo-ink-3)` → `var(--topo-node-dot-unknown)`.
- Selected dot fill: unchanged (`var(--topo-cyan)`).

`blueprintGlyph.ts` and `blueprintIdentity.ts`: no hardcoded fills found, untouched.

### Visual hierarchy preserved

- Selected: still `var(--topo-cyan)` ring/accent — clearly distinct.
- Dragged: V1BL drag class unchanged.
- Unknown: soft blue-grey, visibly softer than known.
- Hover: existing rules — `--topo-node-hover-stroke` reserved for future hover lift.
- Semantic colors (`--topo-ok/warn/err/deferred/critical`) untouched.
- `.bt-node-faceplate` (port detail dark fill `#0E1E2C`) untouched.

### Tests added

- `src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx`
  - Existing dot-density test updated to assert new token name (`var(--topo-node-dot-known)`).
  - `renders dots in dot density with soft blue color tokens`
  - `selected dots in any density use --topo-cyan regardless`
  - `unknown family code glyph renders in full density`

---

## Validation

```
pnpm typecheck       → clean (tsc --noEmit, 0 errors)
pnpm test --run      → 220 test files passed, 2456 tests passed
pnpm build           → built in 5.84s, no errors
cargo                → not run (no Rust changes)
```

---

## Files Changed

```
src/modes/environments/panels/EnvironmentStorePanel.tsx
src/modes/environments/panels/EnvironmentStorePanel.css
src/modes/environments/panels/__tests__/EnvironmentStorePanel.test.tsx
src/state/environmentPersistence.ts
src/state/__tests__/EnvironmentLifecycleContext.test.tsx
src/modes/topology/blueprint/BlueprintTopologyCanvas.css
src/modes/topology/blueprint/BlueprintTopologyCanvas.tsx
src/modes/topology/blueprint/__tests__/BlueprintTopologyCanvas.test.tsx
obsidian/stages/V1BR-environment-archive-and-topology-color-polish.md (this file)
```

Net test count: 2445 → 2456 (+11).

---

## Manual Verification Path (for Bujar)

**Archive**

1. Start app from current main + working tree.
2. Confirm the seeded Micro Lab environment is visible in Environment Store.
3. Optional: Create a second environment via Creator.
4. Click **Archive** on a non-active environment row.
5. Confirm it disappears from the default Environment Store list.
6. Toggle **Show archived** ON: confirm the env reappears with an "archived" chip and a **Restore** button.
7. Toggle OFF, click the **Archived** filter pill: confirm same env appears (without the toggle).
8. Restart the app.
9. Toggle Show archived ON (or click Archived pill): confirm archived env is still archived and still present.
10. Click **Restore**: confirm env returns to normal selectors.
11. Confirm topology layout overrides (V1BQ persistent node positions) survived archive → restore.
12. Confirm the topology environment selector (V1BP) does not list archived environments.

**Color**

13. Open Topology mode with the Micro scenario.
14. Confirm 2D device nodes show soft blue stroke / soft sky tones — not gray, not military green.
15. Switch through Branch / Campus / Datacenter / Metro scenarios. Confirm device fills feel calm and blue across densities.
16. Click a node — confirm cyan selection ring still pops.
17. Drag a node — confirm drag treatment is still distinct and persistence still works (V1BQ).
18. Inspect Hardware on a moved node — confirm 3D bay still works.
19. Restart and confirm environment + layout persistence still works.

---

## Caveats

- The "Show archived" toggle and the "Archived" filter pill are partially redundant (the pill alone is sufficient to surface archived envs). The toggle exists because some operators want to see archived alongside active under the "All" filter — kept both for now; can collapse later if Bujar prefers one.
- The new `--topo-node-fill` and `--topo-node-hover-stroke` tokens are defined but not currently bound to any selector. They are reserved for follow-up tuning if Bujar wants devices subtly tinted or wants an explicit hover lift.
- Test count went from 2445 to 2456 (+11). All targeted suites pass; full suite green.

---

## AO Orchestration Report

- **Sonnet subagent 1 →** Part A audit: identified `listAll(false)` hardcode in EnvironmentStorePanel; confirmed data layer complete.
- **Sonnet subagent 2 →** Part B audit: mapped device-node color sources, found Metro `DotMini` graphite fills.
- **Sonnet subagent 3 →** Part A implement: toggle + checkbox + persistence default + initial tests. **Defects:** four tests were vacuous (asserted toggle state instead of archived visibility), restore-click test missing, `topology_presentation` preservation test missing. **Also missed:** "all" filter excluded archived even with toggle on; empty-state branched on filtered count instead of total.
- **Sonnet subagent 4 →** Part B implement: token additions, swap sites, tests. Clean — no defects.
- **Opus integrator →** Re-read every diff; fixed Part A test vacuity, added `topology_presentation` round-trip durability test, fixed the "all" filter + empty-state bugs the subagent missed.
- **+/- effectiveness:** ~50% Sonnet leverage on Part A (audit + initial scaffolding solid, implementation under-validated). ~100% on Part B (clean delivery, no Opus rework needed).
- **Recommendation:** Sonnet implementers reliable on contained color/CSS swaps and audits; require Opus integrator review on multi-condition UI filter logic and test rigor.

Wait for Bujar manual verify before commit/push.
