# D3T — Anthracite Visual Theme Spec

Stage: D3T (Visual Themes)
Status: implementation in progress
Source-of-truth boards: committed under `design-review/` at `6ea90ce docs: add anthracite visual direction boards`.

## Source HTML files consulted

- `design-review/A _ Doctrine _ palette tokens.html`
- `design-review/B _ Doctrine _ palette tokens.html`
- `design-review/C _ Doctrine _ palette tokens.html`
- `design-review/A _ Full app shell _ Devices _ Inventory.html`
- `design-review/B _ Full app shell _ Devices _ Inventory.html`
- `design-review/C _ Full app shell _ Devices _ Inventory.html`
- `design-review/A | B | C _ Devices tree _ Selected device.html`
- `design-review/A | B | C _ Cortex overlay …`
- `design-review/A | B | C _ Operate dashboard …`
- `design-review/A | B | C _ Capability states _ domain accents _ strip.html`
- `design-review/B | C _ Provisioning tree _ Network provisioning.html`

Palette values extracted by hex/rgb scrape across the three Doctrine boards
(boards are minified single-line HTML with inline styles; CSS variables not
authored — colors live as inline `background`/`color` declarations).

## Theme ids

- `light-industrial`   — *Light Industrial* (default)
- `graphite-command`   — *Graphite Frame*
- `technical-blueprint`— *Technical Blueprint*

## Default theme

`light-industrial`. No persistence in this slice. Theme lives in memory at
runtime; `<html data-theme="light-industrial">` on app boot.

## Architecture

Token-driven. Three `[data-theme="…"]` blocks override the existing `:root`
token table in `src/styles/themes.css`. Shared component CSS keeps consuming
the same `--anth-*` variables. **No component forks.**

`src/contexts/ThemeContext.tsx` exposes `useTheme()` + `setTheme(id)`.
`src/main.tsx` mounts the provider and writes the attribute on
`document.documentElement` each time the theme changes.

## Token table per theme

All hex values extracted verbatim from the corresponding Doctrine board
(`#XXXXXX` from inline `style="background: rgb(…)"` payloads).

### light-industrial

| Token | Value |
|---|---|
| `--anth-bg-app`       | `#FAFAF8` |
| `--anth-bg-panel`     | `#FFFFFF` |
| `--anth-bg-sunken`    | `#ECEDEE` |
| `--anth-bg-hover`     | `#E4E5E8` |
| `--anth-bg-selected`  | `#D5DCE6` |
| `--anth-bg-titlebar`  | `#FFFFFF` |
| `--anth-bg-statusbar` | `#ECEDEE` |
| `--anth-border`        | `#E4E5E8` |
| `--anth-border-strong` | `#8B95A4` |
| `--anth-border-focus`  | `#4A78C7` |
| `--anth-text`         | `#1C1F25` |
| `--anth-text-2`       | `#2F333A` |
| `--anth-text-3`       | `#4A5567` |
| `--anth-text-muted`   | `#8B95A4` |
| `--anth-ok`           | `#2E8856` |
| `--anth-warn`         | `#C7892E` |
| `--anth-err`          | `#D03222` |
| `--anth-info`         | `#4A78C7` |
| `--anth-ok-tint`      | `#E2F0E7` |
| `--anth-warn-tint`    | `#FBF3E1` |
| `--anth-err-tint`     | `#FBE7E7` |
| `--anth-info-tint`    | `#E6EEF8` |
| `--anth-accent-action`| `#2E8856` |

### graphite-command

| Token | Value |
|---|---|
| `--anth-bg-app`       | `#0F1118` |
| `--anth-bg-panel`     | `#181B22` |
| `--anth-bg-sunken`    | `#1A1D24` |
| `--anth-bg-hover`     | `#232732` |
| `--anth-bg-selected`  | `#2A2F3D` |
| `--anth-bg-titlebar`  | `#181B22` |
| `--anth-bg-statusbar` | `#1A1D24` |
| `--anth-border`        | `#232732` |
| `--anth-border-strong` | `#6F7689` |
| `--anth-border-focus`  | `#5887FF` |
| `--anth-text`         | `#FBF8F2` |
| `--anth-text-2`       | `#E9E4D8` |
| `--anth-text-3`       | `#DFD7C6` |
| `--anth-text-muted`   | `#6F7689` |
| `--anth-ok`           | `#3DD17F` |
| `--anth-warn`         | `#EBA838` |
| `--anth-err`          | `#FF3D2A` |
| `--anth-info`         | `#5887FF` |
| `--anth-ok-tint`      | `#1F4A33` |
| `--anth-warn-tint`    | `#5A3F0C` |
| `--anth-err-tint`     | `#5E1F1F` |
| `--anth-info-tint`    | `#1F2A4A` |
| `--anth-accent-action`| `#3DD17F` |

Domain accents (orientation only — never status):
`teal #2DBDBE`, `violet #B58CFF`, `pink #FF6F8F`, `deep-teal #196E6F`.

### technical-blueprint

| Token | Value |
|---|---|
| `--anth-bg-app`       | `#FAFCFD` |
| `--anth-bg-panel`     | `#FFFFFF` |
| `--anth-bg-sunken`    | `#ECF1F4` |
| `--anth-bg-hover`     | `#E6EDF1` |
| `--anth-bg-selected`  | `#D3E6EE` |
| `--anth-bg-titlebar`  | `#FFFFFF` |
| `--anth-bg-statusbar` | `#ECF1F4` |
| `--anth-border`        | `#DDE6EC` |
| `--anth-border-strong` | `#7A8A95` |
| `--anth-border-focus`  | `#0E72A0` |
| `--anth-text`         | `#0E1E2C` |
| `--anth-text-2`       | `#074C6E` |
| `--anth-text-3`       | `#3E5A78` |
| `--anth-text-muted`   | `#7A8A95` |
| `--anth-ok`           | `#2C8456` |
| `--anth-warn`         | `#C77A0E` |
| `--anth-err`          | `#D32E2E` |
| `--anth-info`         | `#0E72A0` |
| `--anth-ok-tint`      | `#E2F0E7` |
| `--anth-warn-tint`    | `#FBF3E1` |
| `--anth-err-tint`     | `#FBE7E7` |
| `--anth-info-tint`    | `#BFD3E3` |
| `--anth-accent-action`| `#2C8456` |

## Component mapping

All themed surfaces consume the existing `--anth-*` tokens — no per-component
themed selectors. Touched component surfaces:

- `src/styles/shell.css` — ModeRail, AppShell chrome, statusbar/titlebar
- `src/components/navigation/ContextSidebar.css`
- `src/components/cortex/CortexOverlay.css`
- `src/components/dashboard/DashboardCard.css`

Tokens above flow into every D1/D2/D3 surface automatically because every
consumer already references `--anth-*`.

## State color rules

State semantics survive every theme (available/partial/deferred/blocked,
ok/warn/err/info). Each theme reskins the hue ramp but **never** swaps
semantics. Dark theme `*-tint` flips to a darker bed (e.g. `ok-tint #1F4A33`)
so legible ink is the bright token on a darker tint.

## Domain accent rules

Domain accents (teal, violet, pink) are orientation-only and live alongside
state colors — never used to indicate health. Reserved for the graphite-
command theme's per-domain rail stripe (Foundation/Run/Governance/Workshop)
and Cortex scope chips. Light themes use neutral borders for domain stripes.

## Theme selector behavior

- Lives in `SettingsMode` → "Display" section.
- Three radio rows (Industrial / Graphite / Blueprint).
- Selecting a theme calls `setTheme(id)`; provider writes
  `document.documentElement.dataset.theme = id` immediately.
- No persistence this slice (in-memory only).
- `testid` mapping:
  - `settings-theme-option-light-industrial`
  - `settings-theme-option-graphite-command`
  - `settings-theme-option-technical-blueprint`

## Acceptance checklist

- [x] `docs/design/D3T_THEME_SPEC.md` exists with source boards listed.
- [ ] Default theme = `light-industrial` (boot-time `data-theme` set).
- [ ] Settings renders all three theme choices with correct testids.
- [ ] Selecting `graphite-command` updates `<html data-theme>`.
- [ ] Selecting `technical-blueprint` updates `<html data-theme>`.
- [ ] ModeRail renders under each theme (smoke test).
- [ ] ContextSidebar renders under each theme.
- [ ] Cortex overlay renders under each theme.
- [ ] D2 dashboard renders under each theme.
- [ ] D2/D3A/D3B/D3C tests stay green.
- [ ] 5 gates pass: typecheck · test --run · build · cargo check · ops-readiness.

## Deviations / notes

- Boards authored colors as inline style hex/rgb — no CSS-variable
  contract published. Spec maps board values onto Anthracite's existing
  token names (the only stable contract consumers know).
- Dark-theme `*-tint` values are extrapolated where boards expressed tinted
  beds via rgba on dark surface. Chosen darker hues stay within the board's
  emitted color set.
- `*-ink` values derive from the inverse text token of the active theme
  unless a board specifies otherwise; both light themes keep their existing
  `*-ink` tokens.
