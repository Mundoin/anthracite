# TOKENS · Anthracite Master design tokens

The visual contract for the port. Lift these verbatim into your real React+TS codebase.

## Palette · NOC Light

Anthracite uses the familiar Arista/Cisco/NOC light family. The palette is **fixed** — no theme remaps, no accent recoloring of status values.

### Surfaces

| Token                    | Hex       | Use                                                |
|--------------------------|-----------|----------------------------------------------------|
| `--anth-bg-app`          | `#F8FAFC` | App canvas · mode rail bg                          |
| `--anth-bg-panel`        | `#FFFFFF` | Panels · tables · cards                            |
| `--anth-bg-sunken`       | `#F1F5F9` | Table headers · inset wells · key/value blocks     |
| `--anth-bg-hover`        | `#EEF2F7` | Hover state for rows and buttons                   |
| `--anth-bg-selected`     | `#E6EEF8` | Active row · selected nav item · active tab       |
| `--anth-bg-titlebar`     | `#FFFFFF` | Titlebar                                            |
| `--anth-bg-statusbar`    | `#F1F5F9` | Status bar · collapsed ops dock                     |

### Borders

| Token                    | Hex       | Use                                                |
|--------------------------|-----------|----------------------------------------------------|
| `--anth-border`          | `#E1E8F0` | Default hairline (1 px)                            |
| `--anth-border-strong`   | `#D1D9E6` | Form controls · floating panels · strong dividers  |
| `--anth-border-focus`    | `#3182CE` | Active input · focused field                       |

### Text

| Token                    | Hex       | Use                                                |
|--------------------------|-----------|----------------------------------------------------|
| `--anth-text`            | `#1A202C` | Primary body text                                  |
| `--anth-text-2`          | `#4A5567` | Secondary text · table cells                       |
| `--anth-text-3`          | `#6B7585` | Tertiary · subtitles · meta                        |
| `--anth-text-muted`      | `#B0BCCB` | Muted · placeholders · disabled                    |
| `--anth-text-inverse`    | `#F8FAFC` | On dark surfaces                                   |

### Status — FIXED, non-themeable

| Semantic | Token              | Hex       | Tint background           |
|----------|--------------------|-----------|---------------------------|
| ok       | `--anth-ok`        | `#38A169` | `--anth-ok-tint`   `#E7F4EC` |
| warn     | `--anth-warn`      | `#D69E2E` | `--anth-warn-tint` `#FAF1DD` |
| err      | `--anth-err`       | `#E53E3E` | `--anth-err-tint`  `#FBE6E6` |
| info     | `--anth-info`      | `#3182CE` | `--anth-info-tint` `#E1ECF7` |
| idle     | `--anth-text-muted`| `#B0BCCB` | `--anth-bg-sunken` `#F1F5F9` |

Tinted chips use a darker matching ink — `ok #1F6E3F`, `warn #8A5A0A`, `err #9B1C1C`, `info #1E4A82` — for legibility against the tint.

### Accent

| Token                    | Hex       | Use                                                |
|--------------------------|-----------|----------------------------------------------------|
| `--anth-accent`          | `#1A202C` | Primary button · device hero plinth · brand mark   |
| `--anth-accent-ink`      | `#F8FAFC` | Ink on `--anth-accent`                              |

Only one brand-derived accent — anthracite-black. The interface is mostly grey + status colour. Don't add new accent hues during the port.

## Typography

### Stack

```css
--anth-font-ui:      "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, sans-serif;
--anth-font-display: "Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif;
--anth-font-mono:    "Cascadia Mono", "Cascadia Code", "Consolas", ui-monospace, monospace;
```

Windows-first. **No web font loading.** If Segoe UI Variable isn't present, fall back gracefully — the metrics are designed against the legacy Segoe UI as a safety net.

### Scale

Sizes are deliberate. Density does not shrink type.

| Role               | px    | Weight   | Notes                                             |
|--------------------|-------|----------|---------------------------------------------------|
| Hero numeric (KPI) | 22    | 600      | Mono · tnum                                       |
| Section header     | 15–16 | 600–700  | Display stack                                     |
| Default body       | 12.5  | 400–500  | UI default                                        |
| Table cell         | 12    | 400      | UI                                                |
| Table cell · mono  | 11.5  | 400      | Mono · tnum, zero stylistic alt                   |
| Micro label        | 10.5  | 600      | 0.06em letter-spacing · uppercase · `--anth-text-3` |
| Caption / meta     | 10–11 | 400      | `--anth-text-3`                                   |
| Keyboard hint      | 10.5  | 400      | Mono · 1 px bottom border                         |
| Floor              | 10    | —        | Never go smaller for operator-facing copy         |

Default `body` line-height is **1.35**. Tables use a tighter rhythm (row height controls visual line-height).

### Features

```css
font-feature-settings: "ss01", "cv11", "tnum";
```

`tnum` (tabular numerics) is on by default. Numeric columns and KPIs are always mono + tabular for column alignment.

## Density · row heights

Two settings. Both keep type sizes constant; only row height varies.

| Setting       | Token (px)            | Row height | Used in        |
|---------------|-----------------------|------------|----------------|
| compact       | `--anth-row-compact`  | 24         | dense tables, environment lists with many rows |
| comfortable   | `--anth-row`          | 30         | default for most surfaces                       |
| comfy         | `--anth-row-comfy`    | 36         | available but not used by default               |

Tables hot-swap by setting `--anth-row` on the panel; do not rebuild rows when toggling.

## Shell rhythm

### Heights

| Element        | Height (px) | Notes                                            |
|----------------|-------------|--------------------------------------------------|
| Titlebar       | 36          | Brand · env switcher · breadcrumb · Cortex · win |
| Sub-nav        | 34          | Segmented control under titlebar                 |
| Status bar     | 24          | Always-on, mono, low contrast                    |
| Ops dock · collapsed | 28    | Strip above status bar                           |
| Ops dock · expanded  | 220   | Terminal on dark background                      |

### Widths

| Element             | Width (px)   | Notes                                  |
|---------------------|--------------|----------------------------------------|
| Mode rail · labeled | 196          | Default                                |
| Mode rail · icons   | 56           | Collapsed                              |
| Secondary nav       | 220          | Only for object-list modes             |
| Inspector · right   | 340          | Default for non-canvas modes           |
| Inspector · bottom  | full × 260   | Default for canvas modes               |
| Inspector · floating| 320 × variable | Operator-positioned compare windows  |

### Radii

| Token            | px | Use                                         |
|------------------|----|---------------------------------------------|
| `--anth-r-sm`    | 3  | Tags · chips · table cells                  |
| `--anth-r-md`    | 4  | Buttons · panels · cards · inputs           |
| `--anth-r-lg`    | 6  | Modals · pop-out windows                    |

This is a flat workstation, not a SaaS dashboard. Keep radii small.

### Elevation

```css
--anth-shadow-sm:  0 1px 0 rgba(26,32,44,0.04), 0 0 0 1px var(--anth-border);
--anth-shadow-md:  0 1px 2px rgba(26,32,44,0.04), 0 4px 14px rgba(26,32,44,0.06);
--anth-shadow-pop: 0 10px 28px rgba(26,32,44,0.14), 0 0 0 1px var(--anth-border-strong);
```

Use shadow-sm for floating chips inside the canvas; shadow-md for hover-elevated panels; shadow-pop only for modal-class overlays (Cortex, floating inspector). **Never** decorative shadows on default panels.

## Atoms

### Status dot

6 × 6 px circle, semantic colour, no outline. Used in dense rows where a chip would be too heavy.

### Status chip

18 × variable, 2 px radius, tint background + matching ink. Always uppercase, 0.04em letter-spacing, 10.5 px. Used in standalone contexts (env hero, table state cells).

### Sparkline

28 px tall default, 1.4 px stroke, 12% fill below the line. Coloured to match the metric's mood (info for neutral, ok for positive trend, err for negative).

### Buttons

26 px height default · 22 px for `sm`. Border 1 px `--anth-border-strong`. Primary uses `--anth-accent`. Ghost has no border until hover. No gradient buttons. No icon-only buttons larger than 28 × 28.

### Keyboard hints

10.5 px, mono, 1 px border with 1.5 px bottom border (slight shadow effect), 3 px radius. Background `--anth-bg-panel`.

## Status timeline

```
ok  — green        operator-trusted "everything observed is healthy"
warn— amber        operator-attention "something needs review, not a crisis"
err — red          operator-action  "something is broken or unsafe"
info— blue         neutral facts, polling cycles, baselines loaded
idle— grey         disabled, paused, maintenance window, no data
```

Anything else (purple, teal, pink) is **not** in the palette and must not appear in the port.

## Accessibility floor

- Minimum interactive hit target: 26 px (button/dot row). Smaller affordances (status dots) are visual-only, not interactive.
- All status colours pair with text or icon; never colour alone (chip has text, dot pairs with adjacent label).
- Focus ring: 2 px outline using `--anth-border-focus` with `outline-offset: 1px`. Visible on every focusable element. Don't suppress.
- Text contrast: primary body (`--anth-text` on `--anth-bg-panel`) is 12.6:1. Muted text (`--anth-text-3` on `--anth-bg-panel`) is 4.9:1. Stay above 4.5:1 for any operator-readable text.
