# Anthracite — Topology Hardware Desk · Design Board

OCC implementation package for the topology workspace's visual language.

---

## Purpose

Anthracite Topology Hardware Desk design package.

## Design intent

A topology map where 2D glyph nodes are collapsed procedural hardware
primitives, and double-click opens a generated 3D inspection view.

## Core rule

**All hardware is parameter-generated. Bitmaps are reference/export only.**

## Sheets

- **2D-01** — 8 topology node families, state rings, zoom behavior, focus
  treatment.
- **3D-01** — 6 procedural hardware primitive families, faceplate rules,
  pickable zones.
- **IXN-01** — map → click → transition → orbit → port interaction
  storyboard.

## Package layout

```
anthracite-topology-hardware-desk-design-board/
  README.md                          ← you are here
  MANIFEST.md                        ← per-file index

  preview/
    index.html                       ← standalone preview, no build step
    topology-desk.css                ← full stylesheet
    topology-desk.tokens.css         ← tokens only (OCC consumes this)
    assets/                          ← intentionally near-empty (see NOTE)

  sheets/
    README.txt                       ← drop the three exported PNGs here
    2D-01-topology-node-families.png
    3D-01-hardware-primitive-family.png
    IXN-01-interaction-storyboard.png

  contracts/
    hardware-primitive-contract.md
    topology-node-family-contract.md
    pickable-zone-taxonomy.md
    role-to-glyph-to-primitive-map.md
    density-and-zoom-rules.md
    interaction-state-machine.md
    babylon-implementation-notes.md

  source/
    original-html-source.html        ← Anthracite Topology Desk.html
    original-css-source.css          ← styles/topology-desk.css
    topology-2d-nodes.jsx            ← Sheet 2D-01 source
    topology-3d-primitives.jsx       ← Sheet 3D-01 source
    topology-storyboard.jsx          ← Sheet IXN-01 source
    design-canvas.jsx                ← canvas host (DesignCanvas / DCSection / DCArtboard)
```

## How to use this package

1. **Open** `preview/index.html` in any modern browser. No build, no
   bundler, no install. React + Babel are loaded from a CDN at integrity-
   pinned versions. The three sheets render at their native pixel sizes
   on a pannable design canvas.
2. **Read the contracts** in order:
   `hardware-primitive-contract.md` → `topology-node-family-contract.md`
   → `pickable-zone-taxonomy.md` → `role-to-glyph-to-primitive-map.md`
   → `density-and-zoom-rules.md` → `interaction-state-machine.md` →
   `babylon-implementation-notes.md`.
3. **Lift tokens** from `preview/topology-desk.tokens.css` into the OCC
   stylesheet. Do not redefine downstream.
4. **Treat the .jsx sources as the source of truth**, the PNG sheets as
   reference. Re-export the sheets from React if anything drifts.

## Verifier

- HTML preview opens
- CSS loads
- all sheets exported (drop into `sheets/`)
- all contracts included
- package ready for OCC implementation

---

Scope: packaging/export only. The implementation repo
(`D:\Repos\anthracite`) is untouched.
