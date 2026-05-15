# V1E-E — NOC Light Visual Refinement

- **Date:** 2026-05-15
- **Status:** Complete
- **Obeys:** `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` §10 (visual law),
  §11 #6 (no SaaS aesthetic). `docs/design/INDUSTRIAL_VISUAL_LAW.md`.

## Goal

Make the NOC Light surface feel like premium NOC workstation software —
stronger hierarchy, more deliberate structure, sharper table, controlled
active row, real disabled-module rail, subtle measurement plane — while
preserving V1E-C's readable typography and the exact NOC Light palette.

## Visual refinements made

### Title strip
- Height 44 → 48 px.
- Vertical gradient from `--bg-1` to `--bg-2` (soft platform-edge).
- Heavier `--line-bright` bottom border + inset shadow line.
- 8 × 8 px Trace Analysis Blue indicator block before the brand mark.
- Brand mark colour: blue → `--text-0` (authority), accent reserved for
  navigation/action.
- Brand sub now sits behind a left-divider hairline against brand mark.

### Work area / measurement plane
- `.panel-center` carries a low-strength repeating linear-gradient NOC
  grid at 32 px spacing using `--line-bright` at ~22% strength.
- Inset 1 px steel border completes the workstation-pane edge.

### Panel structure
- Side rails / inspector gain inset top highlight + heavier
  `--line-bright` gap colour (1 px gutters now read as deliberate
  hairlines, not blurred edges).
- All panel/section headings get a 3 px Trace Analysis Blue **accent
  bar** on the left + 8 px bottom rule. Stronger letter-spacing
  (0.18 → 0.20), uppercase enforced.

### Environment Centre header
- Padding 14×20 → 18×22.
- Vertical gradient header band against `--bg-2` foot edge.
- Eyebrow gets a copper indicator square + heavier letter-spacing.
- Meta key/value tags: keys uppercase 12 px, values bold 13 px mono.

### Readiness band
- Border-left 3 → 4 px.
- Cell metric type 16 → 18 px mono bold.
- Cell padding 6×10 → 8×12.
- Grid background uses `--line-bright` (visible hairlines).

### Table
- `border-collapse: separate` + sticky header (`position: sticky`).
- Header bg `--bg-2`, uppercase, letter-spacing 0.16, padded 10×12.
- Row padding 8×10 → 10×12 (readable rhythm without text shrink).
- **Zebra rows** via `color-mix` between `--bg-0` / `--bg-1` (~35%).
- Active row: `--accent-dim` fill + inset 3 px Trace Analysis Blue
  left bar via `box-shadow: inset`. Holds on hover.
- Hover (non-active): `--bg-2`.
- Selection glyph: 42 px column, accent-coloured, bold.
- ID column muted (`--text-1`); device count: tabular, bold.

### Status pills
- Bold (`font-weight: 700`).
- Subtle 8 % tinted background via `color-mix(currentColor 8%, transparent)`.
- Uppercase + letter-spacing 0.16.

### Environment summary
- Subtle copper-tinted wash on the left edge fading to transparent.

### Mode rail (disabled modules)
- Background switched to a 135° **steel hash pattern** at 6 px stripe
  (workstation "module offline" treatment, not a SaaS button).
- Label colour `--text-1` (greyed); state badge `--bg-1` chip with
  steel border. Hover light-up still available for the future
  enabled state via accent border.

## Typography preserved (V1E-C readable scale, untouched)

| Token              | Value |
|--------------------|-------|
| `--fs-body`        | 15 px |
| `--fs-mono`        | 14 px |
| `--fs-table`       | 14 px |
| `--fs-meta`        | 13 px |
| `--fs-eyebrow`     | 12 px |
| `--fs-panel-title` | 13 px |
| `--fs-section`     | 14 px |
| `--fs-brand`       | 15 px |
| `--fs-title`       | 22 px |
| `--fs-metric`      | 22 px |

No microtext regression. Header sizes raised where weight changed (12 →
13 column heads, 16 → 18 readiness metric), never lowered.

## Scheme system preserved

- Default opening scheme: **NOC Light** (`<html data-scheme="noc-light">`).
- Alternate scheme **NOC Dark** retained verbatim — token block kept
  intact. No shared variable touched destructively.
- Palette hex values unchanged on both schemes.

## Files changed

- `src/App.css` — title strip, work-area grid plane, panel headings.
- `src/components/HomeEnvironmentCentre.css` — full refinement.
- `src/App.tsx` — stage label `V1E-C` → `V1E-E`.
- `src-tauri/src/lib.rs` — `ping.stage` `V1E-C` → `V1E-E`.
- `obsidian/stages/V1E-E-noc-light-refinement.md` (new).
- `obsidian/ANTHRACITE_INDEX.md` — index entry.

No changes to: Environment Engine, persistence, readiness logic,
commands, TS API, Rust models, NOC Dark tokens, default scheme,
typography scale, palette hex values.

## Validation

- `cargo check` green.
- `cargo test --lib` 15 / 15 green.
- `pnpm typecheck` green.
- `pnpm build` green (151.77 kB JS, 10.78 kB CSS, 303 ms).
- `tools/ops-readiness.ps1` **READY** (13/13).

## Notes for future agents

- The 22 % grid-plane gradient is the workstation cue, not decoration.
  Keep it subtle — anything stronger turns the surface into graph
  paper.
- `color-mix(in srgb, ...)` is used in several places (zebra rows,
  status pill tint, summary wash). Browsers without `color-mix` would
  degrade to the fallback solid colour; Tauri's WebView2 supports it.
- Trace Analysis Blue is reserved for navigation / action emphasis,
  including: brand-mark indicator block, panel-heading accent bar,
  active-row left rail, selection glyph. Do not extend it to status
  or text body.
- Copper / SLA Amber Alert is reserved for operator-selection accents
  (eyebrow indicator, summary wash). Status amber draws from the same
  hex deliberately — NOC convention.
