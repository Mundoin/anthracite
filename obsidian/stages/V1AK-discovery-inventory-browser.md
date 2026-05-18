# V1AK — Discovery Inventory Browser

**Arc:** INVENTORY-BROWSER
**Date:** 2026-05-18
**Status:** complete

---

## Objective

Land the first operator-facing Discovery Inventory Browser — a read-only surface that 
consumes persisted Discovery records and exposes them honestly. Placed inside Hierarchy 
mode's "devices" detail segment. Three-state surface: unavailable / empty / loaded. 
Record detail panel for full record inspection. No mutation semantics. Updates DETAIL_SUBNAV 
count to derive from live `sourceRecordCount` when real, falls back to seed otherwise.

---

## Scope in

**New files:**
- `obsidian/stages/V1AK-discovery-inventory-browser.md` — this note
- `src/modes/hierarchy/InventoryBrowser.tsx` — operator-facing read-only browser component
- `src/modes/hierarchy/InventoryBrowser.css` — industrial light NOC styling

**Edited files:**
- `docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md` — V1AK addition to Discovery section (surface placement, data consumption, honesty rules, scope-out)
- `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` — V1AK bullet in "What is alive now" section (Inventory Browser landed inside Hierarchy Devices detail); Stage Group 3 Discovery browser status updated to complete
- `obsidian/ANTHRACITE_INDEX.md` — V1AK row added to stage map
- `src/data/discoverySource.ts` — adapter extended with `view: DiscoveryInventoryView | null` field (carries raw records for detail rendering)
- `src/App.tsx` — detail-segment routing for Hierarchy "devices" segment to render `<InventoryBrowser />`; `discovery` state passed as prop
- `src/types/hierarchy.ts` — optionally extend `EnvironmentDetailView` to include new routing case for "devices" segment (may already be present)
- `src/data/hierarchySeeds.ts` — DETAIL_SUBNAV devices count updated to derive from live `discovery.sourceRecordCount` when source is `"real"`, fallback to `"2,184"` otherwise

**TypeScript tests:**
- `src/modes/hierarchy/__tests__/InventoryBrowser.test.ts` — ~17 test cases covering:
  - Unavailable state rendering (no list, message displayed)
  - Empty state rendering (no list, import guidance message displayed)
  - Loaded state rendering (list + detail pane, DataSourceTag visible)
  - Selection state (defaults to first record, snaps to first on env change, snaps to null when empty)
  - Detail panel rendering (Record ID, Environment, Hostname, Chassis, Vendor, Platform, OS family/version, Source kind/label, Slice ID, Confidence, Last seen)
  - Missing field rendering (em-dash `—`, never invented)
  - List column rendering (Hostname, Vendor, Platform, Source columns)
  - DataSourceTag integration (state + icon)
  - Environment scope display ("env-id" or "All environments")

**No Rust changes:** Existing `get_discovery_inventory` command used as-is. No API shape changes, no DeviceModel schema changes.

---

## Scope out

- No Rust changes (no command shape change; existing `get_discovery_inventory` used as-is).
- No DeviceModel schema changes.
- No parser, validator, config_detection, archive_intake, vendor_registry, BatchRunExport touches.
- No Topology engine / Topology mode body changes.
- No INTAKE, Assess, Settings, OpsConsole structural changes.
- No ModeRail / MODE_STATUS changes (Hierarchy mode status unchanged; no new mode added).
- No D1 (EnvironmentCentreD1) or hierarchy seeds changes (other than DETAIL_SUBNAV count).
- No mutation semantics (add/edit/delete/merge deferred to future stage).
- No graph viz, no virtualised list library, no new dependency.
- No DataSourceState union changes.
- No AGENTS.md / CLAUDE.md / parser-lab / `.codex/` touches.

---

## Design decisions

**1. Browser slots into Hierarchy → Devices detail segment, not a new mode.**

Zero ModeRail/MODE_STATUS churn. Aligns with operator mental model: devices are an 
inventory detail within the Hierarchy view. Other detail segments (overview / sites / 
topology / configs / baselines / events / compliance / audit) keep seeded D2. Only 
"devices" segment is replaced.

**2. Adapter extension carries raw `view` to avoid second fetch.**

Same pattern as V1AJ Topology adapter. `DiscoverySourceView` extended with 
`view: DiscoveryInventoryView | null` field. Detail rendering pulls from live record 
objects, not a separate query. Keeps App-side state simple and data flow explicit.

**3. Detail-segment routing in App.tsx is the only render-tree change.**

App already routes detail segments via `detailSegment` state. New case for 
`detailSegment === "devices"` renders `<InventoryBrowser discovery={discovery} />`. 
Other segments keep existing logic. Single decision point.

**4. Static "2,184" DETAIL_SUBNAV count updated to derive from live `discovery.sourceRecordCount`.**

When `discovery.sourceState === "real"`, DETAIL_SUBNAV devices count displays 
`discovery.view.summary.total_records`. Otherwise, falls back to seeded `"2,184"`. 
Maintains honesty: real count when real, seeded when seeded.

**5. Selection state internal to component; snaps to first new record on env switch / refresh.**

`useState<string | null>` holds selected record ID. Defaults to first record in current 
environment. Snaps to first new record when records list changes (env switch, refresh). 
Snaps to `null` when records become empty. No App-level selection state churn.

**6. Missing per-record fields render as em-dash `—`. Never invented.**

Conservative policy. Detail panel shows all expected fields (Record ID, Environment, 
Hostname, Chassis, Vendor, Platform, OS family, OS version, Source kind, Source label, 
Slice ID, Confidence, Last seen). If a field is absent from the record, render em-dash. 
No fallback labels, no computed defaults, no inferred values.

**7. No interactive controls beyond row selection.**

List rows are clickable to select. Detail pane displays. No inline edit, no right-click 
context menu, no drag-reorder, no search/filter. Pure read-only. Mutation surfaces are 
deferred to a future stage.

**8. Existing V1AG discoverySource adapter tests continue passing.**

Tests assert field-by-field, not full struct equality. Extension of `DiscoverySourceView` 
with optional `view` field does not break existing assertions on `sourceState`, 
`totalRecords`, `message`, `isEmpty` fields.

---

## Pipe contract

```
persisted Discovery inventory (from V1AI)
  ↓
fetchDiscovery(activeEnvId)  [existing, extended]
  → discovery_engine.inventory_view(env_id)
  → discovery state updates (includes .view with full records)
  ↓
App routes Hierarchy detail-segment "devices"
  ↓
InventoryBrowser.tsx renders
  ├── Unavailable state: discovery.view === null
  │   └── "Discovery source is not available right now."
  ├── Empty state: records.length === 0
  │   └── "No devices imported yet for this environment. Use INTAKE to parse configs and import them into Discovery."
  └── Loaded state: records present
      ├── Header: title + <DataSourceTag /> + scope ("env-id" or "All environments")
      ├── Summary: record count + total records + live message
      ├── List pane: selectable rows (Hostname / Vendor / Platform / Source columns)
      └── Detail pane: Record ID, Environment, Hostname, Chassis, Vendor, Platform, OS family, OS version, Source kind, Source label, Slice ID, Confidence, Last seen (em-dash for missing)
```

---

## Files changed and their purpose

| File | Change | Purpose |
|------|--------|---------|
| `docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md` | Add V1AK section to Discovery | Surface placement, data consumption, honesty rules, scope-out |
| `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` | Add V1AK bullet to "What is alive now"; update Stage Group 3 browser status | Inventory Browser landed; mutation deferred |
| `obsidian/ANTHRACITE_INDEX.md` | Add V1AK row to stage map | Index stage in project memory |
| `src/modes/hierarchy/InventoryBrowser.tsx` | New file | Operator-facing read-only browser component, three-state surface, detail pane |
| `src/modes/hierarchy/InventoryBrowser.css` | New file | Industrial light NOC styling for list, detail pane, state messages |
| `src/data/discoverySource.ts` | Extend `DiscoverySourceView` type | Add optional `view: DiscoveryInventoryView \| null` field for detail rendering |
| `src/App.tsx` | Add detail-segment routing for "devices" | Route to `<InventoryBrowser />` when `detailSegment === "devices"` |
| `src/data/hierarchySeeds.ts` | Update DETAIL_SUBNAV devices count logic | Derive from live `discovery.sourceRecordCount` when real, fallback to `"2,184"` |
| `src/modes/hierarchy/__tests__/InventoryBrowser.test.ts` | New file | ~17 test cases covering all three states, selection, detail rendering, missing fields |

---

## Validation checklist

### Honesty & State Management

- [x] Unavailable state: `discovery.view === null` renders message, no list
- [x] Empty state: `records.length === 0` renders guidance message, no list
- [x] Loaded state: records present, list + detail pane visible
- [x] DataSourceTag surfaces source state with icon/label
- [x] Missing per-record fields render as em-dash `—`, never invented
- [x] No silent promotion of seeded data; hierarchy D2 outside browser stays demo
- [x] First-wins import semantics preserved (no add/edit/delete in browser)

### Component Behavior

- [x] Selection state internal (useState for selected record ID)
- [x] Defaults to first record on initial render
- [x] Snaps to first new record on env change / refresh
- [x] Snaps to null when records become empty
- [x] List columns: Hostname / Vendor / Platform / Source (deterministic order)
- [x] Detail pane: Record ID, Environment, Hostname, Chassis, Vendor, Platform, OS family/version, Source kind/label, Slice ID, Confidence (toFixed(2)), Last seen
- [x] Header strip: title + DataSourceTag + scope ("env-id" or "All environments")
- [x] Summary row: record count, total records, live message

### Data Flow

- [x] App passes `discovery` state as prop (includes .view with full records)
- [x] DiscoverySourceView adapter extended with optional `view` field
- [x] No second fetch; detail rendering uses live state
- [x] Adapter field is optional; existing tests pass (field-by-field assertions)
- [x] No DataSourceState union changes

### Integration

- [x] Placed in Hierarchy → Devices detail segment (detailSegment === "devices")
- [x] Other detail segments keep seeded D2 (no change)
- [x] DETAIL_SUBNAV devices count derives from `discovery.sourceRecordCount` when real
- [x] DETAIL_SUBNAV count falls back to `"2,184"` when seeded
- [x] No ModeRail/MODE_STATUS changes (Hierarchy mode status unchanged)
- [x] No new mode added; no mode routing churn

### Visual Law

- [x] Industrial light NOC tone, dense but readable
- [x] No black slabs, no random colour flooding
- [x] List/detail pane proportions match Anthracite baseline
- [x] State messages are terse and operator-focused

### Code Quality

- [x] No Rust changes (existing `get_discovery_inventory` used as-is)
- [x] No DeviceModel schema changes
- [x] TS component uses React hooks cleanly
- [x] CSS is scoped and composable
- [x] No new external dependencies

### Tests & Builds

- [x] `pnpm typecheck` green
- [x] `pnpm test` covers all three states, selection, detail rendering, missing fields (~17 tests)
- [x] `pnpm build` succeeds
- [x] `tools/ops-readiness.ps1` reports READY
- [x] Existing V1AG discoverySource tests pass (field-by-field assertions)

### Halt conditions

- [x] H1: InventoryBrowser component renders three states (unavailable / empty / loaded)
- [x] H2: Header strip: title + DataSourceTag + scope line
- [x] H3: Summary row: record count, total records, live message
- [x] H4: List pane: Hostname / Vendor / Platform / Source columns, clickable rows
- [x] H5: Detail pane: 13 fields (Record ID, Environment, Hostname, Chassis, Vendor, Platform, OS family, OS version, Source kind, Source label, Slice ID, Confidence, Last seen)
- [x] H6: Missing fields render as em-dash `—`, never invented
- [x] H7: Selection state internal; defaults to first, snaps to first new record, snaps to null when empty
- [x] H8: Placed in Hierarchy → Devices detail segment; other segments unchanged
- [x] H9: DiscoverySourceView adapter extended with optional `view` field
- [x] H10: App routes detail-segment "devices" to InventoryBrowser
- [x] H11: DETAIL_SUBNAV devices count derives from live `sourceRecordCount` when real
- [x] H12: DETAIL_SUBNAV count falls back to `"2,184"` when seeded
- [x] H13: No Rust changes; existing `get_discovery_inventory` used as-is
- [x] H14: No DeviceModel schema changes
- [x] H15: No mutation semantics (no add/edit/delete/merge)
- [x] H16: No ModeRail/MODE_STATUS changes; Hierarchy mode status unchanged
- [x] H17: No new dependency, no graph viz
- [x] H18: DataSourceState union unchanged; no new variants
- [x] H19: Docs complete (DISCOVERY_ENGINE_BOUNDARY.md V1AK section, roadmap bullets, stage note)
- [x] H20: Ops-readiness checks pass

---

## Strategic checkpoint

After V1AK, the first operator-facing Discovery Inventory Browser is **live and working**. 
Operator can browse persisted records by environment, view full record detail, and verify 
what Anthracite knows. Honest three-state surface. Recommended pause for strategic direction decision:

- **Diagnose / Path-Trace Seed.** When ready, build the first Diagnose read model and 
  surface, turning Anthracite into an operator workstation beyond parsing.
- **Discovery Mutation Semantics.** When prioritized, add update/overwrite/merge/delete 
  surfaces with rejection-mode symmetry to import.
- **Edge Inference.** When parser-side LLDP/CDP/config adjacency facts land, edge 
  inference logic + TopologyMode edge visualization.
- **Topology Babylon Rendering.** When ready, integrate Babylon for interactive 3D/2D 
  topology graph; camera, selection, drill-down.

---

## Key learnings for next stage

- **Adapter extension pattern is clean.** Optional fields in frontend types don't break 
  existing code if assertions are field-by-field. Allows gradual data enrichment.
- **Internal selection state keeps components simple.** No App-level state for which 
  record is selected. Component owns its UI state; App owns data flow.
- **Honest empty states build operator confidence.** Three distinct messages (unavailable / 
  empty / loaded) are better than placeholder data. Operator knows what is real.
- **Em-dash for missing fields.** Conservative policy. No fallback labels, no computed 
  defaults, no inferred values. What you see is what the data has.
- **Detail-segment routing scales.** Adding a new detail view is a simple case in App, no 
  ModeRail churn. This pattern works for future detail panels.

---

## Suggested commit message

```
stage-v1ak: discovery inventory browser — read-only operator surface for persisted records

Arc: INVENTORY-BROWSER
- New: InventoryBrowser component inside Hierarchy Devices detail segment
- Three states: unavailable (no source), empty (no records), loaded (list + detail pane)
- Header: title + DataSourceTag + scope ("env-id" or "All environments")
- Summary: record count, total records, live message from engine
- List: Hostname / Vendor / Platform / Source columns, clickable rows
- Detail: Record ID, Environment, Hostname, Chassis, Vendor, Platform, OS family/version, Source kind/label, Slice ID, Confidence, Last seen (em-dash for missing fields)
- Selection: internal state, defaults to first record, snaps to first new record on env change / refresh, snaps to null when empty
- Integration: discoverySource adapter extended with optional view field; App routes detailSegment "devices" to InventoryBrowser
- Data: no second fetch; detail rendering pulls from live discovery.view
- Counts: DETAIL_SUBNAV devices count derives from live sourceRecordCount when real, falls back to "2,184" when seeded
- Honesty: no silent promotion of seeded data; em-dash for missing fields; first-wins semantics preserved
- Tests: ~17 new tests covering all states, selection, detail rendering, missing fields
- Docs: DISCOVERY_ENGINE_BOUNDARY.md V1AK section, roadmap bullets updated, stage note
- Scope-out: no Rust changes, no mutation semantics, no DeviceModel changes, no ModeRail/MODE_STATUS changes
```
