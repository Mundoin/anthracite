# V1AG — Discovery Empty-State Integration

**Arc:** HONEST-HIERARCHY — wire Discovery into operator surface (empty stays empty)
**Date:** 2026-05-18
**Status:** complete

---

## Objective

Wire the V1AF Discovery Engine spine into the operator surface honestly.
Empty inventory stays empty. No demo, no fake devices. Frontend adapter maps
the engine's deterministic empty view into the Ops Console display, preserving
the DiscoverySourceState contract and leaving the Hierarchy block aggregate
untouched in V1AG.

---

## Scope in

**New files:**
- `src/data/discoverySource.ts` — `toDiscoverySourceView(view?, error?)` adapter
- `obsidian/stages/V1AG-discovery-empty-state-integration.md` — this note

**Edited files:**
- `src/App.tsx` — one-shot `getDiscoveryInventory(activeEnvironmentId)` on env selection change
- `src/modes/opsConsole/OpsConsoleMode.tsx` — Discovery Inventory read-only section with `<DataSourceTag>`
- `src/modes/opsConsole/__tests__/OpsConsoleMode.test.tsx` — tests for mapping rules (empty, unavailable, not_connected)
- `docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md` — V1AG section (adapter signature, mapping table, hierarchy rationale)
- `obsidian/ANTHRACITE_INDEX.md` — V1AG row added to stage map

---

## Scope out

- No Hierarchy visual blocks created for Discovery. Hierarchy aggregate `sourceState = "demo"` unchanged.
- No DataSourceState type extension. No new variants.
- No DeviceModel field added to inventory records. No device seeding (demo or real).
- No polling, no SSH/SNMP, no topology changes.
- No INTAKE changes. No parser changes.
- No `runDiscovery`, `latestFacts`, `evidence` surface (future).
- No mode body for Discovery — Ops Console is a read-only surface only.

---

## Design decisions

**Adapter owns the mapping logic.**
`toDiscoverySourceView` centralizes three cases:
1. Engine returns a view → pass state through; compute isEmpty/totalRecords.
2. Engine returns null + error → map to `"unavailable"`; surface error message.
3. Engine not yet callable → `"not_connected"` (pre-wiring state).

Discovery never synthesizes `"demo"`. Empty data is honest.

**Discovery never returns `"demo"`.**
The mapping table has no case for demo. If the engine were to return demo in future,
the adapter would treat it as a data-freshness boundary violation and map to
`"unavailable"`. For V1AG, the engine returns `"empty"` deterministically.

**Hierarchy untouched — document why.**
A `discoveryInventory: { sourceState, ... }` key in `HierarchyView.sourceStateByBlock`
would create a hierarchy block with no rendered surface (no mode body exists for
Discovery yet). Adding an unsurfaced block violates the render-all-blocks invariant in the
hierarchy component. Per the V1AG prompt's decision rule: document-skip is cleaner.
Hierarchy aggregate stays `"demo"`. Discovery surfaces only through Ops Console.
Inspector identity real-promotion (from V1AE) and the Hierarchy untouching preserve
the HONEST-HIERARCHY arc closure gate (H8) and the arc's clean boundary state.

**App owns the fetch, OpsConsoleMode receives the pre-mapped prop.**
- App calls `getDiscoveryInventory(activeEnvironmentId)` after every active-env selection change.
- Result passed to OpsConsoleMode as `discoverySourceView: DiscoverySourceView`.
- No Tauri call inside OpsConsoleMode. Mode is a pure display component.
- One-shot semantics: no polling, no timers, no retry loops.

**Ops Console surface is read-only and deterministic.**
- Renders real engine state, not static `MODE_STATUS` values.
- Shows: `<DataSourceTag state={view.sourceState} />`, scope, message, record count (0 in V1AG).
- Empty state is intentional and user-facing. No hidden spinners or "loading" states.

---

## Mapping rules table

| Condition | Output sourceState | isEmpty | Behavior |
|-----------|-----|---------|----------|
| `view` with `source_state = "empty"` | `"empty"` | true | Pass through; 0 records |
| `view` with any DiscoverySourceState | value | varies | Pass through; totalRecords from records array |
| `view = null, error = null` | `"not_connected"` | true | Engine not wired or not callable yet |
| `view = null, error != null` | `"unavailable"` | true | Fetch failed; surface error message to user |

**Discovery never returns `"demo"`.** The adapter never synthesizes demo data.

---

## Tauri command contract (from V1AF)

```
get_discovery_inventory(environment_id?: string) → DiscoveryInventoryView
```

V1AG does not change this contract. One-shot call on active-env change.

---

## Hierarchy boundary — rationale

**Why leave Hierarchy untouched?**

Hierarchy panel's contract: render all sourceStateByBlock entries, one visual block per key.
A new `discoveryInventory` entry would create a rendered block with no mode body to service it.

**Future:**
- V1AH (or later): Topology mode body lands. Then a `discoveryInventory` block in
  Hierarchy.sourceStateByBlock makes sense — it has a rendered surface and ownership.
- Or: Discovery surface lands in a different mode (Monitor, Operate). Then the block
  is tied to that mode's body.

**For V1AG:**
- Discovery is accessible only via Ops Console.
- Hierarchy aggregate stays `"demo"` — a faithful reflection of what's seeded in the mockup.
- Hierarchy blocks (D1–D8) remain demo-seeded, waiting for their respective mode bodies.
- Clean boundary: Discovery engine boundary is owned; frontend integration is partial.
- Inspector identity real-promotion (from V1AE) and H8 closure (from V1AD) remain intact.

---

## DISCOVERY_ENGINE_BOUNDARY.md update

Section "V1AG — Frontend Wiring" appended:
- Adapter signature and mapping table.
- App fetch policy (one-shot, no polling).
- Ops Console surface (read-only, real state).
- Hierarchy contract rationale (untouched in V1AG, with explanation).
- DataSourceState reiterated (no extension).

---

## Halt conditions — status

- H1 Adapter `toDiscoverySourceView(view?, error?)` implemented and testable ✓
- H2 App calls `getDiscoveryInventory(activeEnvironmentId)` once per env selection ✓
- H3 OpsConsoleMode receives `discoverySourceView` prop (not MODE_STATUS) ✓
- H4 Discovery Inventory section renders with real state, not static labels ✓
- H5 Mapping table covers empty, unavailable, not_connected cases ✓
- H6 Discovery never returns or synthesizes `"demo"` ✓
- H7 Hierarchy.sourceStateByBlock unchanged (no discoveryInventory block) ✓
- H8 DataSourceState type unchanged (no new variants) ✓
- H9 No device seeding, no DeviceModel field changes ✓
- H10 Tests cover all three mapping cases ✓
- H11 `cargo check` green ✓
- H12 `pnpm typecheck` green ✓
- H13 `pnpm test` passes OpsConsoleMode tests ✓
- H14 `pnpm build` succeeds ✓
- H15 `ops-readiness.ps1` reports READY ✓

---

## Key learnings for next stage

- Discovery's honest empty state is now visible in the operator surface. No placeholder burden.
- Adapter pattern (mapping engine state → frontend view) is clean and testable.
- Hierarchy untouching proves that partial integration (engine + one surface) is compatible
  with the render-all-blocks invariant. Future mode bodies will extend without refactoring.
- App owns the fetch cycle. Modes are display components. Clean boundary.
- Inspector identity real-promotion (V1AE) and H8 closure (V1AD) remain stable through frontend integration.

---

## Suggested commit message

```
stage-v1ag: discovery empty-state integration — frontend adapter + ops console surface
```
