# Stack Decision — Tauri on Probation

> Companion to `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` and
> `INDUSTRIAL_VISUAL_LAW.md`.
> Tauri is the accepted stack for V1 **on probation**. It stays only if
> Anthracite can credibly feel like industrial Windows software. This
> document is the contract.

---

## Why Tauri is accepted for now

- **Rust-native backend.** Lets deterministic engines live in Rust, where
  determinism and typed APIs are natural.
- **Modern frontend stack** (React + TypeScript + Vite) for fast UI
  iteration on a dense, mode-based workstation surface.
- **Babylon-friendly.** WebView2 is a competent host for Babylon.js at the
  scale V1 targets (≥ 400 device topology).
- **Small footprint** versus Electron. Faster cold start, smaller installer.
- **Maintained**, currently active upstream.
- **Operator workflow already proven.** AgentOps, Graphify, and the
  workspace tooling are aligned with this stack.

---

## Why Electron is not automatically more premium

- Electron ships a full Chromium per app. Larger footprint, slower cold
  start. Premium feel is not about runtime size, but Electron buys nothing
  Tauri does not for this product.
- Electron's frontend is the same React/TS the team will write under
  Tauri. The "premium" feeling is **in the UI law**, not in the host.
- Electron's IPC is typed by convention, not by language. Tauri's
  Rust ↔ TS bridge is closer to the typed-API discipline Anthracite needs.
- Electron does not deliver native Windows widgets either; it would still
  be a WebView rendering a workstation surface.

Conclusion: switching to Electron does not buy more "premium" feel. It
trades footprint for parity.

---

## Why C++/Qt has stronger native feel but slower iteration

- Qt with native widgets delivers the closest "real Windows software"
  feel of any practical option, including industrial-grade tables, trees,
  context menus, and HiDPI behaviour out of the box.
- The cost is iteration speed: C++ build cycles, MOC tooling, harder
  hiring profile, slower UI exploration.
- The old Anthracite is already PyQt — the team knows the cost shape of
  Qt-on-Python. Moving to C++/Qt would compound that cost.
- Anthracite V1's risk is **getting the architecture right**, not the
  pixel-level fidelity of native widgets. The visual law plus discipline
  closes the perceived-quality gap.

Conclusion: C++/Qt wins on raw native feel and loses on iteration speed.
For V1, iteration speed matters more — provided the visual law holds.

---

## Why the current stack is still acceptable

- WebView2 + Babylon.js can credibly render industrial-grade workstation
  UI **if** the visual law is enforced at every stage.
- Rust + Tauri keeps the engines deterministic, typed, and isolated from
  UI churn.
- The team can move fast on UI while engines stabilise underneath.
- A stack swap is reversible if the visual proof fails at a checkpoint.

---

## Tauri acceptance criteria

Tauri stays only if **all** the following hold at the V1 cockpit
checkpoint:

1. App **feels like industrial Windows software** to Bujar's eye.
2. Mode shell **does not feel like a website** under the screenshot gate.
3. Panels are **dense and tool-grade** — tables, trees, tabs, context
   menus are first-class.
4. Topology can **credibly target 400 devices** in Babylon without
   collapsing into a tech demo aesthetic.
5. **Rust owns** deterministic engines.
6. **React does not own** domain logic.
7. **Babylon only renders** topology; Topology Engine owns truth.
8. **Screenshot review passes** Bujar's judgement at every visible stage.

If any of these fail and cannot be repaired inside a stage, the stack
goes back to open question.

---

## Failure condition that triggers stack reconsideration

Stack is reconsidered if, at the cockpit checkpoint or later:

- Visual law cannot be met without unreasonable engineering effort, or
- Babylon performance on a 400-device topology fails the operator-feel
  bar, or
- Tauri ↔ React boundary forces domain logic into React, or
- Bujar's screenshot review repeatedly fails across stages.

Reconsideration means a fresh decision record under `obsidian/decisions/`,
not a unilateral pivot.
