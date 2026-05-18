# V1AB — Hierarchy Honest Demo/Empty Labelling

**Arc:** HONEST-HIERARCHY (second stage).
**Tier:** frontend-only (new component + edits to D1, D2, Inspector, OpsStrip, App.tsx).
**HEAD at start:** uncommitted V1AA changes present (contract + type module in working tree).
**HEAD at end:** uncommitted (Bujar commits).

## Objective

Wire the V1AA `DataSourceState` contract to the hierarchy surface rendering.
Every seeded operational value classified as `demo`, `unavailable`, or
`not_connected` in the V1AA seed inventory now renders with a visible adjacent
`<DataSourceTag>` marker reading `SOURCE_LABEL[state]` or a tightened variant.
Demo data remains populated (contract H6). Operators stop reading it as live.

## Scope — IN

### New files
| Path | Action | Purpose |
|------|--------|---------|
| `src/components/shell/DataSourceTag.tsx` | new | Marker component: null for `real`; copper dot + `.micro` label for all other states; `data-state` attr for tests |
| `src/components/shell/__tests__/DataSourceTag.test.tsx` | new | 6 tests: real renders nothing, demo label, override wins, data-state attr, not_connected, empty |

### Edits
| Path | Change |
|------|--------|
| `src/App.tsx` | Pass `source="demo"` to D1/D2/Inspector; update `statusLeft()` and `statusRight()` with honest labels |
| `src/components/d1/EnvironmentCentreD1.tsx` | Add `source?: DataSourceState`; render `<DataSourceTag>` above KPI ribbon and above rows table |
| `src/components/d2/EnvironmentDetailD2.tsx` | Add `source?: DataSourceState`; render `<DataSourceTag>` above KPI strip, in domains/events/sites panel headers |
| `src/components/shell/Inspector.tsx` | Add `source?: DataSourceState` to `InspectorProps` + `InspectorHealthCell`; render `<DataSourceTag>` in health panel header |
| `src/components/shell/OpsStrip.tsx` | Replace "idle" cell with `<DataSourceTag state="not_connected" override="not connected" />`; chrome unchanged |
| `obsidian/stages/V1AB-hierarchy-honest-labelling.md` | new — this file |
| `obsidian/ANTHRACITE_INDEX.md` | V1AB row |

## Scope — OUT (frozen)

Same as V1AA arc-wide list: INTAKE, ASSESS, parsers, validator, fixtures,
`src-tauri/**`, `ModeRail` IDs, `src/styles/**`, `StatusBar.tsx`,
`AppShell.tsx`, deps. No seed data removed (H6). No new colour token (H5).

## Vocabulary decisions applied

- Component named `<DataSourceTag>` — not `<ProvenanceTag>` (INTAKE collision lesson from V1AA).
- `--anth-role-provenance` copper token reused as marker accent (H5 compliant).
- `statusLeft` / `statusRight` use tightened copy (`· demo`, `· unavail.`) — inline text, no React component, per StatusBar label-string constraint.

## Markers wired — checklist

- [x] list-view KPI ribbon — `<DataSourceTag state="demo" />` above ribbon
- [x] list-view rows table — `<DataSourceTag state="demo" />` above table body
- [x] detail-view KPI strip — `<DataSourceTag state="demo" />` above strip
- [x] detail-view domains panel — `<DataSourceTag state="demo" />` in panel header
- [x] detail-view events panel — `<DataSourceTag state="demo" />` in panel header
- [x] detail-view sites panel — `<DataSourceTag state="demo" />` in panel header
- [x] Inspector health panel — `<DataSourceTag state="demo" />` in `h4` header
- [x] StatusBar `engines online` cell — label → `engines · unavail.`, signal → `idle`
- [x] StatusBar `rust-core · ok` cell — label → `rust-core · unavail.`, signal → `idle`
- [x] StatusBar `inventory`/`drift`/`events` cells — label appended `· demo`
- [x] OpsStrip — "idle" replaced with `<DataSourceTag state="not_connected" override="not connected" />`

## Halt conditions

None fired:
- H1 — no colour flood, no marketing whitespace, no new card chrome (`.micro` + copper dot)
- H2 — no test outside intake/assess failed
- H3 — no Rust schema change
- H4 — no dep change
- H5 — `DataSourceTag.tsx` within LOC cap
- H6 — no new CSS token added
- H7 — all seeded operational values have adjacent marker
- H8 — cell signals reflect engine truth (idle when no source, not fabricated ok)

## Validation

- `pnpm typecheck` — must be clean
- `pnpm test` — ≥ 362 pass (359 baseline + 6 new DataSourceTag tests)
- `pnpm build` — clean
- `cd src-tauri && cargo check --lib` — clean (no Rust diff)
- `cargo test` — skipped (no Rust diff)
- `pwsh tools/ops-readiness.ps1` — READY
- Protected-path diff — limited to 9 paths under SCOPE — IN

## Lessons applied (from prior stages)

- **V1AA** — `<DataSourceTag>` not `<ProvenanceTag>`; `--anth-role-provenance` reusable; OpsStrip IS mounted at `AppShell.tsx:70`
- **V1Z-A** — re-verified file:lines before editing; plan numbers are inputs not verdicts
- **V1Y** — grepped test files before editing; all tests are under frozen intake/assess paths

## Lessons captured (for V1AC)

1. **StatusBar inline-text constraint.** `StatusCell` only accepts a `label: string` — no ReactNode. The honest marker in status bar cells must be encoded as tightened copy (`· demo`, `· unavail.`) in the label string, not via `<DataSourceTag>`. V1AC should be aware if it wants per-cell component markers in the status bar.
2. **D2 KPI strip wrapping.** Added a wrapper div around `anth-d2-kpi-strip` to host the DataSourceTag above it. V1AC should check that this wrapper does not break the D2 grid layout under narrow widths.
3. **Inspector `h4` flex layout.** Changed the health `<h4>` to `display: flex` to align the DataSourceTag inline. V1AC should verify this does not conflict with any `insp-section h4` CSS rule.

## Next stage handoff (V1AC)

Safe to assume:
- `DataSourceTag` exists at `src/components/shell/DataSourceTag.tsx`.
- `source?: DataSourceState` is accepted by `EnvironmentCentreD1`, `EnvironmentDetailD2`, `Inspector`, `InspectorHealthCell`.
- All hierarchy surface seeded values have adjacent markers.
- V1AA contract clauses H1–H6 are the binding rules.

V1AC must re-verify:
- Whether D2 KPI strip wrapper div changed layout in narrow viewports.
- Whether Inspector `h4 { display: flex }` is CSS-rule-safe.
- That `DataSourceTag` LOC is still within cap if V1AC extends it.

## Commit message (for Bujar)

```
stage-v1ab: hierarchy demo labelling with DataSourceTag
```
