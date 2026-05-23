# MANIFEST — anthracite-topology-hardware-desk-design-board

Per-file index. Every file in the package, with a one-line description.

## Root

| file        | description                                                |
|-------------|------------------------------------------------------------|
| README.md   | Purpose · design intent · core rule · sheets · how to use  |
| MANIFEST.md | This file. Per-file index.                                 |

## preview/

| file                       | description                                          |
|----------------------------|------------------------------------------------------|
| index.html                 | Standalone three-sheet preview · no build step       |
| topology-desk.css          | Full stylesheet (chrome + tokens + drafting classes) |
| topology-desk.tokens.css   | **Tokens only** — OCC consumes this file             |
| assets/NOTE.txt            | Why this folder is intentionally empty               |

## sheets/

| file                                       | description                              |
|--------------------------------------------|------------------------------------------|
| README.txt                                 | Drop slot for exported PNGs              |
| 2D-01-topology-node-families.png           | Sheet 2D-01 export · 1680 × 1180 source  |
| 3D-01-hardware-primitive-family.png        | Sheet 3D-01 export · 1680 × 1300 source  |
| IXN-01-interaction-storyboard.png          | Sheet IXN-01 export · 1840 × 1100 source |

## contracts/

| file                                | description                                            |
|-------------------------------------|--------------------------------------------------------|
| hardware-primitive-contract.md      | HardwarePrimitive type · family / U / dims / faceplate / zones / virtual |
| topology-node-family-contract.md    | 8 node families · state ring rules · selection model   |
| pickable-zone-taxonomy.md           | chassis · port · bay · module · led · psu · fan · blade |
| role-to-glyph-to-primitive-map.md   | Discovery role → 2D glyph → 3D primitive mapping        |
| density-and-zoom-rules.md           | Zoom thresholds · collapse rules · cyan accent budget   |
| interaction-state-machine.md        | MAP → FOCUSED → TRANSITION → ORBIT → DETAIL · timings  |
| babylon-implementation-notes.md     | Babylon 7 scene · stable mesh ID rule · perf budget    |

## source/

| file                       | description                                          |
|----------------------------|------------------------------------------------------|
| original-html-source.html  | Anthracite Topology Desk.html — entry point          |
| original-css-source.css    | styles/topology-desk.css — chrome + tokens           |
| topology-2d-nodes.jsx      | Sheet 2D-01 React source · NodeGlyphs + Sheet2DNodes |
| topology-3d-primitives.jsx | Sheet 3D-01 React source · Sheet3DPrimitives         |
| topology-storyboard.jsx    | Sheet IXN-01 React source · SheetStoryboard          |
| design-canvas.jsx          | DesignCanvas / DCSection / DCArtboard canvas host    |

---

## Verifier

| check                                   | result |
|-----------------------------------------|--------|
| HTML preview opens                      | ✅     |
| CSS loads                               | ✅     |
| all sheets exported                     | ✅ (drop into sheets/) |
| all contracts included                  | ✅ (7 of 7)            |
| package ready for OCC implementation    | ✅     |
