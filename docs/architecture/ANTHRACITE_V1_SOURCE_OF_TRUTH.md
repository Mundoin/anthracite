# Anthracite V1 — Source of Truth

> **This document is doctrine.** Every stage, every PR, every agent prompt
> obeys it. Earlier framing in `README.md`, `PRODUCT.md`, and `GOALS.md` is
> superseded where it conflicts with this file.

---

## 1. Product Identity

**Anthracite** is a local-first, single-operator **network intelligence
workstation** for senior network engineers running real, multi-vendor
production estates. It is industrial Windows software. It is not a SaaS app,
not a dashboard, not a website wrapped in a window.

Old Anthracite (the PyQt prototype under `D:\Repos\_NEXUS`) is a **real,
working product** with multiple modes, deterministic engines, vendor
coverage, discovery, topology, diagnostics, config generation, Forge,
Sentinel, Cortex, and an assessment workflow. Anthracite V1 exists to
**rebuild that product cleanly** with a modern stack, typed APIs,
deterministic engines, and industrial-grade visual quality — not to invent
a new product.

---

## 2. What Anthracite V1 IS

- A **mode-based operator workstation**. Operators move between named modes
  (BUILD, OPERATE, DIAGNOSE, INTELLIGENCE, FORGE, ASSESS) from a HOME /
  Environment Command Centre.
- **Engine-first.** All capability lives in deterministic engines behind
  typed APIs. Modes are surfaces over engines.
- **Deterministic.** Same inputs → same outputs. Testable. Auditable.
  Reproducible.
- **Local-first.** Single workstation, local persistence, no cloud
  dependency for core function.
- **Multi-vendor.** Vendor model is data, not code branches in screens.
- **Windows-first**, desktop-native feel.

---

## 3. What Anthracite V1 IS NOT

- **Not a topology-first product.** Topology is an artifact rendered by one
  surface — **it is not the front door**. Anthracite opens into an operator
  HOME / Environment Command Centre. The "topology is the crown jewel"
  framing in older docs is **deprecated** by this source of truth.
- **Not AI/LLM-driven.** No LLM is in the product critical path in V1. No
  fuzzy reasoning inside engines. AI/Cortex-style reasoning may return
  later, gated, deterministic at its edges. For V1 it is out of scope.
- **Not a SaaS dashboard.** No soft cards, no marketing-grade chrome.
- **Not a port** of the PyQt repo. Code from `_NEXUS` is **not** copied.
  The old repo is product reference truth, never source code truth.
- **Not feature-first.** No isolated screens with private logic.

---

## 4. Deterministic-Only Rule

Product logic is deterministic. No probabilistic model, no LLM inference,
no fuzzy heuristic, no "AI suggestion" lives inside an engine in V1.
Hypotheses in DIAGNOSE are rule-driven from typed evidence. Any
non-deterministic component (e.g. future Cortex) must sit **outside** the
engine boundary and feed determinable artifacts back in.

---

## 5. Mode-Based Workstation Model

Operators work in **modes**. Modes are operator surfaces; they own
presentation and workflow, never domain logic. The set of V1 modes is
fixed by this document. Inventing a new mode requires updating this file
first.

Canonical modes (V1):

- **HOME / WELCOME / Environment Command Centre** — entry, environment
  selection, operator session bootstrap, recent activity, mode launcher.
- **BUILD / Architect's Desk** — design and authoring of network intent.
- **OPERATE / War Room** — live operations, posture, day-to-day control.
- **DIAGNOSE / INVESTIGATE / Forensic Lab** — evidence collection,
  hypotheses, structured investigation.
- **INTELLIGENCE / Forge Library** — knowledge artifacts, browsable
  intelligence, references.
- **FORGE / Interactive Protocol Workshop** — interactive authoring of
  protocols, playbooks, generated artifacts.
- **ASSESS / One-Button Assessment** — orchestrated end-to-end network
  assessment workflow that consumes most engines.

**ASSESS** is a major top-level workflow. Whether ASSESS also surfaces as
a persistent top-bar status indicator alongside mode navigation is **left
open** for a later decision; this document does not commit to that yet.

---

## 6. Engine and API First Rule

- Engines own data and logic.
- Modes own presentation and workflow over those engines.
- All cross-boundary calls go through **typed APIs** (Rust ↔ TS bridge).
- No engine is mode-private if another mode will need the same capability
  later. If two modes need the same fact, the fact lives in an engine.
- No screen reaches around an engine. No "just this once" shortcuts.

See `ENGINE_AND_API_BOUNDARIES.md` for the engine roster and contracts.

---

## 7. Old Anthracite Reality (Reference Truth)

The PyQt repo and the `ObsidianAnthracite` vault hold the product reality
that V1 is rebuilding to:

- WELCOME landing screen, title bar, Cortex/search, environment selector,
  theme toggle, left mode switcher, stacked mode body.
- No confirmed hard login gate in the archive.
- Real working capability across BUILD, OPERATE, DIAGNOSE/INVESTIGATE,
  INTELLIGENCE/Forge Library, FORGE, and ASSESS.

V1 honors that surface and capability map. It does **not** copy code from
it. It does **not** invent capability beyond it. Departures from the old
product require an explicit decision record under `obsidian/decisions/`.

---

## 8. V1 Rebuild Reason

- Old UI looks dated.
- Old architecture mixes UI and logic in ways that resist clean reuse.
- Need typed APIs, deterministic engines, industrial-grade visuals.
- Need a stack that survives a 5+ year product life.

V1 is a clean-room rebuild driven by the old product's behaviour, not its
code.

---

## 9. Stack Acceptance (probation)

Locked stack for V1:

- **Tauri 2** (Rust + WebView2) — on probation. See
  `STACK_DECISION_TAURI_PROBATION.md`.
- **Rust** owns deterministic engines and APIs.
- **React + TypeScript** owns operator UI.
- **Babylon.js** renders topology only. Babylon does **not** own topology
  truth.
- **pnpm** is the only package manager.
- Windows-first desktop.

Tauri remains only if Anthracite can credibly feel like industrial Windows
software at every visual checkpoint.

---

## 10. Visual Law (summary)

Anthracite must feel **industrial-grade, heavy, premium, dense,
operator-built**. WinBox-class seriousness + modern industrial command
centre + living network intelligence workstation.

It must **not** feel like a website, SaaS dashboard, soft-card UI, marketing
page, or basement app.

See `docs/design/INDUSTRIAL_VISUAL_LAW.md` for the full law and screenshot
gate.

---

## 11. Non-Negotiables

1. No AI / LLM in product logic in V1.
2. No Python anywhere. No PyQt anywhere. No Three.js anywhere.
3. No code copied from `_NEXUS`.
4. No mode-private engines for shared capability.
5. No topology-first front door.
6. No website / SaaS aesthetic.
7. No new top-level mode invented without updating this document first.
8. No stage may start without naming the section(s) of this document it
   obeys.

---

## 12. Failure Conditions

Stop and escalate to Bujar if any of the following occurs:

- A mode grows engine-grade logic instead of consuming engines.
- Two modes implement the same fact independently.
- Topology becomes the default landing surface.
- Visual quality starts to drift towards SaaS / website aesthetic.
- An LLM call lands inside an engine.
- A new mode appears that is not in section 5.
- The stack stops being able to deliver industrial feel (Tauri probation
  fails).

---

## 13. Use by Agents

Every Claude / Codex / DeepSeek session that proposes a stage, plan, or PR
**must** open by naming the sections of this document that the work obeys
(e.g. "Obeys §5 mode list, §6 engine/API rule, §10 visual law").

Agents may not invent modes, may not assume product structure beyond this
document, and may not draft Claude/Codex prompts unless Bujar asks.
