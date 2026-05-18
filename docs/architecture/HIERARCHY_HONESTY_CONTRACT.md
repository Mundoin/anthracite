# Hierarchy Honesty Contract — Anthracite V1

> Stage: **V1AA** (HONEST-HIERARCHY arc, first stage).
> Status: **landed**.
> Companion to `ANTHRACITE_V1_SOURCE_OF_TRUTH.md`,
> `MODES_AND_ENGINES_MAP.md`, `ENGINE_AND_API_BOUNDARIES.md`,
> `docs/design/INDUSTRIAL_VISUAL_LAW.md`.
>
> Contract version: **`HIERARCHY_HONESTY_CONTRACT_VERSION = 1`**.
> Type module: `src/types/dataSource.ts`.

---

## Preamble — why this contract exists

INTAKE (V1O→V1T) and ASSESS (V1W-R→V1Z-A) closed the
ASSESS-FORWARD arc: both surfaces consume real engines and
present operator-truth honestly. The remaining nine of the
eleven `ModeRail` entries — including the default landing
surface (`hierarchy`) — fall through to a single
hierarchy/environment render path whose KPIs, events, devices,
sites, and inspector cells are hardcoded seed literals in
`src/App.tsx`.

Concretely, `src/App.tsx` calls `getActiveEnvironment` and
`getEnvironmentReadiness` for environment selection plus one
readiness figure, but the surrounding rows, drift counts,
event log, domain percentages, site table, inspector health
cells, and bottom-strip "engines online" cell are seeded.
After two arcs of operator-honest INTAKE + ASSESS, the
default landing surface silently presenting demo numbers as
operational state is the largest operator-trust gap in the
product.

The HONEST-HIERARCHY arc closes that gap **before** it
chases new engines (Discovery, Topology) or rewrites
navigation IA. V1AA locks the contract. V1AB labels the
seeded values. V1AC (optional) routes them through a typed
boundary. V1AD (landed) replaced silent mode fall-through with
`<ModeNotConnected />` placeholders. Discovery, Topology,
deeper parsers, HOME / nav-IA work all sit outside this arc.

## Vocabulary

- **`DataSourceState`** — discriminated union exported from
  `src/types/dataSource.ts`:
  `"real" | "demo" | "empty" | "unavailable" | "not_connected"`.
- **`SOURCE_LABEL`** — `Record<DataSourceState, string>`
  giving honest copy per state. `real` is the empty string
  (no marker needed when the value is real engine state).
- **`HIERARCHY_HONESTY_CONTRACT_VERSION`** — `1`. Bumped
  when clauses change meaning, not when downstream surfaces
  expand.
- **honest hierarchy** — the arc name and the operator
  property the contract guarantees on the hierarchy surface.
- **provenance tag** — V1AB UI affordance (a small adjacent
  marker rendering `SOURCE_LABEL[state]`); defined here but
  **not** built in V1AA.
- **`MODE_VOCABULARY_DRIFT`** — the doctrine-vs-implementation
  mismatch between the 7 canonical modes in
  `ANTHRACITE_V1_SOURCE_OF_TRUTH.md §5` and the 11 ModeIds
  shipped in `src/components/shell/ModeRail.tsx`.
  Acknowledged here, **not** rationalised. Future nav-IA arc.

### Vocabulary distinction — `source_provenance` vs `DataSourceState`

The INTAKE surface already uses the term **provenance**
(`source_provenance: ArchiveEntryRef | null`,
`ArchiveSourceBadge`, `--anth-role-provenance` token). That
is **record-source provenance** — which file/archive a
parsed device came from. It answers "where did this record
come from?".

`DataSourceState` is **data-state classification** — whether
a visible value is real engine state, demo seed, empty,
unavailable, or not-connected. It answers "should the
operator trust this value as operational truth?".

The two concepts coexist. A V1AB provenance tag for a demo
value (`DataSourceState = "demo"`) is unrelated to and does
not collide with the INTAKE `source_provenance` field on a
parsed device record.

## Clauses

### H1 — Source classification

Every visible operational value on the hierarchy surface is
classified as exactly one `DataSourceState`. Mixed-source
aggregates (e.g. a KPI summing real + demo rows) are
classified as the **weakest** member: any seeded
contributor demotes the aggregate to `demo`. The
classification is a property of the value, never of the
component rendering it.

### H2 — Adjacency

A value with `DataSourceState !== "real"` renders with its
provenance marker **visibly adjacent** to the value: same
row, same line, or directly below — not in a footnote, not
in a tooltip-only, not in a help panel. Operators must read
the truth state without hovering, clicking, or scrolling.
Marker copy is `SOURCE_LABEL[state]` or a tightened variant
honouring the same meaning.

### H3 — No silent fall-through

A `ModeId` whose engine does not yet exist must not silently
render another mode's data as its own. Fall-through is
permitted only when the rendered surface declares
`DataSourceState = "not_connected"` for the mode-specific
content. (Binds V1AD; until V1AD lands, the existing
fall-through is an acknowledged debt — see
`MODE_VOCABULARY_DRIFT` below.)

### H4 — Source-agnostic contract

Clauses describe what a value **is** (`real`, `demo`,
`empty`, `unavailable`, `not_connected`) — never **where it
comes from** (`Discovery Engine`, `Inventory Engine`,
`Topology Engine`). A future Discovery Engine landing
post-arc can route through the same `DataSourceState`
discipline without amending the contract. The Environment
Engine (`src-tauri/src/engines/environment.rs`) already
satisfies `real` for environment selection +
`getEnvironmentReadiness`; the contract makes no claim that
this is the only `real` path now or later.

### H5 — Visual-tone preservation

Provenance markers obey `docs/design/INDUSTRIAL_VISUAL_LAW.md`.
Markers reuse existing muted / mono / role tokens from
`src/styles/tokens.css` (e.g. `--anth-text-3`, monospace
data type, existing `--anth-role-provenance` copper). No
new colour token. No marketing whitespace. No drop-shadowed
card to host the marker. No pastel. The marker is a
hairline of honest text, not a callout.

### H6 — Demo data is labelled, not removed

Seed literals on the hierarchy surface (`ROW_SEEDS`,
`detailDomains`, `detailEvents`, `detailSites`, inspector
health, `OpsStrip` idle copy) remain populated through this
arc. V1AB tags them as `demo`; V1AC routes them through a
typed boundary; neither removes them. Stripping demo data
before a real engine replaces it creates an empty-graveyard
landing surface — anti-goal. Operators keep dense populated
rows that they can read at a glance as "demo".

### H8 — Mode-level honesty

ModeRail entries whose body is not yet built render
`<ModeNotConnected />` with `state="not_connected"`, not a
fall-through to another mode's surface. `MODE_STATUS`
(`src/data/modeStatus.ts`) is authoritative for ModeId →
body-built classification. `ENGINE_AND_API_BOUNDARIES.md`
remains authoritative for engine names; `MODE_STATUS` sources
`engineName` values from that doc. A stage that lands a mode
body must flip its `MODE_STATUS` entry to `"built"` in the
same stage, same discipline as `RULE_PACK_VERSION`.

### H7 — Source-state determination lives at the data layer

The hierarchy surface reads `sourceState` from a boundary
module (`src/data/hierarchySource.ts`), not from literal
props at call sites. The H1 aggregate rule is computed at
the boundary. Surfaces consume `sourceState`; they do not
classify. Future engines replace seed imports in the boundary
without reshaping surface props.

---

## Seed inventory

Every visible operational value on the hierarchy surface,
its current source, and its post-V1AB classification.
Verified against HEAD `2c9a780`.

| # | Surface element | File:line | Current source | Post-V1AB state |
|---|------------------|-----------|----------------|------------------|
| 1 | `ROW_SEEDS` — 8 environment rows with hardcoded readiness, l2/l3/ebgp, drift, events, sites, owner, last | `src/App.tsx:98-107` | inline literal | **demo** (per-row; per H1 the `rows` aggregate is **demo**) |
| 2 | `ROW_STATUS_FALLBACK` — status signal per row id | `src/App.tsx:109-118` | inline literal | **demo** |
| 3 | `DEVICE_FALLBACK` — device count per row id | `src/App.tsx:120-129` | inline literal | **demo** (overridden by `live?.device_count` when API match exists; mixed → still **demo** under H1) |
| 4 | `INSPECTOR_TABS` — five tab specs | `src/App.tsx:131-137` | inline literal | structural (out of scope; no operational value) |
| 5 | `LIST_SUBNAV` / `DETAIL_SUBNAV` counts (e.g. `count: 41`, `count: "2,184"`) | `src/App.tsx:61-80` | inline literal | **demo** |
| 6 | `titleBarEnv` fallback scope literal `"EMEA · Production · 2,184 devices"` | `src/App.tsx:208-212` | inline literal | **demo** (fallback only — real branch is **real**) |
| 7 | `listKpis[1].value = "91 %"` (Readiness avg) + `delta: "+0.3"` + `parts: [91, 9, 0]` | `src/App.tsx:253-261` | inline literal | **demo** |
| 8 | `listKpis[2].sub = "67 baselines"` + `delta: "+18"` | `src/App.tsx:262-270` | inline literal | **demo** |
| 9 | `listKpis[3].sub = "37 warn · 15 err"` + `delta: "+4"` | `src/App.tsx:271-279` | inline literal | **demo** |
| 10 | `detailKpis` — `Reachable`, `Readiness`, `Drift`, `Open events`, `BGP estab "1,406 / 1,408"`, `Bandwidth p95 "412 Gbps"` | `src/App.tsx:309-321` | inline literal (derived from seeded `activeRow`) | **demo** |
| 11 | `detailDomains` — 7 readiness domains with pct + fraction strings | `src/App.tsx:323-331` | inline literal | **demo** |
| 12 | `detailEvents` — 6 events with timestamps, severities, sources, messages | `src/App.tsx:333-340` | inline literal | **demo** |
| 13 | `detailSites` — 8 sites with role, devices, reach, readiness, events, maint | `src/App.tsx:342-351` | inline literal | **demo** |
| 14 | `inspectorHealth` — CPU 14%, Memory 38%, Inlet 37°C, Power dual | `src/App.tsx:375-382` | inline literal | **demo** |
| 15 | `inspectorInterfaces` — 6 interfaces with peer + bw | `src/App.tsx:384-391` | inline literal | **demo** |
| 16 | `Inspector baselines` props `LEAF-BASE-EU v3 · 1,420 lines`, `3 lines drift CORE-AAA-V3` | `src/App.tsx:464-467` | inline literal | **demo** |
| 17 | `statusLeft` returns `engines online` cell with `signal: "ok"` regardless of engine state | `src/App.tsx:520` | inline literal | **unavailable** (no live engine-health source) |
| 18 | `statusLeft` `inventory`/`drift`/`events` cells derived from seeded `rows` | `src/App.tsx:521-523` | derived from `rows` (which is **demo** per #1) | **demo** under H1 |
| 19 | `statusRight` list-view label `"hierarchy · 8 of 8 · sorted by readiness ↓"` | `src/App.tsx:530` | inline literal | **demo** |
| 20 | `statusRight` detail-view label `"scope: … · 38s since last poll · readiness N%"` (38s is hardcoded; readiness comes from seeded `activeRow`) | `src/App.tsx:537-538` | inline literal + derived seed | **demo** |
| 21 | `statusRight` `v0.1.0` + `rust-core · ok` cells (intake/assess/hierarchy branches) | `src/App.tsx:405-407, 423-425, 532-533, 540-542` | inline literal | **demo** (`rust-core · ok` makes a liveness claim with no source) |
| 22 | `StatusBar.DEFAULT_LEFT = [{ id: "engine", label: "engines online", signal: "ok" }]` (only renders when caller omits `left`) | `src/components/shell/StatusBar.tsx:16-18` | inline literal | **unavailable** |
| 23 | `StatusBar.DEFAULT_RIGHT = [{ id: "core", label: "rust-core · ok", signal: "ok" }]` | `src/components/shell/StatusBar.tsx:20-22` | inline literal | **demo** |
| 24 | `OpsStrip` labels `"idle"` + `"no active session"` | `src/components/shell/OpsStrip.tsx:27, 29` | inline literal | **not_connected** (pty + session not wired per file header comment) |

V1AB scope binds rows 1, 2, 5, 7–16, 18–23. Rows 17, 22, 24
are classified `unavailable` / `not_connected` rather than
`demo` because no demo intent ever existed — they were
placeholders for engine output that does not yet exist.
Row 4 is structural (tab definition, not operational data)
and is out of contract scope.

## `MODE_VOCABULARY_DRIFT`

Acknowledged, **not** rationalised in this arc.

- `ANTHRACITE_V1_SOURCE_OF_TRUTH.md §5` declares **7
  canonical modes**: HOME, BUILD, OPERATE, DIAGNOSE,
  INTELLIGENCE, FORGE, ASSESS.
- `src/components/shell/ModeRail.tsx` ships **11 ModeIds**:
  `hierarchy`, `intake`, `provisioning`, `operate`,
  `topology`, `diagnose`, `assess`, `security`, `dashboards`,
  `build`, `settings`.
- `home` is not in the rail. `hierarchy` is the default
  landing per decision `0004-home-mode-deferred-to-nav-stage.md`.
- `intake` is shipped but not in the canonical 7
  (ASSESS-FORWARD added it as an operator surface).

This contract treats the 11-ModeId catalogue as the current
implementation truth and binds H3 accordingly. Rationalising
the canonical set (mapping `hierarchy` → HOME, retiring
duplicates, deciding the fate of `intake`/`assess` as
top-level entries) is a future **navigation-IA arc**, not
HONEST-HIERARCHY work.

## Non-goals (binds the whole HONEST-HIERARCHY arc)

- No Discovery Engine.
- No Topology Engine.
- No parser-depth work (L3+, BGP, OSPF, VXLAN, VPC, EVPN,
  VARP).
- No INTAKE edits. No ASSESS edits.
- No npm / Cargo dependency changes.
- No Rust schema changes to `Environment` /
  `EnvironmentReadiness`.
- No new Tauri command.
- No `ModeRail` ModeId rename / add / remove.
- No HOME mode work (deferred per decision 0004).
- No visual-tone change beyond the muted markers of H5.
- No removal of demo data (H6).

## Pointers

- Source of truth: `docs/architecture/ANTHRACITE_V1_SOURCE_OF_TRUTH.md`
- Mode-engine map: `docs/architecture/MODES_AND_ENGINES_MAP.md`
- Engine roster: `docs/architecture/ENGINE_AND_API_BOUNDARIES.md`
- Visual law: `docs/design/INDUSTRIAL_VISUAL_LAW.md`
- HOME deferral: `obsidian/decisions/0004-home-mode-deferred-to-nav-stage.md`
- Stage note: `obsidian/stages/V1AA-hierarchy-honesty-contract.md`
- Type module: `src/types/dataSource.ts`
