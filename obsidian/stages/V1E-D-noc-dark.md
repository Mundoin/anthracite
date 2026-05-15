# V1E-D — NOC Dark Scheme (Alternate, Not Default)

- **Date:** 2026-05-15
- **Status:** Complete
- **Obeys:** `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` §10 (visual law),
  §11 #6 (no SaaS aesthetic). `docs/design/INDUSTRIAL_VISUAL_LAW.md`.

## Goal

Add Bujar's NOC Dark palette as a proper alternate scheme. Default
opening scheme remains **NOC Light** (V1E-C). NOC Dark activates only
when an operator (or future setting) sets
`<html data-scheme="noc-dark">`.

## Dark palette token mapping (exact, Bujar-supplied)

| Token              | Hex      | Role                              |
|--------------------|----------|-----------------------------------|
| `--bg-0`           | `#0A0E17` | Deep Obsidian Navy                |
| `--bg-1`           | `#121824` | Slate Carbon (panel)              |
| `--bg-2`           | `#1F293D` | Low-contrast Steel (inset panel)  |
| `--line`           | `#1F293D` | Low-contrast Steel hairline       |
| `--line-bright`    | `#2E3D52` | Inactive Edge (heavier border)    |
| `--text-0`         | `#E2E8F0` | Primary Text Header (off-white)   |
| `--text-1`         | `#B6C2D2` | Secondary text                    |
| `--text-2`         | `#2E3D52` | Inactive Edge (muted metadata)    |
| `--accent`         | `#00E5FF` | Electric Cyan (nav/action)        |
| `--accent-dim`     | `#16384a` | Cyan-tinted active row fill       |
| `--copper`         | `#FFD000` | High-Visibility Amber (eyebrow / active marker) |
| `--signal-healthy` | `#00FF9D` | Cyber Mint                        |
| `--signal-degraded`| `#FFD000` | High-Visibility Amber             |
| `--signal-offline` | `#FF3366` | Crimson Alert                     |
| `--signal-unknown` | `#2E3D52` | Inactive Edge                     |

Implementation: a single `[data-scheme="noc-dark"]` block appended in
`src/App.css`. Typography scale and component CSS are shared with NOC
Light — components consume tokens, schemes redefine them. No microtext
regression.

## Default scheme preservation

- `index.html` still carries `<html data-scheme="noc-light">` —
  **unchanged this slice**.
- `:root` defaults (= NOC Light) **unchanged**.
- Titlebar label, Rust `ping.stage` — **unchanged**.

To activate NOC Dark for a session, set
`<html data-scheme="noc-dark">` (or, later, an operator setting that
flips the attribute at runtime). Switching back to NOC Light is the
inverse.

## Files changed

- `src/App.css` — new `[data-scheme="noc-dark"]` token block.
- `obsidian/stages/V1E-D-noc-dark.md` (new).
- `obsidian/ANTHRACITE_INDEX.md` — index entry.

No changes to: Environment Engine, persistence, readiness, command
surface, TS API, layout, typography scale, default scheme.

## Validation

- `cargo check` green.
- `cargo test --lib` 15 / 15 green.
- `pnpm typecheck` green.
- `pnpm build` green (151.77 kB JS, 8.65 kB CSS, 272 ms).
- `tools/ops-readiness.ps1` **READY** (13/13).

## Notes for future agents

- NOC Dark hex values are exact and operator-recognised. Do not retune.
- Status roles map: Cyber Mint = healthy, High-Visibility Amber =
  degraded, Crimson Alert = offline, Inactive Edge = unknown.
- Electric Cyan (`--accent`) is reserved for discovery / data
  emphasis — navigation, action focus, active selection indicators.
  Never used for status.
- Inactive Edge (`--text-2`) doubles as the muted metadata text colour
  and the unknown-status colour — intentional, mirrors NOC convention.
- Default scheme switching requires Bujar's explicit approval — do not
  flip `<html data-scheme="...">` in a future slice without instruction.
