# V1F — Anthracite Master Shell + Environment Centre Port

- **Date:** 2026-05-16
- **Status:** Complete · landed visual baseline
- **Anchor before work:** `1a16ce6 docs: add anthracite master design handoff`
- **Obeys:** `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` §5 (mode set), §6 (engine/API
  first), §10 (visual law), §11 #6 (no SaaS aesthetic).
  `docs/design/anthracite-master/handoff/PORTING.md` — primitive map.
  `docs/design/anthracite-master/handoff/TOKENS.md` — visual contract.

## Source of truth

`docs/design/anthracite-master/handoff/**` is the canonical Direction D
visual source. V1F lifts shell primitives, tokens, and the D1/D2 frames
into the Tauri/React app while preserving Rust engine ownership.

## What landed

### Shell primitives (Direction D)
- `src/styles/tokens.css` — `--anth-*` token set (surfaces, borders,
  text, fixed status palette, accent, type stack, density, radii,
  elevation, tinted-chip inks). Lifted verbatim from
  `handoff/src/styles/tokens.css`.
- `src/styles/shell.css` — `.anth-shell` grid, title bar, mode rail,
  secondary nav, work area, inspector, ops dock, status bar, panel,
  toolbar, table, KPI atoms, meter, empty state, D2 helpers.
- `src/components/shell/icons.tsx` — typed icon set (mode + chrome +
  brand mark).
- `src/components/shell/TitleBar.tsx` — 36 px top bar with brand,
  env chip, breadcrumbs, Cortex slot, bell, user, custom-frame
  controls; explicit `onMouseDown → startDragging()` plus
  `onDoubleClick → toggleMaximize()` with `isInteractiveTarget` guard.
- `src/components/shell/ModeRail.tsx` — 196 px grouped rail
  (Foundation / Run / Governance / Workshop) + Ops Console foot.
- `src/components/shell/SubNav.tsx` — segmented mode-local sub-nav.
- `src/components/shell/SecondaryNav.tsx` — 220 px per-mode object
  list with PRODUCTION / NON-PROD / SPECIAL grouping, filter row,
  New foot button.
- `src/components/shell/Inspector.tsx` — right inspector (340 px) with
  empty-state path and D2 subject view (identity, health 2×2,
  interfaces, baselines, footer actions).
- `src/components/shell/OpsStrip.tsx` — 28 px collapsed ops dock.
- `src/components/shell/StatusBar.tsx` — 24 px mono status bar with
  typed status cells (ok / warn / err / info / idle).
- `src/components/shell/AppShell.tsx` — composes titlebar · sub-nav ·
  rail · secondary · work · inspector · ops · status with dynamic
  grid columns.

### D1 — Environment Centre list
- `src/components/d1/EnvironmentCentreD1.tsx` — KPI ribbon (Reachable /
  Readiness avg / Drift / Open events with delta + tinted parts bar),
  filter/query toolbar (mono search expression + filter chips + ghost
  / secondary / primary buttons), dense environment table (status
  dot, env id + region, scope, devices, sites, readiness meter,
  L2/L3/eBGP sub-readiness chips, drift, events chip, owner, last
  poll, row menu).
- Sub-nav segments: All / Production / Staging / Lab / Tenants /
  Isolated.

### D2 — Environment Centre detail + inspector
- `src/components/d2/EnvironmentDetailD2.tsx` — 6-KPI strip
  (Reachable / Readiness / Drift / Open events / BGP estab /
  Bandwidth p95), Readiness-by-domain panel, Open events panel,
  Sites panel.
- Sub-nav segments: Overview / Sites / Devices / Topology / Configs /
  Baselines / Events / Compliance / Audit.
- Right inspector populated with live engine identity rows plus
  mock health / interfaces / baselines for visual parity.
- Detail view opens on D1 row click or secondary-nav selection;
  breadcrumb click on "Hierarchy" or env-id segment returns to list.

### Custom integrated window frame
- `src-tauri/tauri.conf.json` — `decorations: false`; `backgroundColor`
  set to `--anth-bg-app` (`#F8FAFC`) so resize never flashes black.
- `src-tauri/capabilities/default.json` — added five window-mutation
  permissions required by Tauri v2:
  - `core:window:allow-start-dragging`
  - `core:window:allow-minimize`
  - `core:window:allow-toggle-maximize`
  - `core:window:allow-close`
  - `core:window:allow-is-maximized`
- `TitleBar` window controls are real `<button>` elements with
  `e.stopPropagation()` + Tauri window calls. Drag handled at root
  via mouse-down with interactive-target guard; double-click on safe
  zone toggles maximise. Diagnostic `console.error` left in catch
  handlers so any future permission rejection surfaces in DevTools.

### App composition
- `src/App.tsx` — view state (`list | detail`), env data wired from
  the existing typed API (`list_environments`,
  `get_active_environment`, `set_active_environment`,
  `get_environment_readiness`), status bar populated from engine
  readiness, mock peer rows fill the env table for D1 density.
- `src/main.tsx` — imports `tokens.css` then `shell.css` then
  `App.css` so component CSS inherits the scheme.

### Rust
- `src-tauri/src/lib.rs` — `ping.stage` `port-d1-parity` → display
  string only. Engine, commands, persistence, readiness — untouched.

## Rust engine / API / persistence / readiness — unchanged

- `engines/environment.rs`, `commands/environment.rs`, persistence
  shape, readiness projection — no edits this stage. Only Rust diff
  is the display-only `ping.stage` string.

## Validation

- `cargo check` green.
- `cargo test --lib` 15 / 15 green.
- `pnpm typecheck` green.
- `pnpm build` green.
- `tools/ops-readiness.ps1` **READY** (13/13).

## Runtime smoke (manually confirmed by Bujar)

- Custom frame works.
- Drag from safe titlebar zones works.
- Minimise / maximise / restore / close work.
- Edge resize works.
- D1 / D2 visual direction accepted as minimum baseline.

## Remaining approximations

- D1 KPI parts bar and delta numbers partly mock; sub-readiness
  chips per row are mock.
- D2 KPI strip values (BGP estab, Bandwidth p95) are mock.
- Readiness-by-domain, Open events, Sites tables in D2 use mock
  rows.
- Inspector health / interfaces / baselines are mock.
- Cortex slot is visual only — overlay + scope/run/search modes not
  implemented.
- Ops dock expanded terminal not implemented (collapsed strip only).
- Mode rail navigation is local React state (no router).
- Deeper modes (Operate, Topology, Diagnose, Build, ASSESS) not
  implemented.

## Notes for future agents

- `docs/design/anthracite-master/handoff/**` is the authoritative
  visual source. Future stage work that touches the shell or D-frames
  ports from there, not from earlier V1E-* improvisations (which are
  superseded for visual concerns).
- Scheme tokens live in `src/styles/tokens.css` under `:root`. Adding
  a future alternate scheme means a new `[data-scheme="..."]` block
  in tokens.css — do not edit `:root`.
- Rust owns truth. Frontend ports populate visuals around the typed
  command boundary; never reach around an engine.
- Custom-frame window calls require explicit Tauri v2 permissions in
  `src-tauri/capabilities/default.json`. Any new window verb needs a
  matching `core:window:allow-*` entry.
