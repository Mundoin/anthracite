# Industrial Visual Law — Anthracite V1

> Companion to `ANTHRACITE_V1_SOURCE_OF_TRUTH.md`.
> Visual quality is a **gate**, not a polish phase. Every visible stage
> must pass a screenshot review against this law before it merges.

---

## The law

Anthracite must feel **industrial-grade, heavy, premium, dense, and
operator-built**. WinBox-class seriousness + modern industrial command
centre + living network intelligence workstation.

If a screenshot of Anthracite, shown without context, can plausibly be
mistaken for a website, marketing page, SaaS dashboard, or a hobby app,
the screenshot fails. That is a hard fail.

---

## What Anthracite must NOT look like

- **Not a website.** No hero sections, no marketing whitespace, no
  decorative imagery, no centered title cards.
- **Not a SaaS dashboard.** No soft-card UI with rounded shadows and
  pastel accents. No "stats card grid".
- **Not a soft generic card UI.** No drop-shadowed floating cards as the
  primary container. Containers are rigid, framed, dense.
- **Not weak grey-on-grey.** No low-contrast minimalism. Operators read
  this all day; the eye must land hard on signal.
- **Not a toy topology canvas.** No floating spheres on a gradient
  background. Topology renders as a tool, not a tech demo.
- **Not a basement app.** No raw OS chrome, no default fonts, no missing
  paddings, no ad-hoc spacings. Industrial ≠ ugly.

---

## What Anthracite must look like

- **Dense Windows workstation feel.** Information per pixel is high.
  Tables, trees, status strips, mode rails. Padding is tight but
  deliberate.
- **Strong contrast.** Surfaces, foregrounds, accents read at a glance.
  Status colours are signal-grade, not pastel.
- **Compact mode rail.** Mode switcher is a permanent, narrow vertical
  rail (or equivalent), not a top hamburger.
- **Status bar.** Persistent bottom bar with environment, operator,
  build/version, and live signal counts.
- **Proper tables, trees, tabs, context menus.** First-class. No
  improvised list components.
- **Command centre home.** HOME is dense, scannable, full-window. No
  marketing-grade title block.
- **Topology renders inside its panel.** Topology has chrome around it
  (layers, filters, legend), not a borderless canvas.

---

## Visual direction

- **Palette.** Industrial graphite / steel / copper, with high-signal
  accents (cyan for information state, amber for caution, red for fault,
  green sparingly for healthy). Avoid pastels. Avoid soft beige neutrals.
- **Typography.** Sans-serif for chrome, **monospace for data**. Numbers
  and IDs are always monospaced.
- **Density.** Default row height tight; padding deliberate; margins
  small. No website-grade air.
- **Edges.** Hairline borders, sharp corners on data containers, subtle
  bevels reserved for primary frames.
- **Iconography.** Line-weight icons, tool-grade. No illustrative or
  rounded-friendly icon sets.
- **Motion.** Functional only — selection, focus, transient state.
  Topology animation is signal, not flourish.

---

## Screenshot gate

Every visible stage produces a screenshot or short capture. Before merge:

1. Capture full window at 1440×900 minimum, default zoom, dark theme.
2. Capture the specific mode/panel/screen the stage changed.
3. Open both side-by-side against the previous approved capture.
4. Apply the checklist below.
5. If any item fails, the stage does not merge.

**Checklist (every screenshot must clear):**

- [ ] Could not be mistaken for a website or SaaS dashboard.
- [ ] HOME / mode shell visible as dense, framed, industrial chrome.
- [ ] Information density appropriate for a workstation.
- [ ] Contrast strong; signal colours land hard.
- [ ] Tables/trees/tabs render as first-class, not improvised.
- [ ] Topology (if visible) lives inside its panel with chrome.
- [ ] Status bar present where the layout calls for it.
- [ ] No drop-shadow card grid, no marketing whitespace, no centered
      hero block.
- [ ] Font discipline: sans for chrome, monospace for IDs/numbers.
- [ ] Visual mistakes do not push Tauri toward probation failure.

Approved captures are filed under `obsidian/screenshots/V1<x>/` with a
note linking the stage record.

---

## Authority

This law is enforced by Bujar at every stage. Claude and Codex propose,
Bujar approves. A stage that ships without a passing screenshot review is
considered unmerged regardless of green tests.
