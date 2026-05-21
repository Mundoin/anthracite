# Anthracite · D3 package

Drop-in deliverable for the **D3 navigation arc**. Companion to commit `0585c75 stage-d1ba`. Lay this folder over the repo root and the paths land at canonical homes.

---

## What's in here

```
d3-package/
├── README.md                                 ← you are here
├── docs/
│   └── design/
│       ├── D3_NAV_SPEC.md                    ← implementation-ready navigation spec
│       └── D1B_PLAN.md                       ← primitives review (AnthButton, Surface,
│                                               ActionTile, AnthIcon, Chip) + forward plan
└── design-review/
    └── D3 Review.html                        ← self-contained visual board (offline)
```

### `docs/design/D3_NAV_SPEC.md`

The binding artifact. Implementation-ready spec for OCC. Sections:

- §0 Status — two equal navigation paths accepted.
- §1 Scope &amp; non-goals — explicit boundary notes.
- §2 Mode catalogue contract — full TS interface + the accepted catalogue tree.
- §3 ModeRail — anatomy (expanded + collapsed) + behaviour.
- §4 Context Sidebar — anatomy + behaviour + tree rendering rules.
- §5 Main Canvas — the navigation-never-spills guarantee.
- §6 Keyboard &amp; focus contracts.
- §7 Cortex jump — scope chips, catalogue adapter, mode hot-keys.
- §8 Narrow-viewport fallback (&lt; 1100 px → Concept B).
- §9 Honest states &amp; badge propagation.
- §10 **OCC acceptance checklist** (the gate OCC tests against).
- §11 Proposed component split.
- §12 Boundary notes recap.

Drop into `docs/design/D3_NAV_SPEC.md` next to `INDUSTRIAL_VISUAL_LAW.md` and `ANTHRACITE_V1_SOURCE_OF_TRUTH.md`.

### `docs/design/D1B_PLAN.md`

The D1B primitives review and forward plan. Companion to D3 — it covers the visual layer the navigation sits on. Key headlines: blue/green token doctrine confirmed, AnthButton taxonomy collapse proposal, iconRegistry split into 7 domain files. Drop alongside the spec for context.

### `design-review/D3 Review.html`

The visual design package as a single self-contained HTML file. **No network required, no asset folder.** Open it in any modern browser; pan/zoom the design canvas. Eight artboards:

1. Cover &amp; doctrine
2. AnthButton (variants × sizes × states)
3. Surface (variants × paddings + composition)
4. ActionTile + Chip
5. AnthIcon &amp; registry split plan
6. **D3 Navigation spec — final direction (the 8 binding frames)**
7. _(legacy)_ — same artboard, included for the D2 dashboard card spec
8. _(legacy)_ — same artboard

This is the design artefact, not the implementation. Keep it under `design-review/` or wherever your team stores design captures.

---

## How to land this

1. **Read first.** `D3_NAV_SPEC.md` is the contract OCC implements against. `D1B_PLAN.md` is the primitives context.
2. **File the docs.** Copy `docs/design/*.md` into the repo at the same path. They sit next to existing design law docs.
3. **Park the review board.** `design-review/D3 Review.html` is reference material — keep it findable but it does not affect the build.
4. **Decide on `src/contracts/modeCatalogue.ts`.** The spec contains the TypeScript interface and the accepted catalogue tree verbatim. OCC types this up; this package intentionally does not ship the .ts file (no production code per the D3 brief).
5. **Land the work in OCC stages** — each stage names the sections of the spec it obeys.

---

## Boundary notes (recap from spec §1, §12)

- No feature implementation for Devices / Events / Provisioning children. Catalogue entries may exist before surfaces do.
- No new engines. No Rust. No persistence. No Topology 3D. No App.css retirement.
- D2 dashboard card spec is preserved unchanged.
- Existing testids are preserved; navigation adds new ones under `nav-*` / `cortex-*`.

---

## Stack alignment

- Visual layer obeys `INDUSTRIAL_VISUAL_LAW.md`.
- Mode model obeys `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` §5 with **the §5 list flagged for amendment** — the accepted D3 catalogue contains 14 modes vs the §5 canonical 7. The catalogue evolution is explicitly accepted; the SoT amendment is a doctrine question for Bujar.
- New primitives still live under `src/components/shared/` (D1B-A). Navigation components are proposed at `src/components/navigation/` and `src/components/cortex/`.
- App.css retirement remains sweep-later.

---

## Anchor

Repo state: **`0585c75 stage-d1ba: align button action token semantics`**.
Doctrine alignment: SoT §5 (modes), §6 (engine/API), §10 (visual law), §11 (non-negotiables).
Companion law: `docs/design/INDUSTRIAL_VISUAL_LAW.md`.
