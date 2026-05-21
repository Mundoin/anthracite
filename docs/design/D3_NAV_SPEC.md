# D3_NAV_SPEC.md — Anthracite navigation, implementation-ready

> Obeys `docs/architecture/ANTHRACITE_V1_SOURCE_OF_TRUTH.md` §5 (modes are surfaces over engines), §6 (engine/API rule), §10 (visual law), §11 (non-negotiables).
> Companion: `docs/design/INDUSTRIAL_VISUAL_LAW.md`.
> Successor to the navigation guidance in `D1B_PLAN.md §8`.
> Anchor: post-D1B / D1B-A primitives at `0585c75 stage-d1ba`.

---

## 0 · Status

**Accepted.** Anthracite ships **two equal navigation paths**:

1. **Spatial navigation** — ModeRail + Context Sidebar + Main Canvas. Default workstation layout.
2. **Command navigation** — Cortex jump (Ctrl K) to mode / child / device / event / environment. Mandatory power-user path that composes **on top of** spatial navigation, never replaces it.

Layout decisions:

- **Concept A** is the default (expanded **and** collapsed rail both required).
- **Concept D** is mandatory Cortex behaviour, layered on Concept A.
- **Concept B** (inline-disclosure single rail) is the narrow-viewport fallback only.
- **Concept C** (top sash) is parked — the catalogue is too large for it.

The current sidebar hierarchy is **accepted as evolving**. We are not forcing it back to the §5 canonical 7-mode list. A surface large enough to warrant a top-level entry stays at mode level. The rail is contract-driven so the catalogue can grow without rail code changes.

---

## 1 · Scope &amp; non-goals

### In scope (D3)

- The navigation surface — ModeRail, Context Sidebar, the Main Canvas guarantee, Cortex jump behaviour, and the narrow-viewport fallback.
- The `ModeCatalogue` contract that all of the above consume.
- The honest-state contract (`available` / `partial` / `deferred` / `blocked`) and badge propagation rules.
- Keyboard + focus contracts.
- Component split for OCC to land against.

### Out of scope (boundary notes)

- **No feature implementation for Devices / Events / Provisioning children.** Catalogue entries may exist before their feature surfaces do. They render as `partial` / `deferred` / `blocked` until the surface lands.
- **No new engines.** Navigation does not add engines or change engine boundaries.
- **No Rust changes** required by this spec. ModeCatalogue lives in TS.
- **No persistence** layer changes. Operator preferences (open tree nodes, sidebar width) may be persisted later — out of scope here.
- **No Topology 3D** work. The Topology mode entry routes to existing surfaces.
- **No App.css retirement.** Sweep-later remains. New code under `src/components/navigation/` uses tokens.css only.
- **D2 dashboard card spec is preserved unchanged.** D3 does not edit D2.
- **Existing test IDs are preserved where possible.** New components add new test IDs; existing ones (`anth-btn-*`, `chip-*`, `action-tile-*`, `surface-*`) stay.

---

## 2 · Mode catalogue — the contract

The single source of truth for navigation. Lives at `src/contracts/modeCatalogue.ts`. Mode rail, context sidebar, AND Cortex all consume this. **There is no second registry.**

```ts
// src/contracts/modeCatalogue.ts

export type CatalogueState =
  | "available"   // wired and operator-usable
  | "partial"     // partially wired; some sub-tools live, others not yet
  | "deferred"    // exists in catalogue + roadmap; not wired in V1
  | "blocked";    // exists but unreachable (RBAC / contract failure / license)

export type ChildKind = "tool" | "workflow" | "surface" | "group";

export interface ModeChild {
  readonly id: string;             // unique within catalogue · stable across releases
  readonly label: string;
  readonly iconId?: string;        // resolved by AnthIcon → registry/mode.tsx or registry/workflow.tsx
  readonly state: CatalogueState;
  readonly kind: ChildKind;        // "group" = folder node; renders an expand caret
  readonly badge?: number;         // numeric count surfaced as a chip-action badge
  readonly route?: string;         // mode-relative · used by the router; navigation surface ignores it
  readonly children?: readonly ModeChild[];   // optional · recursive · depth cap = 3
  readonly deferredReason?: string;            // hover-glance copy when state = "deferred"
  readonly blockedReason?: string;             // hover-glance copy when state = "blocked"
}

export interface ModeBadges {
  readonly alerts?: number;         // critical / err propagation
  readonly deferred?: number;       // count of deferred descendants (derived; cache here)
  readonly blocked?: number;        // count of blocked descendants (derived; cache here)
  readonly partial?: number;        // count of partial descendants (derived; cache here)
}

export interface ModeEntry {
  readonly id: string;
  readonly label: string;
  readonly iconId: string;          // must resolve in registry/mode.tsx
  readonly group: string;           // groups derived from this field — never hardcoded
  readonly state: CatalogueState;
  readonly children: readonly ModeChild[];   // [] for zero children, NEVER undefined
  readonly badges?: ModeBadges;
}

export interface FootEntry {
  readonly id: string;              // e.g. "opsConsole"
  readonly label: string;
  readonly iconId: string;
  readonly route?: string;
}

export interface ModeCatalogue {
  readonly version: number;
  readonly modes: readonly ModeEntry[];
  readonly foot: readonly FootEntry[];
}
```

### Accepted catalogue (D3)

```
FOUNDATION
  Hierarchy
    Environment Overview
    Creating an Environment
    Building an Environment
    Synchronizing an Environment
    Synchronization Status
    Environment Island
  Devices
    Inventory · Selected Device · Data Sources · Comparison ·
    Network Utilisation · Compliance Overview · Traffic Flows ·
    Virtual Topologies · Endpoint Search
  Intake
  Discovery
  Provisioning
    Network Provisioning · Zero-Touch Provisioning ·
    Provisioning Errors & Alerts · Managing Configlets ·
    Managing Image Bundles · Moving Devices Between Containers ·
    Reconciling Config (group)
      Reconciling a Device's Config
      Reconciling a Container's Config
    Resetting a Device · Snapshot

RUN
  Operate · Topology · Diagnose

GOVERNANCE
  Assess · Events · Security · Dashboards
    Events
      Event Overview · View Event · Event Generation · Notifications ·
      Categories · Syslog Event Point · PTP Events ·
      Event Rules / Sources

WORKSHOP
  Build · Settings

FOOT
  Ops Console
```

The contract permits any number of modes, any group labels, any depth ≤ 3.

### Contract invariants (binding)

1. **`children` is always an array.** `[]` means "no children". Never `undefined` / `null`.
2. **Groups are derived**, in catalogue order. The first mode declaring `group: "Foundation"` defines its placement and label.
3. **Mode order is array order.** Within a group, order = order of appearance.
4. **`iconId` must resolve.** Boot fails (loud assertion in dev) if any catalogued mode resolves to AnthIcon's fallback.
5. **Depth cap is 3.** A child may have children; those grandchildren may NOT have children. The schema and the renderer both enforce this.
6. **`id` is stable.** Cortex history, persisted preferences, and routing key off it. Once shipped, an id cannot be silently re-purposed.

---

## 3 · ModeRail — anatomy &amp; behaviour

```
┌──── EXPANDED (196 px) ─────┐    ┌── COLLAPSED (56 px) ──┐
│ FOUNDATION                 │    │       ◉  HIER         │
│ ● Hierarchy            ●   │    │       ◉  DEV          │
│ ● Devices              ●   │    │       ◉  INT          │
│ ● Intake          [2]      │    │       ◉  DSC          │
│ ◐ Discovery                │    │       ◉  PROV    [3]  │
│ ◐ Provisioning    [3]      │    │                       │
│                            │    │  ─────────────        │
│ RUN                        │    │       ◉  OPER    [4]  │
│ ● Operate         [4]      │    │       ◉  TOPO         │
│ ● Topology                 │    │       ◉  DIAG    [14] │
│ ● Diagnose        [14]     │    │                       │
│                            │    │  ─────────────        │
│ GOVERNANCE                 │    │       ◉  ASSS         │
│ ● Assess                   │    │       ◉  EVTS    [6]  │
│ ◐ Events          [6]      │    │       ✖  SEC          │
│ ✖ Security                 │    │       ●  DASH         │
│ ● Dashboards               │    │                       │
│                            │    │  ─────────────        │
│ WORKSHOP                   │    │       ◉  BLD          │
│ ● Build                    │    │       ●  SET          │
│ ● Settings                 │    │                       │
│                            │    │  ─────────────        │
│ ─────────────────          │    │       ⌘  CLI          │
│ ⌘ Ops Console              │    │                       │
└────────────────────────────┘    └───────────────────────┘
```

### Anatomy (expanded — 196 px)

| Slot           | Px         | Token                          |
|----------------|------------|--------------------------------|
| Width          | 196        | hardcoded                      |
| Row height     | 30         | `--anth-row` (compact 32 ok)   |
| Group header   | 22, sticky | `--anth-text-muted` 10 px ucase|
| Leading LED    | 6          | `STATE_LED[mode.state]`        |
| Icon           | 14–15      | `AnthIcon size="sm"`           |
| Label          | flex       | `12.5 px / 500`                 |
| Trailing badge | 18 × auto  | `anth-chip--status-err` if alerts |
| Selected glow  | 2 inset    | `--anth-accent-action` (green) |
| Selected bg    | row        | `--anth-bg-selected`           |
| Foot rule      | 1          | `--anth-border` top            |

### Anatomy (collapsed — 56 px)

| Slot           | Px         | Notes                                |
|----------------|------------|--------------------------------------|
| Width          | 56         | hardcoded                            |
| Row height     | 44         | icon + 4-char short label below      |
| Group separator| 1 px rule  | inside the rail, every group break   |
| Corner badge   | top-right  | red dot for `alerts`, dim gray for `partial` |
| Hover behaviour| —          | hovering opens the Context Sidebar over the canvas |

### Behaviour

- **Variable count.** N modes from the catalogue. No hardcoded slot count anywhere.
- **Groups** derive from the `group` field. Rail draws a group header in expanded mode and a 1 px rule in collapsed mode.
- **Active mode.** Single source of truth — `useNavigationState`. Active row gets `--anth-bg-selected` background and 2 px inset green glow (`--anth-accent-action`). Active row's mode loads in the Context Sidebar.
- **State LED.** 6 px leading dot per mode. `available` green · `partial` amber · `deferred` muted grey · `blocked` red.
- **Alert badge.** Numeric chip on the right in expanded mode, corner dot in collapsed mode. Source = `mode.badges.alerts` (see §9 propagation).
- **Foot.** Sticky bottom section with `catalogue.foot[]` entries. Ops Console is always last.
- **Overflow.** Rail body scrolls vertically when content > viewport. Group headers are sticky within the rail. Foot is fixed at the bottom of the rail (not the viewport).
- **Collapse / expand.** Operator toggle in the rail foot (caret icon). State persists per operator. Default = expanded.
- **No navigation in the canvas.** Selecting a mode never injects controls into the canvas.

---

## 4 · Context Sidebar — anatomy &amp; behaviour

```
┌── 260 px ─────────────────────────────┐
│ [icon] PROVISIONING   ● Partial · 9   │   ← header
├───────────────────────────────────────┤
│ WORKFLOWS                              │
│  ◐ ▶ Network provisioning              │
│  ✦ ▶ Zero-Touch Provisioning           │
│  ● → Moving devices between containers │
│  ● → Resetting a device                │
│ TOOLS                                  │
│  ● Managing configlets                 │
│  ◐ Managing image bundles              │
│  ● Snapshot                            │
│ SURFACES                               │
│  ◐ Provisioning errors & alerts   [3]  │
│ GROUPS                                 │
│  ● ▾ Reconciling config                │
│      ● Reconciling a device's config   │ ← active
│      ◐ Reconciling a container's config│
│ DEFERRED                               │
│  ✦ Zero-Touch Provisioning             │
└───────────────────────────────────────┘
```

### Anatomy

| Slot              | Px        | Notes                                        |
|-------------------|-----------|----------------------------------------------|
| Width             | 240–280   | Default 260. May persist per (operator, mode). |
| Header            | 32        | mode icon + label + state chip + item count |
| Kind header       | 22, sticky| `WORKFLOWS / TOOLS / SURFACES / GROUPS / DEFERRED / BLOCKED` |
| Row height        | 28        | leading LED · caret (if children) · icon · label · badge |
| Indentation       | 16 / depth| depth 0 = 12 px pad-left; depth 1 = 28 px; depth 2 = 44 px |
| Active row        | bg        | `--anth-bg-selected`                          |
| Deferred row      | text      | italic, `--anth-text-muted`                   |
| Blocked row       | text      | `--anth-err-ink`                              |
| Trailing badge    | chip      | numeric · `anth-chip--status-{tone}`          |
| Scrollbar         | thin      | sidebar body scrolls independently of rail   |

### Behaviour

- **Active mode drives content.** Switch modes → sidebar swaps. The mode's last active child is restored if available.
- **Kind sectioning.** Children grouped in the order: WORKFLOWS · TOOLS · SURFACES · GROUPS · DEFERRED · BLOCKED. Empty sections omitted. The `DEFERRED` and `BLOCKED` sections are **never** silently filtered out.
- **Recursive tree.** A child with `children?` renders an expand caret; click or `Space` toggles the node. Default state: active branch auto-expanded; siblings collapsed.
- **Depth cap = 3.** Schema enforces it; renderer's indentation stops at depth 2 (groups inside groups would be unreadable past that).
- **State LED.** 6 px leading dot per row, **including sub-rows.** Same palette as the rail.
- **Badge propagation.** A `surface` row may carry a numeric badge (`badge: 3`). The group row showing `[3]` propagates that count to its parent group (`Reconciling config [3]`) only if the group's child count badges differ from itself. The mode-level alert badge in the rail propagates from any descendant with `alerts > 0`. See §9.
- **Zero-child mode.** Sidebar shows mode header + a labelled empty state in the body explaining the mode state (e.g. "This mode has no sub-tools. Work happens directly in the canvas.").
- **Hover glance.** Hovering a row for ≥500 ms shows a tooltip with: label · state · `deferredReason` / `blockedReason` if present.
- **Independent scrolling.** The sidebar body scrolls independently when the tree is taller than the viewport. The rail next to it does NOT scroll in lockstep.
- **No nav in canvas.** Selecting a child loads the child surface into the **canvas**, not into a sub-pane of the sidebar.

---

## 5 · Main Canvas — the guarantee

**The Main Canvas is for work, not navigation.**

- Navigation never spills into the canvas. No mode tabs, no child lists, no drawer-style trays that hijack the canvas as a chooser.
- The canvas is owned by the active child's surface (or the active mode's surface if no children).
- Selection / context the operator established in the canvas (e.g. `fra-leaf-04` selected in Operate) is preserved per (env, mode) and may be carried across modes via opt-in (future work — out of scope for D3).
- The canvas content is `<main>` semantically. It is the **only** primary landmark in the workstation chrome.

This is the rule the catalogue evolution doesn't get to bend. The reason the rail/sidebar can carry depth-2 trees is precisely because the canvas never has to.

---

## 6 · Keyboard &amp; focus

### Tab order

`Titlebar chrome → ModeRail → Context Sidebar → Main Canvas → StatusBar`

Each region is a focus group. Inside a region, arrow keys move; Tab moves to the next region.

### Rail keys

| Key            | Behaviour                                          |
|----------------|----------------------------------------------------|
| `↓` / `↑`      | Walk rail items in catalogue order. Group headers are skipped (non-focusable). Foot items are included. |
| `→`            | Open / focus the Context Sidebar; focus moves to its first active row. |
| `Enter`        | Activate the rail item (becomes active mode).      |
| `Space`        | Equivalent to Enter on rail rows.                   |
| `Esc`          | If sidebar is open over a collapsed-rail hover-popover, close it. Otherwise no-op. |
| `Tab`          | Exit rail forward to next region.                   |

### Sidebar keys

| Key            | Behaviour                                          |
|----------------|----------------------------------------------------|
| `↓` / `↑`      | Walk sidebar rows in render order, skipping kind headers. Expanded tree nodes are visited; collapsed ones are not. |
| `Enter`        | Activate the selected child. Canvas loads its surface. |
| `Space`        | Toggle expand/collapse on the focused row if it has children. Otherwise = Enter. |
| `→`            | Expand the focused row if collapsed. Otherwise = ↓. |
| `←`            | Collapse the focused row if expanded. Otherwise focus its parent. From a top-level child, `←` returns focus to the rail. |
| `Home` / `End` | Jump to first / last sibling at the current depth.  |
| `Esc`          | Close the sidebar (Concept A on narrow viewport only; otherwise no-op).  |
| `Tab`          | Exit sidebar forward to canvas.                     |

### Focus discipline

- All focusable elements receive the global `:focus-visible` ring: `outline: var(--anth-ring-width) solid var(--anth-ring-color); outline-offset: var(--anth-ring-offset);`.
- The ring is **never** suppressed per component. Custom focus styling is not permitted.
- Tab focus is sticky to the last focused row when re-entering a region (rail / sidebar).
- The Cortex modal (Concept D) traps focus while open. `Esc` closes and returns focus to the previously focused element.

---

## 7 · Cortex jump — Concept D behaviour

Cortex is mandatory. It composes **on top of** Concept A.

### Surface

- Triggered by **Ctrl K** (Mac: ⌘ K) from anywhere in the shell.
- Renders as a centered overlay (`Surface variant="overlay"` · `--anth-elev-3`).
- 560 px wide · max-height 480 px · top offset 96 px from titlebar.
- The rail and sidebar stay rendered behind the overlay; Cortex does not replace the layout.

### Catalogue adapter

Cortex resolves against the **same `ModeCatalogue`** as the rail / sidebar. There is one navigation source of truth.

The adapter expands the catalogue into a flat searchable index:

```ts
type CortexEntry =
  | { kind: "mode";         modeId: string; label: string; iconId: string; state: CatalogueState; badges?: ModeBadges }
  | { kind: "child";        modeId: string; childPath: string[]; label: string; iconId?: string; state: CatalogueState; badge?: number; depth: number }
  | { kind: "device";       envId: string; deviceId: string; label: string; iconId?: string; meta: string }
  | { kind: "event";        envId: string; eventId: string; label: string; severity: "ok"|"warn"|"err"|"info" }
  | { kind: "environment";  envId: string; label: string; scope: string };
```

`childPath` carries the full path from mode root to the entry (e.g. `["provisioning", "reconcile", "reconcile-device"]`). Cortex jumps move the active mode AND the active child in one step.

### Result rows

Anatomy parity with the Context Sidebar:

```
●  [icon]  Reconciling a device's config  ·  Provisioning ▸ Reconciling config   ↵
◐  [icon]  Compliance overview            ·  Devices                              ↵
✖  [icon]  Audit trail                    ·  Security · blocked                   ↵
```

- Leading capability LED.
- Primary label.
- Secondary breadcrumb (`mode ▸ group ▸ child` for child entries; `mode · state` for mode entries; metadata for device/event/env).
- Keyboard hint right-aligned.

### Result sections

1. **Quick actions** — verbs available in the active scope (V1: navigation jumps only; verb-grade actions roadmapped).
2. **Modes** — top-level matches against the mode list.
3. **Tools / workflows / surfaces** — flattened child matches across all modes; secondary line shows the full breadcrumb.
4. **Devices** — env-scoped device list.
5. **Events** — env-scoped open events.
6. **Recent** — last 5 jumps (operator local).

Empty sections omit their header.

### Scope chips (input)

The Cortex input renders 1–3 chips left of the caret showing current scope:

```
[apex-prod-emea ×] [Diagnose ×] [lon-leaf-11 ×]    > recon|
```

- `Tab` widens scope (drops the rightmost chip).
- `Shift+Tab` narrows scope (picks up the next eligible chip — selection from active mode/sidebar).
- The chips obey the SoT rule: Cortex is always scoped.

### Jump behaviour

- `Enter` on a result resolves and updates `useNavigationState` to point at the entry's mode + child path.
- The rail's active mode AND the sidebar's active child update in lockstep.
- The canvas loads the destination surface. Selection from a `device` entry is also dropped into the surface's selection slot.
- `⇧ Enter` opens the destination in a new pane (future work; spec-only in V1).
- `Esc` closes Cortex; previously focused element receives focus.

### Mode hot-keys (no palette required)

Power-user shortcuts that bypass Cortex for the most-used modes:

| Sequence | Mode        |
|----------|-------------|
| `g h`    | Hierarchy   |
| `g v`    | Devices     |
| `g i`    | Intake      |
| `g D`    | Discovery   |
| `g p`    | Provisioning|
| `g o`    | Operate     |
| `g t`    | Topology    |
| `g d`    | Diagnose    |
| `g a`    | Assess      |
| `g e`    | Events      |
| `g s`    | Security    |
| `g w`    | Dashboards  |
| `g b`    | Build       |
| `g ,`    | Settings    |
| `g \`    | Ops Console |

Hot-keys do not steal focus from text inputs. Reserved sequence is `g [letter]`; collision detection at boot.

---

## 8 · Narrow viewport fallback — Concept B behaviour

When viewport width < **1100 px** (configurable token), the shell switches to **inline-disclosure single rail** (Concept B):

- The 196 px rail expands to 280 px and the Context Sidebar disappears.
- The active mode's children render inline beneath the mode row.
- Other modes stay collapsed.
- Depth-2 trees still render with proper indentation; sub-rows inset 14 px per level.
- Keyboard model is the same except `←` from a top-level child returns focus to the mode row, not to the rail (there is no separate rail in this layout).
- Cortex remains available.
- This is a **fallback**, not a layout choice. The transition is automatic on resize.

---

## 9 · Honest states &amp; badge propagation

### State values

| State       | Meaning                                                         | LED colour                    |
|-------------|-----------------------------------------------------------------|-------------------------------|
| `available` | Feature is wired and operator-usable.                            | `--anth-ok` (green)           |
| `partial`   | Partially wired; some sub-tools live, others not yet.            | `--anth-warn` (amber)         |
| `deferred`  | Entry exists in catalogue + roadmap; not wired in V1.            | `--anth-text-muted` (grey)    |
| `blocked`   | Entry exists but unreachable now (RBAC / contract / license).    | `--anth-err` (red)            |

Rules:

- Catalogue entries **may** exist before their feature surfaces do. The navigation **never** lies about availability — the `state` field carries the truth.
- `deferred` and `blocked` rows always render. They live in their own trailing groups inside the Context Sidebar. Never silently filtered.
- `deferredReason` / `blockedReason` strings render in the hover glance and the Cortex secondary line.

### Badge propagation

Two derived signals propagate from children to parents at boot (cached on `ModeBadges`, recomputed only when catalogue version bumps):

1. **`alerts`** — sum of `badge` values on descendants where the descendant's state is `available` AND the badge represents a critical-grade count (events, open cases, active errors). Surfaces on the rail mode row as the red numeric chip.
2. **`partial` / `deferred` / `blocked` counts** — informational, surfaced in the sidebar header (`Provisioning · 9 items · 1 deferred · 0 blocked`).

A `propagateBadges(modeCatalogue)` pure function is the single helper that performs the walk. Components read the cached `mode.badges.*` fields; they do not recompute.

Group rows in the sidebar show the propagated badge sum from their child rows (e.g. `Reconciling config [3]` if a sub-row has `badge: 3`).

---

## 10 · Acceptance checklist (OCC testable)

### Catalogue

- [ ] **Existing groups preserved.** `Foundation · Run · Governance · Workshop` exist in catalogue order; `Foot` exists as a separate sticky region.
- [ ] **Devices added** under Foundation with all 9 children (Inventory · Selected Device · Data Sources · Comparison · Network Utilisation · Compliance Overview · Traffic Flows · Virtual Topologies · Endpoint Search).
- [ ] **Events added** under Governance with all 8 children (Event Overview · View Event · Event Generation · Notifications · Categories · Syslog Event Point · PTP Events · Event Rules / Sources).
- [ ] **Hierarchy expanded** with the environment lifecycle children (Environment Overview · Creating · Building · Synchronizing · Synchronization Status · Environment Island).
- [ ] **Provisioning expanded** with all 9 top-level children and one depth-2 group (Reconciling Config → Device's Config / Container's Config).
- [ ] **Foot** contains Ops Console.
- [ ] **Every mode `iconId` resolves** to a real glyph in the icon registry (no fallback squares in production).
- [ ] **Catalogue boot assertion** fails loudly if an `iconId` is missing or if `children` is `undefined`.

### ModeRail

- [ ] Expanded rail renders all modes grouped by `group` in catalogue order.
- [ ] Collapsed rail renders the same modes as 56 px icon items with 4-char short labels.
- [ ] Active mode shows `--anth-bg-selected` background and 2 px inset `--anth-accent-action` glow (collapsed and expanded).
- [ ] Capability LED renders for every mode in expanded mode; corner dot in collapsed mode.
- [ ] Alert badge renders when `mode.badges.alerts > 0`.
- [ ] Rail body scrolls when content height > viewport.
- [ ] Group headers are sticky within the rail.
- [ ] Foot section is fixed at the bottom of the rail.

### Context Sidebar

- [ ] Active mode drives the sidebar content.
- [ ] Children grouped in kind order: WORKFLOWS · TOOLS · SURFACES · GROUPS · DEFERRED · BLOCKED.
- [ ] Empty kind sections are omitted.
- [ ] `DEFERRED` and `BLOCKED` sections always render when they have any content — never filtered out.
- [ ] Recursive tree renders depth-2 children with 16 px-per-level indentation.
- [ ] `Space` toggles expandable tree nodes.
- [ ] `Enter` activates the selected child (canvas loads its surface).
- [ ] Arrow keys move through the tree, skipping kind headers and collapsed children.
- [ ] Group rows (kind: "group") render an expand caret.
- [ ] LED renders on every row including sub-rows.
- [ ] Sidebar body scrolls independently when content > viewport.
- [ ] Zero-child mode shows the labelled empty state.
- [ ] Hover-glance tooltip surfaces `deferredReason` / `blockedReason` after 500 ms.

### Main Canvas

- [ ] Canvas remains work-only. No mode tabs, no child lists, no chooser drawers in the canvas.
- [ ] Switching mode replaces the canvas with the mode's active-child surface.
- [ ] Selecting a child swaps the canvas surface; the rail and sidebar do not re-render their own scaffolding.

### Badge propagation

- [ ] Mode-level alert badge equals the sum of descendant alert badges where state is `available`.
- [ ] Group-row badge in the sidebar equals the sum of its visible child badges.
- [ ] Sidebar header shows the propagated counts (`X items · Y partial · Z deferred · W blocked`).
- [ ] Counts recompute only on catalogue version bump (no per-render walks).

### Cortex jump (D)

- [ ] `Ctrl K` (Mac: `⌘ K`) opens the Cortex modal anywhere in the shell.
- [ ] The same `ModeCatalogue` powers the Cortex catalogue adapter (single source of truth).
- [ ] Result rows show: LED · icon · label · breadcrumb · keyboard hint.
- [ ] Selecting a child entry updates active mode AND active child in lockstep.
- [ ] Scope chips render at the input; `Tab` widens, `Shift+Tab` narrows.
- [ ] Mode hot-keys (`g [letter]`) jump without opening Cortex; sequences do not fire while a text input is focused.
- [ ] `Esc` closes Cortex and restores prior focus.

### Narrow viewport fallback

- [ ] Viewport < 1100 px switches to inline-disclosure single rail.
- [ ] Depth-2 trees still render with proper indentation.
- [ ] Resize back ≥ 1100 px restores Concept A.
- [ ] Active mode + active child preserved across the switch.

### Keyboard &amp; focus

- [ ] Tab order: titlebar → rail → sidebar → canvas → status.
- [ ] Every focusable element shows the global `:focus-visible` ring.
- [ ] No component suppresses or replaces the focus ring.
- [ ] Re-entering a region restores focus to the last-focused row in that region.
- [ ] Group headers are non-focusable.

### Visual law

- [ ] Workstation density · 30 px rows · 28 px cards · no SaaS/marketing affordances.
- [ ] Status colours are signal-grade (`--anth-ok` / `--anth-warn` / `--anth-err` / `--anth-info` / muted).
- [ ] No drop-shadow card grids in the navigation.
- [ ] Sans-serif chrome (`--anth-font-ui`); monospace numerics (`--anth-font-mono`).
- [ ] Screenshot review of expanded + collapsed rail + Cortex passes the gate.

---

## 11 · Implementation notes — proposed component split

> OCC implements; this is the contract surface. Spec does not write production code.

```
src/contracts/
  modeCatalogue.ts                  — ModeCatalogue type + accepted catalogue
  modeCatalogueSchema.ts            — boot-time validator (zod / plain TS)
  badgePropagation.ts               — propagateBadges(catalogue): ModeCatalogue
src/state/
  useNavigationState.ts             — reducer: activeMode, activeChildPath, sidebarOpenIds, railCollapsed, sidebarWidth
src/components/navigation/
  index.ts                          — barrel
  ModeRail.tsx                      — expanded + collapsed; consumes catalogue + state
  ModeRail.css
  ContextSidebar.tsx                — header + kind sections + recursive tree
  ContextSidebar.css
  NavigationTree.tsx                — recursive tree root
  NavigationTreeItem.tsx            — single row + caret + LED + badge + hover-glance
  NavigationTreeItem.css            — shared row CSS
  NarrowFallbackRail.tsx            — Concept B inline-disclosure
  hotkeys.ts                        — g-prefix hot-key handler
src/components/cortex/
  CortexOverlay.tsx                 — Surface variant="overlay"
  CortexInput.tsx                   — scope chips + caret
  CortexResults.tsx                 — sectioned result list
  cortexCatalogueAdapter.ts         — ModeCatalogue → flat CortexEntry[]
  cortexCommands.ts                 — verb→action resolution (V1: jumps only)
```

### Wiring

- `useNavigationState` is the single state owner. Subscribers: `ModeRail`, `ContextSidebar`, `CortexOverlay`, `AppShell`.
- All three components read from the same `ModeCatalogue` instance (passed via React context).
- `cortexCatalogueAdapter` is **pure**: `ModeCatalogue → CortexEntry[]`. Memo on catalogue version.
- `badgePropagation` runs once at boot, on catalogue version change, and on any explicit `recomputeBadges()` from upstream (engine status changes that flip `state` between `available` and `partial`).

### Test IDs (preserve / add)

- Existing D1B test IDs stay: `anth-btn-*`, `chip-*`, `action-tile-*`, `surface-*`, `anth-icon-*`.
- New navigation test IDs follow the same shape:
  - `nav-rail` (root) · `nav-rail-mode-{id}` · `nav-rail-foot-{id}`
  - `nav-sidebar` (root) · `nav-sidebar-row-{childId}` · `nav-sidebar-section-{kind}`
  - `nav-tree-toggle-{childId}` for expand carets
  - `cortex-overlay` · `cortex-input` · `cortex-result-{entryId}`
  - `nav-hotkey-handler` (mount point)

### State shape (TypeScript sketch — informational, not binding)

```ts
interface NavigationState {
  activeMode: string;                // mode id
  activeChildPath: readonly string[];// e.g. ["reconcile", "reconcile-device"]
  sidebarOpenIds: ReadonlySet<string>;// expanded tree node ids
  railCollapsed: boolean;
  sidebarWidth: number;              // px, per-operator persistence
  recents: readonly { modeId: string; childPath: readonly string[]; t: number }[]; // last 10
}
```

Persistence layer is out of scope for D3; the reducer should be persistence-ready (pure, serializable) but does not need to wire a store yet.

---

## 12 · Boundary notes — explicit (recap)

- **No feature implementation** for Devices · Events · Provisioning children. Catalogue entries are allowed to exist before surfaces do.
- **Use honest states.** `available · partial · deferred · blocked`. Never lie about availability.
- **No new engines.**
- **No Rust changes.**
- **No persistence implementation.** Reducer is persistence-shaped only.
- **No Topology 3D work.**
- **No App.css retirement** unless OCC separately scopes it.
- **Preserve D2 dashboard card spec.** This spec does not touch D2.
- **Preserve existing test IDs.** Navigation adds new IDs under the `nav-*` / `cortex-*` prefix; existing primitives keep theirs.

---

## 13 · Use by agents

Per `ANTHRACITE_V1_SOURCE_OF_TRUTH.md §13`, any stage that lands this work must open by naming the sections this work obeys: this spec obeys **§5** (modes are surfaces), **§6** (engine/API; navigation consumes catalogue, not engines), **§10** (visual law), **§11.7** (no new top-level mode without doctrine update — Devices and Events are catalogue evolution; if the SoT §5 list is to remain authoritative, it must be amended). The doctrine question on §5 is flagged for Bujar; this spec implements against the accepted evolving catalogue.
