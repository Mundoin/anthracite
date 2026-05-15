# V1E-C — NOC Light Palette + Readable Typography

- **Date:** 2026-05-15
- **Status:** Complete
- **Obeys:** `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` §10 (visual law),
  §11 #6 (no SaaS aesthetic). `docs/design/INDUSTRIAL_VISUAL_LAW.md`.

## Goal

Replace the V1E-B beige Graphite Light with Bujar's exact NOC Light
palette. Raise typography ~4–5 px across the visible app so the surface
is readable from normal monitor distance without losing density.

## Palette (exact, Bujar-supplied)

| Token              | Hex      | Role                              |
|--------------------|----------|-----------------------------------|
| `--bg-0`           | `#F8FAFC` | Console Base White                |
| `--bg-1`           | `#E1E8F0` | Analytics Hub Gray                |
| `--bg-2`           | `#D1D9E6` | Network Grid Steel (inset panel)  |
| `--line`           | `#D1D9E6` | Network Grid Steel hairline       |
| `--line-bright`    | `#B0BCCB` | Receding Metadata Gray (heavier)  |
| `--text-0`         | `#1A202C` | Authority Text Dark               |
| `--text-1`         | `#3a4252` | Secondary text                    |
| `--text-2`         | `#B0BCCB` | Receding Metadata Gray            |
| `--accent`         | `#3182CE` | Trace Analysis Blue (nav/action)  |
| `--accent-dim`     | `#c9dcef` | Active row fill                   |
| `--copper`         | `#D69E2E` | Operator selection accent / eyebrow |
| `--signal-healthy` | `#38A169` | Peak Fabric Green                 |
| `--signal-degraded`| `#D69E2E` | SLA Amber Alert                   |
| `--signal-offline` | `#E53E3E` | Total Fault Red                   |
| `--signal-unknown` | `#B0BCCB` | Receding Metadata Gray            |

All beige / warm-stone values from V1E-B removed.

## Typography (scheme-owned scale)

| Token                | V1E-B (effective) | V1E-C |
|----------------------|-------------------|-------|
| `--fs-body` (body)   | ~11 px            | 15 px |
| `--fs-table` (cells) | 11 px             | 14 px |
| `--fs-meta`          | 11 px             | 13 px |
| `--fs-eyebrow`       | 10 px             | 12 px |
| `--fs-panel-title`   | 10 px             | 13 px |
| `--fs-section`       | 10 px             | 14 px |
| `--fs-brand`         | 12 px             | 15 px |
| `--fs-title`         | 18 px             | 22 px |
| `--fs-metric`        | 18 px             | 22 px |

Headings now bolder (`font-weight: 700` on panel/section titles).
Status pill text bumped 10→12 px + bold. Mode-rail labels 11→13 px.
Readiness band metric numbers 13→16 px. Active table row 11→14 px.
Line-height set to 1.45 on body. Padding stepped up where text grew
(panels 14×16 px, headers 16/20 px) so density stays controlled.

## Naming changes

- Scheme attribute: `data-scheme="graphite-light"` → `data-scheme="noc-light"`.
- Titlebar text: `stage V1E-B · scheme Graphite Light` →
  `stage V1E-C · scheme NOC Light`.
- Rust `ping.stage`: `V1E-B` → `V1E-C`.

## Files changed

- `src/App.css` — full palette swap + typography scale tokens.
- `src/components/HomeEnvironmentCentre.css` — rewritten to consume
  scheme tokens, larger font sizes, larger paddings.
- `src/App.tsx` — titlebar label.
- `index.html` — scheme attribute.
- `src-tauri/src/lib.rs` — `ping.stage`.
- `obsidian/stages/V1E-C-noc-light.md` (new).
- `obsidian/ANTHRACITE_INDEX.md` — index entry.

## Validation

- `cargo check` green.
- `cargo test --lib` 15 / 15 green.
- `pnpm typecheck` green.
- `pnpm build` green (151.77 kB JS, 8.33 kB CSS, 273 ms).
- `tools/ops-readiness.ps1` **READY** (13/13).

## Out of scope

- Environment Engine, persistence, readiness logic, command surface,
  TS API — unchanged.
- Inventory, discovery, monitoring, topology, auth — out.
- Mode bodies — still placeholder.

## Notes for future agents

- The NOC palette is exact and operator-recognised. Do not retune hex
  values without Bujar's explicit instruction.
- Status colours map to roles: Peak Fabric Green = healthy, SLA Amber
  Alert = degraded, Total Fault Red = offline, Receding Metadata Gray =
  unknown. Never use them decoratively.
- Trace Analysis Blue (`--accent`) is for nav/action focus only.
- Typography scale lives in the scheme tokens. Components consume; do
  not hardcode `font-size` in pixels in component CSS for body text.
