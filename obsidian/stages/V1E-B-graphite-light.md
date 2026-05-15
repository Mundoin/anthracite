# V1E-B — Graphite Light Opening Scheme + Product Naming Cleanup

- **Date:** 2026-05-15
- **Status:** Complete
- **Obeys:** `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` §1 (product identity —
  Anthracite is the application name), §10 (visual law),
  §11 non-negotiable #6 (no website / SaaS aesthetic).
  `docs/design/INDUSTRIAL_VISUAL_LAW.md` — dense, infrastructure
  workstation feel.

## Goal

Stop using "Anthracite" as a theme/scheme name. Anthracite is the
application. The default opening scheme becomes **Graphite Light** — a
restrained light-industrial palette: warm off-white / stone surfaces,
graphite text, steel hairline borders, muted grey-blue panel insets,
copper/amber selection accent, signal-blue navigation accent. Status
colours reserved for true status.

## What landed

### Visual scheme
- `src/App.css`: `:root` and `[data-scheme="graphite-light"]` define the
  Graphite Light token set. Surfaces (`--bg-0/1/2`) are stone / cooler
  stone / muted grey-blue. Text (`--text-0/1/2`) is graphite stack.
  Borders (`--line`, `--line-bright`) are steel hairlines. `--accent`
  is signal blue (`#2b6cb0`), `--accent-dim` light blue for active row
  fill. `--copper` (`#b86a2b`) drives operator selection eyebrow.
  Signal colours (`--signal-healthy`, `--signal-degraded`,
  `--signal-offline`, `--signal-unknown`) retuned for light-bg
  contrast — reserved for true status only.
- `index.html`: `<html data-scheme="graphite-light">` sets the opening
  scheme at boot. Later schemes can plug into the same attribute hook.
- `src/components/HomeEnvironmentCentre.css`: removed local copper /
  signal token overrides — they now inherit from the scheme.

### Naming + stage labels
- `src/App.tsx` title bar now reads
  `network intelligence workstation · v0.1.0 · stage V1E-B · scheme Graphite Light`.
  Brand mark stays `ANTHRACITE` (app name).
- `src/App.tsx` left-panel placeholder no longer references "V1D" —
  generic "later stage" wording.
- `src-tauri/src/lib.rs` `ping` stage label `V1E` → `V1E-B`.

## Visual naming changes

| Where | Before | After |
|-------|--------|-------|
| Scheme name | (implicit "Anthracite" dark) | `Graphite Light` |
| `<html>` attribute | none | `data-scheme="graphite-light"` |
| Title-bar stage | `stage V1C` | `stage V1E-B · scheme Graphite Light` |
| Mode rail placeholder | "Mode rail surfaces in V1D." | "Mode rail surfaces in a later stage." |
| Rust `ping.stage` | `V1E` | `V1E-B` |

"Anthracite" remains in: app name (brand mark), repo name, doctrine docs,
crate / package name, window title — never as a visual scheme label.

## Out of scope (kept)

- Environment Engine, persistence, readiness, commands, TS API — all
  unchanged.
- No new product features, no new modes, no inventory/discovery/
  topology/auth/remote work.
- No new dependencies.

## Validation

- `cargo check` — green.
- `cargo test --lib` — 15 / 15 green.
- `pnpm typecheck` — green.
- `pnpm build` — green (151.78 kB JS, 7.75 kB CSS, 272 ms).
- `tools/ops-readiness.ps1` — **READY** (13/13).

## Notes for future agents

- Tokens are scheme-scoped via `[data-scheme="..."]`. Adding a second
  scheme (e.g. a darker industrial variant) means defining a second
  attribute selector and switching the `<html data-scheme=...>` value.
- `--copper` is the operator-selection accent — use it for eyebrows and
  active-record markers, not for status.
- `--accent` (signal blue) is for navigation / action emphasis only.
- Status pills (`status--healthy/degraded/offline/unknown`) draw from
  the scheme's signal tokens. Don't hardcode hex for status.
