# V1E-F — Enterprise Light Surface Polish

- **Date:** 2026-05-15
- **Status:** Complete
- **Obeys:** `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` §10 (visual law),
  §11 #6 (no SaaS aesthetic). `docs/design/INDUSTRIAL_VISUAL_LAW.md`.

## Goal

Raise the NOC Light surface from readable wireframe to credible
enterprise network software. Preserve exact NOC Light palette, V1E-C
typography, NOC Dark alternate scheme, and all engine/API behaviour.

## Visual system refinements

### Control vocabulary (new tokens in `src/App.css`)
- `--radius-0`, `--radius-1` — almost-square industrial corners.
- `--pad-toolbar`, `--pad-module`, `--gap-module` — shared spacing
  vocabulary so future forms/dialogues inherit the rhythm.
- `--elev-soft`, `--elev-inset` — industrial elevation (hairline +
  1 px highlight). Never marketing-grade drop shadows.

### Title strip
- Height 48 → 52 px; padding 0 18 → 0 20.
- Vertical gradient bg, dual inset highlights (top + bottom).
- Indicator block enlarged 8 → 10 px with two-step halo.
- Brand-mark letter-spacing 0.24 → 0.26.
- Brand-sub padded behind a left-divider hairline.

### Workspace grid
- Side rails widened (300 → 320; 340 → 360).
- Gap colour `--line-bright` (deliberate hairlines).
- Panel padding 14×16 → 16×18 with inset top highlight.

### Centre work area
- Soft radial vignette from top centre using `--bg-1` at ~35 % mix
  fades into the measurement plane. Removes the "blank pale floor"
  feel.
- Measurement plane retained at 32 px spacing, ~20 % `--line-bright`.

### Authoritative panel titles
- 3 px Trace Analysis Blue left accent bar.
- 0.22 em letter-spacing, uppercase, bold.
- Padding 0×0 12 px on the left.

### Empty state (`panel-empty`)
- Bordered dashed `--line-bright` box on `--bg-0`.
- `panel-empty__rule` glyph row in 18 px mono `--line-bright`.
- `panel-empty__caption` in `--text-1` mono 13 px.
- Applied to Mode Rail, Inspector, Status Strip placeholders so they
  look intentional, not weak.

### Environment Centre header
- Padding 18×22 → 20×24.
- Eyebrow indicator dot gains a 2 px copper halo.
- Meta strip: each k/v rendered as an **enterprise chip** with a
  steel border, `--bg-2` key cell, `--bg-0` value cell, monospace.

### Readiness band
- Border-left 4 px; dual inset rules.
- Padding 14×22 → 16×24, gap 6×22 → 8×24.
- Grid cell padding 8×12 → 10×12.
- Eyebrow letter-spacing 0.22 → 0.26.

### Body grid
- Gutter changed from 1 px hairline → 14 px padded grid so each
  centre-block reads as its own enterprise module.
- All `.centre-block` instances now carry a true module shell:
  `--bg-1` body, hairline `--line-bright` border, inset top highlight.
- Environments block becomes a **toolbar + table module**: title row
  carries a gradient toolbar bg + 4×14 px accent tick before the
  text.

### Table polish (high-trust)
- Header padding 10×12 → 10×14, letter-spacing 0.16 → 0.18, bold,
  uppercase. Column separators: 1 px `--line-bright`.
- Row padding 10×12 → 11×14 (more breathing without text shrink).
- Per-cell vertical hairlines using `--line` (separated borders).
- Active row: `--accent-dim` fill, inset 4 px Trace Analysis Blue
  rail on the first cell only (single rail, professional).
- Hover non-active: `--bg-2`.
- Selection glyph 14 px, accent, bold.
- ID column muted to `--text-1`; device count tabular, bold.

### Status pills (control vocabulary)
- Padding 2×8 → 3×9; tint `currentColor 8%` → `10%`.
- Letter-spacing 0.16 → 0.18.
- Line-height pinned 1.2 for consistent chip rhythm.

### Environment summary callout
- Pulled out of the table block with explicit margins.
- Padding 4×0 12 → 8×12; copper wash 8 % → 10 %.

### Mode rail (disabled enterprise modules)
- Hash background stripe 6 → 8 px, line gap retained.
- Label letter-spacing 0.22 → 0.24.
- Border-left 3 px steel; state chip on `--bg-1` with steel border.

## Palette preserved (NOC Light, exact)

`#F8FAFC`, `#E1E8F0`, `#D1D9E6`, `#38A169`, `#D69E2E`, `#E53E3E`,
`#3182CE`, `#B0BCCB`, `#1A202C`. No hex value retuned.

## Typography preserved (V1E-C readable scale)

`--fs-body` 15, `--fs-mono` 14, `--fs-table` 14, `--fs-meta` 13,
`--fs-eyebrow` 12, `--fs-panel-title` 13, `--fs-section` 14,
`--fs-brand` 15, `--fs-title` 22, `--fs-metric` 22. No reduction.
Readiness metric stayed at 18 px bold; column heads stayed at 12 px
bold but with stronger letter-spacing.

## Scheme system preserved

- Default: NOC Light (`<html data-scheme="noc-light">`) — unchanged.
- NOC Dark token block intact, untouched.

## Files changed

- `src/App.css` — control tokens, title strip, work-area vignette,
  panel module shell, empty-state pattern.
- `src/components/HomeEnvironmentCentre.css` — header toolbar, meta
  chips, readiness module shell, body-grid gutters, table polish,
  status pills, mode-rail disabled-module shell, env-summary callout.
- `src/App.tsx` — title-bar stage label `V1E-F`; replaced bare
  `<p className="panel-placeholder">` with structured
  `panel-empty` blocks in Mode Rail, Inspector, Status Strip.
- `src-tauri/src/lib.rs` — `ping.stage` `V1E-F`.
- `obsidian/stages/V1E-F-enterprise-polish.md` (new).
- `obsidian/ANTHRACITE_INDEX.md` — index entry.

No changes to: Environment Engine, persistence, readiness logic,
commands, TS API, Rust models, palette hex values, typography scale,
NOC Dark tokens, default scheme.

## Validation

- `cargo check` green.
- `cargo test --lib` 15 / 15 green.
- `pnpm typecheck` green.
- `pnpm build` green (152.18 kB JS, 12.72 kB CSS, 278 ms).
- `tools/ops-readiness.ps1` **READY** (13/13).

## Notes for future agents

- The shared control vocabulary (`--elev-*`, `--pad-*`) is the seed
  for forms, dialogues, and tables landing in later stages. Build on
  it; don't fork it.
- The empty-state pattern (`panel-empty` + `__rule` + `__caption`)
  is the canonical "intentional placeholder" for unbuilt surfaces.
  Reuse it before inventing a new one.
- The 14 px padded body-grid gutter is the convention for module
  separation inside a surface. The 1 px hairline gutter is reserved
  for top-level workspace shell.
- Module headers come in two flavours: **section** (accent bar +
  rule, used inside a panel) and **toolbar** (gradient bg + tick
  glyph, used at the top of a containing module like the env table).
- Status amber draws from the same hex as SLA Amber Alert and the
  operator-selection accent — intentional NOC convention; do not
  split them into separate hex values.
