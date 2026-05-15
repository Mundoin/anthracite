# V1E-G — Tune NOC Light Typography Scale

- **Date:** 2026-05-15
- **Status:** Complete
- **Obeys:** `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` §10 (visual law).
  `docs/design/INDUSTRIAL_VISUAL_LAW.md`.

## Goal

Bring practical UI typography down 1 px after V1E-F surface polish.
Preserve readability, palette, and enterprise light feel.

## Typography (before V1E-G → after)

Token-driven (`src/App.css`):

| Token              | V1E-F | V1E-G |
|--------------------|-------|-------|
| `--fs-body`        | 15 px | **14 px** |
| `--fs-mono`        | 14 px | **13 px** |
| `--fs-table`       | 14 px | **13 px** |
| `--fs-meta`        | 13 px | **12 px** |
| `--fs-eyebrow`     | 12 px | **11 px** |
| `--fs-panel-title` | 13 px | **12 px** |
| `--fs-section`     | 14 px | **13 px** |
| `--fs-brand`       | 15 px | **14 px** |
| `--fs-title`       | 22 px | **21 px** |
| `--fs-metric`      | 22 px | **21 px** |

Hardcoded element sizes (`HomeEnvironmentCentre.css` / `App.css`):

| Element                      | V1E-F | V1E-G |
|------------------------------|-------|-------|
| `.env-table thead th`        | 12 px | **11 px** |
| `.env-table__sel`            | 14 px | **13 px** |
| `.status` pill               | 12 px | **11 px** |
| `.mode-rail__label`          | 13 px | **12 px** |
| `.readiness-band__cell dd`   | 18 px | **17 px** |
| `.panel-empty__rule`         | 18 px | **17 px** |
| `.readiness-band__cell dt`   | 11 px | 11 px (floor) |
| `.scope-grid__cell dt`       | 11 px | 11 px (floor) |
| `.mode-rail__state`          | 11 px | 11 px (floor) |

11 px is the floor; nothing in the visible UI sits below it.

## Letter-spacing tightened (where headings felt too spaced)

| Selector                  | V1E-F  | V1E-G |
|---------------------------|--------|-------|
| `.brand-mark`             | 0.26em | **0.22em** |
| `.panel-title`            | 0.22em | **0.18em** |
| `.centre-block__title`    | 0.22em | **0.18em** |
| `.home-centre__eyebrow`   | 0.26em | **0.22em** |
| `.readiness-band__eyebrow`| 0.26em | **0.22em** |
| `.env-table thead th`     | 0.18em | **0.16em** |
| `.status`                 | 0.18em | **0.16em** |
| `.mode-rail__label`       | 0.24em | **0.20em** |
| `.mode-rail__state`       | 0.22em | **0.18em** |
| `.panel-empty__rule`      | 0.30em | **0.26em** |

## Palette preserved

NOC Light hex values **unchanged**: `#F8FAFC`, `#E1E8F0`, `#D1D9E6`,
`#38A169`, `#D69E2E`, `#E53E3E`, `#3182CE`, `#B0BCCB`, `#1A202C`.
NOC Dark token block also unchanged.

## App behaviour unchanged

Engines, persistence, readiness logic, typed API, Rust models, default
scheme attribute, control-vocabulary tokens, panel structure — all
unchanged.

## Files changed

- `src/App.css` — `--fs-*` token values, `.panel-title` and
  `.brand-mark` letter-spacing, `.panel-empty__rule` size/spacing.
- `src/components/HomeEnvironmentCentre.css` — element font sizes and
  letter-spacing on table head, env-table sel cell, status pill,
  readiness cell metric, mode-rail label/state, eyebrows, section
  title.
- `src/App.tsx` — titlebar stage label `V1E-F` → `V1E-G`.
- `src-tauri/src/lib.rs` — `ping.stage` `V1E-F` → `V1E-G`.
- `obsidian/stages/V1E-G-typography-tune.md` (new).
- `obsidian/ANTHRACITE_INDEX.md` — index entry.

## Validation

- `cargo check` green.
- `cargo test --lib` 15 / 15 green.
- `pnpm typecheck` green.
- `pnpm build` green (152.18 kB JS, 12.72 kB CSS, 279 ms).
- `tools/ops-readiness.ps1` **READY** (13/13).

## Notes for future agents

- 11 px is the visible-UI floor. Do not reduce table headers, status
  pills, eyebrows, or rail state chips below 11 px.
- When tuning typography in future stages, prefer 1 px steps; do not
  shave the whole scale at once. Bujar reads at normal monitor
  distance — drift of more than 1 px / stage is too aggressive.
- Letter-spacing 0.18–0.22 em is the comfortable range for mono
  headings at the V1E-G scale. Above 0.24 em starts to read as
  marketing chrome.
