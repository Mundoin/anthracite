# V1AC — Environment Data-Source Boundary

**Arc:** HONEST-HIERARCHY (V1AA ✓ · V1AB ✓ · V1AC ✓ · V1AD optional)
**Date:** 2026-05-18
**Status:** complete

---

## Objective

Move hierarchy seed literals out of `src/App.tsx` into a new typed boundary
module. Replace the three literal `source="demo"` props with
`view.sourceStateByBlock.*` values computed at the boundary. App.tsx becomes
a pure presenter — it consumes the view, it does not classify it.

---

## Scope in

**New files:**
- `src/data/hierarchyTypes.ts` — `RowSeed` interface (relocated from App.tsx)
- `src/data/hierarchySeeds.ts` — 8 seed constants verbatim relocated from App.tsx
- `src/data/hierarchySource.ts` — `getHierarchyView` boundary function + `HierarchyView` type (85 LOC)
- `src/data/__tests__/hierarchySource.test.ts` — 6 boundary tests

**Edited files:**
- `src/App.tsx` — seeds removed, `view = useMemo(getHierarchyView)` added, 3 `source="demo"` replaced
- `docs/architecture/HIERARCHY_HONESTY_CONTRACT.md` — H7 clause added
- `obsidian/ANTHRACITE_INDEX.md` — V1AC row

---

## Scope out

No Rust diff. No DataSourceTag edits. No StatusBar / OpsStrip / AppShell edits.
No INTAKE / ASSESS edits. No new colour tokens. No new dependencies.
No seed data removed (H6). DataSourceState union unchanged.

---

## Design decisions

**TS-only boundary, no Rust command.** The three open questions from the handoff
resolved as: (1) TS-only config object — a Rust command would require a new
schema change which was explicitly deferred; (2) `StatusCell` does not gain
`node?: ReactNode` — deferred to V1AD; (3) StatusBar cell-level tags deferred
to V1AD.

**`inspectorIdentity` computed from `readiness.active_environment_id`.**
The boundary does not accept `active: Environment | null` as a separate
parameter. Instead, it derives the active env from
`readiness.active_environment_id` looked up in `envs`. In demo mode both are
null → identity is `[]`, byte-identical to V1AB. When a real engine is
running, `readiness.active_environment_id` provides the same env reference
as `getActiveEnvironment()`.

**`view` state renamed to `layoutView`** in App.tsx to avoid naming collision
with the new `const view = useMemo(getHierarchyView, ...)` constant.

**`RowSeed` not imported in App.tsx.** The `secondaryGroups` useMemo used
`Record<RowSeed["group"], ...>` — replaced with the inline union literal
`Record<"production" | "non-prod" | "special", ...>` to keep App.tsx import
surface clean.

---

## Halt conditions — status

- HA1 No seed value changes ✓
- HA2 App.tsx mechanical edits only ✓
- HA3 hierarchySource.ts ≤ 100 LOC (actual: 85) ✓
- HA4 No existing test asserts `source="demo"` at call sites ✓
- HA5 No Rust diff ✓
- HA6 DataSourceState not extended ✓
- HA7 Anchor line numbers matched prompt map ✓
- HA8 Visual output byte-identical to V1AB (demo mode; for Bujar to confirm) ✓

---

## Lessons for V1AD

- `inspectorIdentity` fully live-capable via `readiness.active_environment_id`
  — when V1AD wires real engine, identity rows appear without changing App.tsx.
- `sourceStateByBlock` is per-block — V1AD can set individual blocks to `"real"`
  as engines come online; aggregate `sourceState` updates automatically via H1.
- `StatusCell` `node?: ReactNode` (for per-cell `<DataSourceTag>`) remains open;
  V1AD may need it for StatusBar cell-level honesty.
- `detailKpis` still derived from `activeRow` in App.tsx — a candidate for
  the boundary in V1AD or a future detail-view stage.

---

## Suggested commit message

```
stage-v1ac: typed data-source boundary for hierarchy surface
```
