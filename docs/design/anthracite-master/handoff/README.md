# Anthracite Master — handoff package

This folder is everything you need to port **Direction D · Anthracite Master** into the real Tauri v2 + React + TypeScript + Rust + Babylon.js codebase. Self-contained — no references to the parent project.

## What's inside

```
handoff/
├── README.md                   ← you are here
├── PORTING.md                  ← component → real React surface map
├── TOKENS.md                   ← design tokens spec (palette, type, density, etc.)
├── preview.html                ← runnable: pick any of D1–D12, live tweaks
└── src/
    ├── styles/
    │   ├── tokens.css          ← NOC Light palette + type/density tokens
    │   └── shell.css           ← shell primitives (rail, titlebar, panels, tables…)
    ├── components/
    │   ├── icons.jsx           ← stroke icon set + Anthracite mark
    │   ├── shell.jsx           ← TitleBar/ModeRail/StatusBar/Spark/Cortex + mock data
    │   └── master.jsx          ← Direction D primitives: MasterTitleBar, MasterModeRail,
    │                              MasterSubNav, MasterSecondaryNav, MasterInspector,
    │                              MasterOpsDock, MasterShell, MasterCortex
    └── directions/
        ├── master-frames.jsx   ← D1 Env list · D2 Env detail · D3 Operate
        ├── master-frames-2.jsx ← D4 Topology · D5 Diagnose · D6 Build
        └── master-frames-3.jsx ← D7 Assess · D8 Empty · D9 Loading · D10 Error
                                  D11 Cortex behaviours · D12 Inspector patterns
```

The `src/` JSX uses inline React via Babel-standalone in the browser. That's fine for design preview but **not** what you ship — the port is real React+TS modules. See `PORTING.md`.

## How to use this package

1. **Look around.** Open `preview.html` in any browser. Top bar picks D1–D12. Right-side **Tweaks** panel flips rail style / density / inspector dock / secondary nav / ops console live across every frame.
2. **Read the system.** `TOKENS.md` is the visual contract. Lift those values verbatim. `PORTING.md` walks each primitive and frame to the real React surface it should become.
3. **Port.** Recreate the primitives in `src/components/master.jsx` as real React components in your codebase, wired to your store + Tauri commands. The frame files are reference markup — re-implement, don't lift.

## Non-negotiables

These are the rules the design enforces. Don't drift on them during the port.

- **Status colour semantics are fixed.** `ok` = #38A169, `warn` = #D69E2E, `err` = #E53E3E, `info` = #3182CE, `idle` = #B0BCCB. Never theme away. Operator trust hinges on this.
- **One inspector per shell.** Right-docked default · bottom drawer for wide canvases · floating pop-out for ad-hoc compare. Operator picks per mode and the choice persists per environment.
- **Cortex is always scoped.** Resolves against the active environment chip; `⇥` to change scope, `⇧⇥` to narrow.
- **Density is operator-controlled.** Two settings: `compact` (24 px rows) or `comfortable` (30 px rows). Type sizes do not change with density — only line heights.
- **Type stack is native Windows.** `Segoe UI Variable Text` for UI, `Cascadia Mono` for monospace. No web fonts. No Inter. No Roboto.
- **No emoji. No decorative iconography.** Icons must be utilitarian and stroke-based. The Anthracite mark is the only branded glyph.
- **Tables are dense by default.** Sub-readiness chips use colour to surface state at a glance. Monospace numerics with tabular-nums always.

## Frame index

| ID  | Surface                              | Notes                                                              |
|-----|--------------------------------------|--------------------------------------------------------------------|
| D1  | Environment Centre — list            | hybrid health ribbon + table, status semantics in chip columns     |
| D2  | Environment Centre — detail          | KPI strip · readiness-by-domain · open events · sites table        |
| D3  | Operate — live device                | hero · health grid · interfaces table · ops console expanded       |
| D4  | Topology — L3 underlay               | layer stack · minimap · selection inspector · 2D ▸ 3D Babylon hint |
| D5  | Diagnose — path trace                | hypothesis panel · timeline graph · streaming RIB/FIB ops console  |
| D6  | Build — config + diff                | jinja2 editor · baseline diff · arista-canon validator · rollout bar |
| D7  | Assess — readiness report            | gauge · domain breakdown · findings · 41-site heatmap · footer hash |
| D8  | Empty — no environments              | four entry routes, recommended highlighted                          |
| D9  | Loading — engine discovery           | progress wheel · workers panel · live rust-core log · non-blocking note |
| D10 | Error — environment isolated         | red banner · timeline of observations · suggested steps · engine log |
| D11 | Cortex behaviours                    | three modes: search · run (action) · scope-switch · contract notes  |
| D12 | Inspector patterns                   | right · bottom · floating side-by-side + default-per-mode table     |

## Versioning

This package is **Anthracite Master v0.14-handoff**. Treat the primitives as the spec; treat the frames as reference compositions. Frames will move during real implementation; primitives should not.
