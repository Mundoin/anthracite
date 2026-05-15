# PORTING · Anthracite Master → React + TS

How the design primitives in this package map to real React + TS components in the Tauri codebase. The mock JSX in `src/` is **reference**, not shippable — the port is real TS modules, wired to your store + Tauri commands.

This doc walks the system top-down: shell composition, primitives, then each frame surface.

---

## 0 · Conventions for the port

- **TypeScript everywhere.** Every primitive below has a Props interface. Names match the JSX source so cross-reference is mechanical.
- **State source.** Selection (current env, current mode, selected device, inspector dock, ops dock state) lives in a small global store (`useAnthStore`, Zustand/Redux/whatever you settled on). Routing reflects state, not the other way around.
- **Tauri command surface.** Every action verb (`run baseline sweep`, `path trace`, `pull config`, `re-poll`, `test transport`) is a Tauri command in Rust. The frontend never holds business logic — it dispatches and renders the result. Rust owns determinism.
- **Suspense + streaming.** Long ops (discovery, compliance run, path trace) stream results. The mock uses static panels; the port should bind to streams and update progressively.
- **No web fonts.** System UI only. If `Segoe UI Variable` isn't present, the fallback chain in TOKENS.md handles it.

---

## 1 · CSS tokens

`src/styles/tokens.css` and `src/styles/shell.css` are **the source of truth**. Lift them into your project as-is (or convert to a CSS-in-JS theme if you must — keep variable names identical).

- Token file is global, applied at app root.
- Shell file scopes everything under `.anth` — keep that prefix on the root component so design-system styles never bleed into external embeds.

If you migrate to a CSS-in-JS theme, name your theme keys to match the `--anth-*` variable names verbatim (`tokens.surfaces.panel`, `tokens.status.ok`, etc.).

---

## 2 · Primitive map

Every component below is in `src/components/master.jsx`. Port each into its own file under `src/components/shell/` in your codebase.

### `<MasterTitleBar>` → `src/components/shell/TitleBar.tsx`

The 36 px top frame. Contains brand mark, environment switcher chip, breadcrumb trail, Cortex search bar (inline), bell, user, and Windows window controls (min/max/close).

```ts
interface TitleBarProps {
  crumbs: string[];
  env: EnvironmentSummary;     // { id, scope, devices, state: 'ok'|'warn'|'err'|'idle' }
  onCortexOpen: () => void;
  onEnvSwitchOpen: () => void;
}
```

- **Window controls** wire to Tauri's `getCurrent().minimize() / .toggleMaximize() / .close()`.
- **Env chip** opens the env-switcher popover (D11 scope mode).
- **Cortex** opens the global launcher (see `<MasterCortex>` below). `Ctrl+K` is global.
- Make the bar `draggable` (Tauri `data-tauri-drag-region`) **except** over interactive elements.

### `<MasterModeRail>` → `src/components/shell/ModeRail.tsx`

Left-side primary nav. Two variants: `labeled` (196 px) and `icons` (56 px). Grouped: Foundation / Run / Governance / Workshop.

```ts
interface ModeRailProps {
  active: ModeId;              // 'hierarchy' | 'provisioning' | 'operate' | ...
  variant: 'labeled' | 'icons';
  onChange: (id: ModeId) => void;
  badgeCounts?: Record<ModeId, number>;
  alertCounts?: Record<ModeId, number>;
}
```

- `ModeId` is a TS string union — see `MODE_GROUPS` in `src/components/master.jsx`.
- Badges (`badge`) show neutral counts; alerts (`alerts`) show error-tinted counts. Distinct semantics.
- Active mode also marks the route. Keyboard: `Ctrl 1`–`Ctrl 9` jumps by mode position.

### `<MasterSubNav>` → `src/components/shell/SubNav.tsx`

Segmented control under the titlebar, inside the main pane. Mode-local — each mode owns its own sub-views.

```ts
interface SubNavItem { id: string; label: string; count?: number | string; warn?: boolean; err?: boolean; icon?: ReactNode; }
interface SubNavProps {
  items: SubNavItem[];
  activeId: string;
  onChange: (id: string) => void;
  right?: ReactNode;           // mode-specific action chips/buttons
}
```

- Count colour tracks state (warn/err override neutral).
- `right` slot is where modes put their filter chips, view toggles, and primary buttons.

### `<MasterSecondaryNav>` → `src/components/shell/SecondaryNav.tsx`

220 px column to the right of the mode rail. Appears **only** for object-list modes (Hierarchy / Provisioning / Operate / Security / Build). Canvas modes do not get one.

```ts
interface SecondaryNavProps<T> {
  title: { hd: string; sub: string };
  groups: Array<{ hd: string; items: T[] }>;
  selectedId?: string;
  onSelect: (id: string) => void;
  filter?: { value: string; onChange: (s: string) => void };
  onCreate?: () => void;
}
```

- Each item should render with status dot · primary label (mono) · secondary line · optional numeric badge.
- Filter input is **mandatory** — operators won't scroll a list of 2,000+ devices.
- Selection persists per environment, not globally.

### `<MasterInspector>` → `src/components/shell/Inspector.tsx`

The object-detail surface. Three docks: `right` (default 340 px) · `bottom` (full × 260 px) · `floating` (draggable 320 × variable). **One inspector per shell.**

```ts
interface InspectorProps<T> {
  subject: T;                  // Device | Site | Config | …
  dock: 'right' | 'bottom' | 'floating';
  onDockChange: (d: Dock) => void;
  onClose?: () => void;
  tabs: InspectorTabSpec<T>[];
  activeTabId: string;
  onTabChange: (id: string) => void;
}
```

- The tab set is **subject-specific** — Device inspector has Overview/Interfaces/Routing/Config/Events, Config inspector has Source/Diff/Targets/History/Audit, etc. Build a small inspector-registry keyed by subject kind.
- Dock toggling: `I` for right, `B` for bottom, `P` for floating pop-out. Choice persists per `(environmentId, mode)`.
- The bottom-drawer variant fans out into 4 columns. Keep this consistent — operators glance, they don't scroll a bottom drawer.

### `<MasterOpsDock>` → `src/components/shell/OpsDock.tsx`

Always-on. 28 px collapsed strip → 220 px terminal on `Ctrl ``.

```ts
interface OpsDockProps {
  expanded: boolean;
  onToggle: () => void;
  sessions: OpsSession[];      // { id, label, deviceId?, state }
  activeSessionId: string;
  onSessionSelect: (id: string) => void;
  onSessionClose: (id: string) => void;
  onNewSession: () => void;
}
```

- Terminal renders via xterm.js bound to a Tauri pty channel. Sessions are server-side; the UI is a thin frontend.
- Command grammar matches Cortex action verbs verbatim — `run baseline sweep`, `test transport`, etc. — so users can muscle-memory between palette and CLI.

### `<MasterCortex>` → `src/components/shell/Cortex.tsx`

The global launcher. Three modes: `search` (default) · `run` (action verb prefix `>` or Tab on a verb) · `scope` (Tab from input clears).

```ts
interface CortexProps {
  open: boolean;
  scope: EnvironmentId | EnvironmentId[];
  mode: 'search' | 'run' | 'scope';
  query: string;
  onClose: () => void;
  onModeChange: (m: Mode) => void;
  onQueryChange: (q: string) => void;
  onSelect: (result: CortexResult) => void;
}
```

- **Scoped.** Every search resolves against the active env chip. `⇥` cycles scope-switch mode; `⇧⇥` narrows.
- **Auditable.** Every Cortex run is journaled — (operator, scope, args, outcome) — and replayable from history. Wire `onSelect` for `run` results through a confirmation step that captures the journal.
- **CLI parity.** Anything Cortex can run, the ops dock CLI can run with the same grammar. Maintain a single command registry on the Rust side.

### `<MasterShell>` → `src/components/shell/Shell.tsx`

Composition helper. Takes a mode + content slots, lays out rail + secondary + main + inspector + ops dock + status bar according to mode rules. Wraps all frames.

```ts
interface ShellProps {
  mode: ModeId;
  crumbs: string[];
  env: EnvironmentSummary;
  subnav?: ReactNode;
  secondary?: ReactNode;       // only for object-list modes
  inspector?: ReactNode;
  inspectorDock?: Dock;
  opsExpanded?: boolean;
  railVariant?: 'labeled' | 'icons';
  statusNote?: string;
  children: ReactNode;         // main content area
}
```

The shell is dumb composition. State (mode/env/dock prefs) comes from the store, not props.

---

## 3 · Status surfaces — atoms

These are not standalone primitives but they appear so often you want a real component for each.

- **`<Dot status>`** — 6 px circle. `status: 'ok' | 'warn' | 'err' | 'info' | 'idle'`.
- **`<Chip status, solid?>`** — tinted (default) or solid pill. Same status union.
- **`<Spark seed?, points?, color?>`** — sparkline. Mock uses a deterministic seed; the real port binds to a metrics time-series.
- **`<KBD>Ctrl K</KBD>`** — keyboard hint key.
- **`<Kpi label, value, sub?, delta?, sparkSeries?>`** — KPI panel.

Build them once, use them everywhere. Most density wins come from this set.

---

## 4 · Frame surface map · D1–D12

Each frame in `src/directions/master-frames*.jsx` becomes a real route + container component. Re-implement against the primitives above — do not lift the mock JSX. Use the mocks as visual reference and content-density spec.

### D1 — Environment Centre · list  
**Route**: `/hierarchy/environments`  
**Container**: `EnvironmentListPage.tsx`  
**Composes**: Shell (mode=`hierarchy`) + SecondaryNav (envs) + SubNav (All/Production/Staging/…) + EnvironmentHealthRibbon + EnvironmentTable.  
**Data**: `useEnvironments()` (list + summary + readiness/drift/events totals).  
**Notes**: Hybrid view default. View toggle (Hybrid/Cards/Map) persists per user. Table columns reorderable; user preference persists to disk via Tauri.

### D2 — Environment Centre · detail  
**Route**: `/hierarchy/environments/:envId`  
**Container**: `EnvironmentDetailPage.tsx`  
**Composes**: Shell + SubNav (Overview / Sites / Devices / Topology / Configs / Baselines / Events / Compliance / Audit) + KPI strip + ReadinessByDomain + EventsTable + SitesTable. Inspector wires to the row currently selected.  
**Data**: `useEnvironment(envId)` + lazy panels.

### D3 — Operate · live device  
**Route**: `/operate/:envId/devices/:deviceId`  
**Container**: `OperateDevicePage.tsx`  
**Composes**: Shell (mode=`operate`) + SecondaryNav (DeviceTree, grouped by site) + SubNav (Live/Interfaces/BGP/VRFs/Routes/ARP/Config/Events) + DeviceHero + HealthGrid + InterfaceTable. OpsDock expanded by default.  
**Data**: `useDevice(deviceId)` + live `useDeviceMetrics(deviceId, hz=1)`.

### D4 — Topology · L3 underlay  
**Route**: `/topology/:envId/:layerId`  
**Container**: `TopologyPage.tsx`  
**Composes**: Shell (mode=`topology`, no secondary nav) + SubNav (Physical/L2/L3/eBGP/VXLAN/Path traces) + TopologyCanvas + LayerStack + Legend + Minimap + SelectionInspector (floating).  
**Renderer**: The 2D mock SVG is the fallback. Real implementation goes through a renderer abstraction:  
  - `Topology2DRenderer` — SVG/Canvas, the fallback (small graphs, no WebGL).
  - `TopologyBabylonRenderer` — Babylon.js for 3D — the headline view. Toggle is `G`.  
**Graph layout**: Rust computes the layout (deterministic). Frontend just renders.

### D5 — Diagnose · path trace  
**Route**: `/diagnose/:envId/path-trace/:traceId?`  
**Container**: `DiagnosePathTracePage.tsx`  
**Composes**: Shell (mode=`diagnose`) + InputPanel (320 px left) + TimelineGraph (main) + Embedded OpsConsole (220 px bottom).  
**Note**: The embedded ops console is a **mode-specific** terminal — distinct from the global `<MasterOpsDock>`. Path trace runs stream into it.  
**Backend**: Rust path-trace engine walks RIB/FIB per hop; the timeline graph binds to streamed hops.

### D6 — Build · config + diff  
**Route**: `/build/:workspaceId`  
**Container**: `BuildWorkspacePage.tsx`  
**Composes**: Shell (mode=`build`) + SecondaryNav (Workspaces/Templates/Recent diffs) + SubNav (Edit/Diff/Targets/Test/Promote/History) + Editor (Monaco, jinja2 grammar) + DiffPanel + BottomRolloutBar.  
**Editor**: Monaco with a custom jinja2-EOS tokenizer and the **arista-canon** language server for validation. Pull autocomplete from the actual baseline.  
**Promote flow**: Plan → Test render targets → Pilot subset → Stage rollout → Apply. Each step is a Rust command that returns a journaled receipt.

### D7 — Assess · readiness report  
**Route**: `/assess/:envId/readiness/:reportId?`  
**Container**: `AssessReadinessPage.tsx`  
**Composes**: Shell (mode=`assess`, no secondary nav) + SubNav (Compliance/Readiness/Drift/Security/Custom) + ReportLayout. Report layout is a print-friendly stack: header → domain breakdown → control failures → trend/drift/findings cards → site heatmap → footer (sha256 + signature).  
**Print**: The page MUST `@media print` cleanly to PDF for handoff and incident bundles. Hide shell chrome on `@media print`.

### D8 — Empty  
**Container**: `EnvironmentEmptyState.tsx`  
Rendered when the env list is empty. Four entry routes: Discover from seed (recommended) · Import from CMDB · Clone a baseline · Start blank. Drop-target for `*.anth.toml` manifest files.

### D9 — Loading  
**Container**: `EnvironmentDiscoveringState.tsx`  
Rendered while the discovery engine is building inventory. Five progress dims (Seeds / Devices / Configs / Baselines / Compliance). Live engine log streams via Tauri channel. Critical: **non-blocking** — operator can still browse the partial inventory.

### D10 — Error · isolated env  
**Container**: `EnvironmentIsolatedState.tsx`  
Rendered when transport is down and the breaker has tripped. Red banner with operator actions (View runbook · Test transport · Resume polling) · timeline of observations · suggested steps · engine log. Frozen readiness chip stays visible everywhere this env appears in the rest of the app.

### D11 — Cortex behaviours  
**Not a route.** This is a specification frame: three modes side-by-side. Use it as the design reference when implementing `<MasterCortex>`. Keep the contract notes — scoped, mixed, composable, auditable — in your component docs as the test plan.

### D12 — Inspector patterns  
**Not a route.** Specification frame. Use the default-per-mode table at the bottom as the inspector dock defaults. Override is per `(environmentId, mode)`.

---

## 5 · Wiring · the Tauri seam

For each Rust command the design assumes, here's the surface you'll need. (Names are suggestions — pick what fits your existing naming.)

| Frontend trigger                          | Tauri command            | Returns                          |
|-------------------------------------------|--------------------------|----------------------------------|
| Open Cortex run · "run baseline sweep"    | `cortex_invoke`          | run journal id + stream channel  |
| Re-poll env                               | `env_repoll`             | poll cycle id + stream            |
| Path trace                                | `diagnose_path_trace`    | trace id + hop stream             |
| Pull device config                        | `device_pull_config`     | config blob + sha                 |
| Diff config vs baseline                   | `baseline_diff`          | hunk array                        |
| Plan rollout                              | `build_plan_rollout`     | plan id + impact summary          |
| Apply rollout                             | `build_apply_rollout`    | rollout id + per-device stream    |
| Run assessment                            | `assess_run`             | assessment id + result stream     |
| Test transport                            | `transport_test`         | reachability + latency            |
| Resume polling                            | `env_resume_polling`     | new poll cycle id                 |
| Switch environment                        | `env_switch`             | new active env summary            |

Every command returns enough to journal it. The Rust layer owns idempotency, retry, and circuit breakers — the UI never decides whether something is "safe to retry."

---

## 6 · Don't drift checklist · for code review

When reviewing the port, eyeball these:

- [ ] Status colours never re-themed; status semantics intact across the whole app.
- [ ] No web fonts loaded — Segoe UI Variable + Cascadia Mono only.
- [ ] No emoji anywhere. No decorative icons. No gradient buttons.
- [ ] Tables are dense by default; sub-readiness columns use chips with semantic tints.
- [ ] One inspector per shell. Dock choice persists per `(envId, mode)`.
- [ ] Mode rail is grouped (Foundation / Run / Governance / Workshop) — not a flat list of 10.
- [ ] Secondary nav appears for object-list modes only.
- [ ] Cortex is scoped to active env by default; scope-switch is `⇥`.
- [ ] CLI grammar in ops dock matches Cortex action verbs verbatim.
- [ ] Every long-running op streams progress; nothing blocks the UI.
- [ ] Report surfaces (`/assess/...`) print cleanly to PDF without shell chrome.
- [ ] Status bar is mono, 24 px, never sized larger or "decorated."

If those eight pages of behaviour land cleanly, the port matches Direction D.
