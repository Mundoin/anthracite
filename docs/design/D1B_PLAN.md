# D1B_PLAN.md — Anthracite primitives review & forward plan

> Obeys `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` §5 (mode list), §6 (engine/API rule), §10 (visual law).
> Companion to `INDUSTRIAL_VISUAL_LAW.md`.
> Anchor: `0585c75 stage-d1ba: align button action token semantics`.

---

## 0 · Status snapshot (what actually landed)

| Primitive | Path | Status |
|---|---|---|
| `AnthButton` | `src/components/shared/AnthButton.tsx` + `.css` | **Landed (D1B)**; over-variant (9, not 6) |
| `Surface`    | `src/components/shared/Surface.tsx` + `.css`    | **Landed (D1B)**; clean |
| `ActionTile` | `src/components/shared/ActionTile.tsx` + `.css` | **Landed (D1B)**; clean |
| `AnthIcon`   | `src/components/icons/AnthIcon.tsx`              | **Landed (D1B)**; clean shell |
| `iconRegistry` | `src/components/icons/iconRegistry.tsx`        | **Landed (D1B)**; ~40 placeholder glyphs across 11 groups |
| `Chip`       | `src/components/shell/Chip.tsx` + `.css`         | **Landed (D1)**; clean |
| Action tokens | `src/styles/tokens.css` (D1B-A block)           | **Landed (D1B-A)**; blue = primary, green = operational |

**No speculative pre-D1B work in this plan.** Every recommendation below is a delta against the code at `0585c75`, not a rebuild of it.

---

## 1 · Token doctrine — confirmed by code at 0585c75

`src/styles/tokens.css` resolves the doctrine cleanly:

```css
/* Action primary — BLUE */
--anth-action-primary:        var(--anth-info);   /* #3182CE */
--anth-action-primary-hover:  #2563A6;
--anth-action-primary-active: #1E4A82;
--anth-action-primary-ink:    #FFFFFF;
--anth-action-primary-tint:   var(--anth-info-tint);

/* Operational accent — GREEN. RESERVED for operational signal surfaces:
   healthy LEDs, success states, selected operational accent (rail glow /
   is-selected). NOT for primary action button fill. */
--anth-accent-action:        var(--anth-ok);      /* #38A169 */
--anth-accent-action-hover:  #2F855A;
--anth-accent-action-ink:    #FFFFFF;
--anth-accent-action-tint:   var(--anth-ok-tint);
```

- `--anth-accent` (`#1A202C` anthracite-black) stays brand/chrome/mark territory. Unchanged. Correct.
- `AnthButton.css` `.anth-btn--primary` consumes `--anth-action-primary` (blue). Correct.
- `AnthButton.css` `.anth-btn--rail.is-selected` paints a 2px inset glow in `--anth-accent-action` (green). Correct — selected mode is operational signal, not a CTA.
- `AnthButton.css` `.anth-btn--success` paints a full green fill via `--anth-ok`. **Acceptable** as a semantic success confirmation (e.g. "Approve rollout") but `success` must NOT be reached for as a substitute for `primary`. Doc this in the component header.

**App.css retirement.** Sweep-later confirmed. New surfaces must not import App.css. Existing consumers migrate when their surface is next touched. No broad sweep landed in D1B and none should be queued before D2.

---

## 2 · AnthButton — what landed vs. agreed taxonomy

**Decision on record (pre-D1B):** six base variants — `primary, secondary, ghost, danger, success, icon-only` — with size + slot composition. Contextual buttons (toolbar, card CTA, table row action) **compose** from those, not become new types.

**What landed:** nine variants —

```
primary | secondary | ghost | toolbar | danger | success | rail | chip-action | icon-only
```

`toolbar`, `rail`, and `chip-action` violate the collapse rule. They exist for legitimate composition reasons (toolbar wells need a softer fill; rail items need full-width + green selected glow; chip-actions need a 22px sunken pill). But the right shape is **composition over variants**.

### Forward plan — AnthButton taxonomy convergence (D2-window or D3-window)

1. **Keep the six base variants as the public API.** `primary | secondary | ghost | danger | success | icon-only`. `size: sm | md | lg`. Slots: `iconId`, `trailingIconId`, `children`.
2. **Demote `toolbar`, `rail`, `chip-action` to internal shell idioms.** Either:
   - **(Preferred)** add `density` and `tone` props on the base button — `density: default | toolbar | rail | chip` adjusts height/padding/radius only; `tone` is unaffected. Existing consumer sites change from `variant="toolbar"` to `variant="ghost" density="toolbar"`.
   - **(Acceptable fallback)** keep the three internal class names but DO NOT widen the public `AnthButtonVariant` union. Move them under a `_internalVariant` slot used only by `ModeRail`, `OpsStrip`, and toolbar wells.
3. **`.anth-btn--rail.is-selected` keeps the 2px inset green glow.** Selected mode is operational state, not a CTA — green is correct per doctrine.
4. **`.anth-btn.is-selected:not(.anth-btn--rail)` currently re-borders the button in `--anth-action-primary` (blue).** That's correct for non-rail selected toggles. Document the split.
5. **Disabled visuals are good** (`--anth-bg-disabled` + muted text + `not-allowed` cursor). No change.
6. **Focus discipline.** `:focus-visible { outline: 2px solid var(--anth-ring-color); }` is set on `.anth` at root. AnthButton inherits cleanly. Keep it. Never suppress per-component.

### AnthButton — locked API proposal (post-collapse)

```ts
type AnthButtonVariant =
  | "primary"   // blue action primary (--anth-action-primary)
  | "secondary" // panel-bg + strong border, default workhorse
  | "ghost"     // transparent, hover-to-hover bg
  | "danger"    // err fill (--anth-err)
  | "success"   // ok fill (--anth-ok) — semantic confirmation only
  | "icon-only";

type AnthButtonSize    = "sm" | "md" | "lg";       // 22 · 28 · 34
type AnthButtonDensity = "default" | "toolbar" | "rail" | "chip"; // internal idiom

interface AnthButtonProps {
  variant?:     AnthButtonVariant;
  size?:        AnthButtonSize;
  density?:     AnthButtonDensity; // shell-only; not advertised to mode authors
  iconId?:      string;
  trailingIconId?: string;
  pressed?:     boolean;
  selected?:    boolean;
  disabled?:    boolean;
  type?:        "button" | "submit" | "reset";
  children?:    ReactNode;
  onClick?:     () => void;
}
```

---

## 3 · Surface — clean as landed

Six variants over the elevation ladder:

```
panel    --anth-elev-1   default panel
card     --anth-elev-2   raised card
raised   --anth-elev-2 + strong border
inset    sunken background, inset shadow
toolbar  statusbar bg + bottom inset rule
overlay  --anth-elev-3 + r-lg   modal/floating
```

Four paddings: `none | tight | default | comfortable` (default = cockpit-pad-y/x = 10/14).

`as` prop preserves HTML semantics (`section`, `article`, `aside`). Good.

### Forward plan — Surface (D2-window)

1. **Add a `bordered` boolean.** Today only `raised` carries a 1px strong border; `panel` and `card` rely on the shadow's `0 0 0 1px var(--anth-border)` to read as a frame, which is correct in light bg but disappears against `inset` siblings. A `bordered` opt-in restores the frame without inventing a new variant.
2. **No new variants.** Resist the urge to add `compact`, `frosted`, `accent-edge` etc. Composition via children + className is sufficient through D2.

---

## 4 · ActionTile — clean as landed; tighten variant intent

Five variants: `dashboard | mode-tool | next-action | deferred | critical`.

- `dashboard` — no edge accent, neutral border, all-purpose card unit.
- `mode-tool` — 2px blue left edge (`--anth-action-primary`) — for the **mode-tool launcher row** on the Environment Command Centre.
- `next-action` — 2px blue left edge (`--anth-info`) — for "what you should do next" prompts.
- `deferred` — dashed border, sunken bg, muted ink — for capability not yet wired.
- `critical` — 2px red left edge + err-tint bg — for blocking/critical states.

> **Conflation risk:** `mode-tool` and `next-action` both render a 2px blue left edge against `var(--anth-info)`. They differ only by token name (`--anth-action-primary` aliases `--anth-info` today, so visually identical). Document that the visual collision is intentional (both are "go here to do this thing") and that any future token retune that splits them stays inside the design system, not the components.

### Forward plan — ActionTile (D2-window)

1. **Header → metric → summary → body order is correct.** Do not reorder.
2. **`metric` slot defaults to display-stack 22px.** Good for KPI cards; loud for prose tiles. Add an opt-in `metricStyle: "hero" | "mono-num"` so tile authors can render an inline mono numeric instead of the 22px display.
3. **Chip default mapping is good:** deferred → `capability/deferred`, critical → `risk/critical`. Keep auto-mapping for those two; require explicit chips elsewhere.
4. **No new variants for D2.** Dashboard card spec (§7 below) composes entirely from existing five.

---

## 5 · AnthIcon + iconRegistry — split plan

**Current shape (`iconRegistry.tsx`, 132 lines, ~40 glyphs):**

- 11 groups: `shell | mode | network-device | cloud | topology | workflow | status | assess | build | intake | security`.
- One array, one map, one `resolveIcon(id)` API.
- All glyphs are placeholder line-icons (24×24, currentColor, 1.5 stroke). Final artwork is Bujar's swap.

This works while the set is ~40, but it's already showing seams:

- `mode` glyphs are coupled to the ModeRail's hardcoded mode list (12 + opsConsole). When the mode catalogue moves to a contract (see §8), the icon group must move with it or it goes stale.
- `network-device` will explode as vendor coverage grows (router, switch, firewall, server, endpoint today → wifi-ap, ips, lb, optical, transponder, dwdm-mux, satellite, etc.). One file = merge contention.
- `assess`, `build`, `intake`, `security` are mode-flavoured but the actual glyphs are workflow/affordance verbs (report, pipeline, checklist, wrench, upload, parser, shield, key). They belong to **workflow vocabulary**, not to a mode.

### Recommended split (no API break)

Keep `AnthIcon` and `resolveIcon` unchanged. Split the **source** of `ICONS` into per-domain files merged at module load:

```
src/components/icons/
  AnthIcon.tsx                  (unchanged)
  iconRegistry.tsx              (only assembles + exports; no glyphs)
  registry/
    shell.tsx                   (menu, search, cortex, settings, chevrons)
    status.tsx                  (ok, warn, err, info, deferred + future leds)
    workflow.tsx                (play, pause, step, clock, report, pipeline,
                                 checklist, wrench, deploy, upload, parser,
                                 shield, key)
    topology.tsx                (node, link, cluster, 3d, minimap)
    network-device.tsx          (router, switch, firewall, server, endpoint,
                                 wifi-ap, optical, ...)
    cloud-site.tsx              (cloud, datacenter, campus, edge, retail-site)
    mode.tsx                    (mode-* glyphs — driven by mode catalogue;
                                 see §8 — adding a mode lands its glyph here)
```

`iconRegistry.tsx` becomes:

```ts
import { SHELL_ICONS }    from "./registry/shell";
import { STATUS_ICONS }   from "./registry/status";
import { WORKFLOW_ICONS } from "./registry/workflow";
import { TOPOLOGY_ICONS } from "./registry/topology";
import { DEVICE_ICONS }   from "./registry/network-device";
import { CLOUD_ICONS }    from "./registry/cloud-site";
import { MODE_ICONS }     from "./registry/mode";

const ICONS = [
  ...SHELL_ICONS, ...STATUS_ICONS, ...WORKFLOW_ICONS,
  ...TOPOLOGY_ICONS, ...DEVICE_ICONS, ...CLOUD_ICONS, ...MODE_ICONS,
];
const REGISTRY = new Map(ICONS.map((i) => [i.id, i]));
export function resolveIcon(id: string) { return REGISTRY.get(id) ?? null; }
export const ICON_IDS = ICONS.map((i) => i.id);
```

- IconDescriptor type and stroke discipline (`fill: none`, 1.5 stroke, currentColor) move to a shared `registry/_atoms.ts`.
- Group enum collapses from 11 → 7 (the seven files above). `assess/build/intake/security` glyphs fold into `workflow` (which is what they are).
- Consumer API is **unchanged**. `AnthIcon id="status-ok"` still works.
- Merge contention drops because each domain ships its own file.
- The mode-icon file binds to the mode catalogue (§8), so adding a contract mode forces an icon-side change in the same PR.

### Eight-id minimum for the mode catalogue

Whatever the mode count becomes (11–13 today, may flex), every catalogue entry must resolve `iconId` against `MODE_ICONS`. The registry should refuse to boot if a catalogue mode has no matching glyph. (Today AnthIcon falls back to a placeholder square — keep that for unknown IDs, but **fail boot if a registered mode has no icon**. Different failure modes for different consumers.)

---

## 6 · Chip — clean as landed

Four variant families × tones:

| Family | Tones | Use |
|---|---|---|
| `capability` | available · partial · deferred · blocked | what this surface can/can't do right now |
| `readiness`  | empty · partial · ready · blocked         | how prepared something is |
| `risk`       | info · warning · critical                  | severity of an open issue |
| `status`     | ok · warn · err · info · idle              | generic shell state |

Tokens already factored (`--anth-chip-{family}-{tone}-{bg,ink}`). No new tones for D2.

### Forward plan — Chip (D2-window)

1. **Add an `interactive` boolean.** Currently a chip is a span; some surfaces (the env table's events column, the readiness-by-domain rows) want a clickable chip. Promote to a polymorphic component with `as` and `onClick`, keep `interactive=false` by default.
2. **`dot` prop is good.** No change.
3. **Resist adding a `size` prop.** Density on chips fragments the visual rhythm; 20px is correct.

---

## 7 · D2 Dashboard Card — visual spec

The board renders the spec; the doctrine below is the contract it implements.

**Anatomy.** A D2 dashboard card is `Surface variant="card" padding="default"` wrapping:

```
┌─ Header row (28px) ───────────────────────────────────────────┐
│  AnthIcon (md) │ TITLE · uppercase 11px tracked │ Chip │ ⋯  │
├───────────────────────────────────────────────────────────────┤
│  Metric block: hero numeric (22 display) + secondary (mono)   │
│  Optional sparkline (28px) or readiness meter                 │
├───────────────────────────────────────────────────────────────┤
│  Body: KV grid · table snippet · status list · action footer  │
└───────────────────────────────────────────────────────────────┘
```

Composition rules:

1. **Header is fixed at one row.** Title truncates; chip never wraps to a new line.
2. **One chip max in the header.** Additional state goes in the body (KV row or status list).
3. **Hero numeric is monospaced via `--anth-font-mono`, tabular nums on.** Display stack reserved for section headers.
4. **Sparkline / meter sits directly under the metric block.** 28px tall, 1.4px stroke, 12% fill.
5. **Body table snippets cap at 5 rows.** Past 5, the card is the wrong primitive — promote to a panel.
6. **Footer is `AnthButton variant="ghost" size="sm"`.** "Open in OPERATE", "Run assessment", etc. Never `variant="primary"` inside a card — primary belongs to the surface-level workflow.
7. **No drop-shadow card grid.** Cards live in a 12-col grid with 1px hairlines between, not a floating-card SaaS gallery. Per visual law.

**Status-color usage on cards.**

- Border-left 2px tonal accent allowed only for `critical` (red), `mode-tool` (blue), `next-action` (blue), `deferred` (dashed neutral). Use `ActionTile` for these — not a custom card.
- Neutral dashboard cards do NOT carry a left accent. The chip in the header carries the state.
- Hero number is never colored. The chip and sparkline carry color. Numbers stay `--anth-text`.

**Density.** D2 dashboard cards run at cockpit-compact (32px row) inside `.anth[data-density="compact"]`. Don't switch density per card.

---

## 8 · Sidebar / ModeRail — contract-driven concept

**Current implementation** (`src/components/shell/ModeRail.tsx`) hardcodes a 12-mode catalogue grouped into four sections (Foundation · Run · Governance · Workshop) plus an `opsConsole` foot item — **13 entries total**. The `ANTHRACITE_V1_SOURCE_OF_TRUTH.md §5` doctrine lists 7 canonical modes (HOME, BUILD, OPERATE, DIAGNOSE, INTELLIGENCE, FORGE, ASSESS). The implementation has outgrown the doctrine; this is the gap the contract-driven rail closes.

### Catalogue evolution (accepted)

The catalogue is treated as **evolving forward**, not snapped back to the §5 doctrine. The representative shape exercised by the visual spec is:

- **FOUNDATION** — Hierarchy · Intake · Discovery · Provisioning · **Devices** (5)
- **RUN** — Operate · Topology · Diagnose (3)
- **GOVERNANCE** — Assess · Intelligence · Security · **Events** (4)
- **WORKSHOP** — Build · Forge · Settings (3)

Two new top-level modes are added (Devices, Events). Two existing modes grow rich child trees:

| Mode | Children | Notable shape |
|---|---|---|
| Hierarchy    | 8 incl. environment lifecycle (Creating · Building · Synchronizing · Sync status · Environment island) | mixed states |
| Devices      | 9 (Inventory · Selected · Data sources · Comparison · Network utilisation · Compliance overview · Traffic flows · Virtual topologies · Endpoint search) | one deferred (Virtual topologies) |
| Provisioning | 9 incl. a **depth-2 group** (Reconciling Config → Device / Container)                                | one ZTP deferred · one alerts badge |
| Events       | 8 (Event overview · View event · Event generation · Notifications · Categories · Syslog event point · PTP events · Event rules / sources) | PTP deferred · alerts badge |

This forces the rail design to support **variable count AND variable depth** — depth-2 children today, depth-3 cap reserved in the contract for any future tree that needs it.

### Mode catalogue contract (proposed `src/contracts/modeCatalogue.ts`)

```ts
export interface ModeChild {
  readonly id: string;
  readonly label: string;
  readonly iconId?: string;
  readonly state: "available" | "partial" | "deferred" | "blocked";
  readonly kind: "tool" | "workflow" | "surface" | "group"; // "group" = folder node
  readonly badge?: number;
  readonly route?: string;
  readonly children?: readonly ModeChild[]; // optional · recursive · depth cap = 3
}

export interface ModeEntry {
  readonly id: string;
  readonly label: string;
  readonly iconId: string;        // must resolve in registry/mode.tsx
  readonly group: string;         // groups derived from this field — never hardcoded
  readonly state: "available" | "partial" | "deferred" | "blocked";
  readonly children: readonly ModeChild[];   // empty array = no children, NOT undefined
  readonly badges?: { alerts?: number; deferred?: number; blocked?: number };
}

export interface ModeCatalogue {
  readonly version: number;
  readonly modes: readonly ModeEntry[];
}
```

The rail consumes this contract. It does not know mode names. It does not assume a count. It does not assume a depth. Group order is the order groups first appear in the array. Mode order is the array order.

### Honest-state rule

Catalogue entries may exist **before their feature surfaces do**. The rail does not lie about availability — the `state` field carries the truth:

- `available` — feature is wired and operator-usable.
- `partial`   — partially wired; some sub-tools live, others not yet.
- `deferred`  — entry exists in the catalogue and roadmap; not wired in V1.
- `blocked`   — entry exists but is unreachable now (RBAC, contract failure, license).

Deferred and blocked rows render in their own trailing groups inside the Context Sidebar. They are **never** silently filtered out. The operator sees the full intended shape, with truth-grade attribution.

### Layout concepts (see spec board for visuals)

**Concept A — Two-pane rail (recommended).**

- **ModeRail** (56 px collapsed / 196 px expanded): icon + label per mode, grouped by `group`. No children visible here.
- **Context Sidebar** (240–280 px, opens to the right of the rail): renders the active mode's children grouped by kind (Workflows · Tools · Surfaces · Groups · Deferred · Blocked). Each child is a row with `iconId`, label, capability LED, optional badge, and an expand caret if the row has its own children.
- **Main canvas** is always the work surface. Children never spill into it.
- Collapsed rail still shows the active mode + a chevron; clicking either opens the Context Sidebar.

**Concept B — Single rail with disclosure.**

- ModeRail expands inline; the active mode's children render beneath its row as a flush sub-list.
- Other groups stay collapsed.
- Saves horizontal real estate but mixes orientation (mode-level) and execution (child-level) in one column. With Devices (9), Provisioning (9 + sub-tree), and Events (8), the disclosure cost scales fast — lower groups can drop below the fold.

**Concept C — Top sash + rail.**

- A 36 px horizontal "mode sash" between the titlebar and the canvas shows mode tabs at high density. Rail goes away.
- Children appear in a left Context Sidebar the same width as Concept A.
- Sash maxes out around 14–16 modes. At the current 15-mode catalogue without Devices/Events allowed to grow further, the sash is already saturated. **Parked.**

**Concept D — Command-palette-only.**

- No rail; mode switch happens via Cortex (`Ctrl K`). Active mode shows in the titlebar.
- A Context Sidebar still exists for children.
- High-density operators love it; new operators get lost. Keep as a power-user opt-in **on top of** Concept A.

### Behaviour the rail must support (binding)

- **Variable count**, 6 / 10 / 15 / N. Groups derived from contract; never hardcoded.
- **Variable depth.** Children recursive. Concept A supports any depth; depth cap (3) lives in the contract, not the rail.
- **Children** per mode — tools, workflows, surfaces, **groups** (folder nodes). Renders only on the active mode in Concepts A/C/D; inline-expanded in Concept B.
- **Capability state per mode and per child** — `available · partial · deferred · blocked`. 6 px LED in the leading gutter of every Context Sidebar row, including sub-rows.
- **Modes with zero live children** show the mode label only — no empty sub-list. Labelled empty state in the sidebar names the mode state.
- **Deferred / blocked rows** render in trailing groups. Never silently filtered.
- **Overflow / scroll.** Rail body scrolls; group headers sticky. **Sidebar body scrolls independently** when the tree is taller than the viewport. Foot (Ops Console, density toggle, collapse) is fixed.
- **Collapsed rail** is 56 px wide with icons only; group separators become 1 px rules; capability LEDs preserved. Hovering opens the Context Sidebar.
- **Keyboard.** `↑↓` walks rail items (skipping group headers); `→` opens / focuses first child in sidebar; `←` returns focus to the rail; `Enter` activates; **`Space` toggles a tree node**; `Esc` closes the sidebar; `Tab` exits the rail to the canvas. Group headers are non-focusable.
- **Focus ring** uses the global `--anth-ring-*` tokens — never custom.
- **Canvas guarantee.** Mode / tool navigation NEVER renders inside the main canvas. The canvas is the work surface. This is the rule the catalogue evolution doesn't get to bend.

### Recommendation

**Adopt Concept A — Two-pane rail (ModeRail + Context Sidebar + Main canvas).**

It is the only concept that holds at 15+ modes with depth-2 trees, gives children a dedicated column without stealing canvas, and matches the doctrine's separation between orientation (which mode) and execution (which tool in this mode). Concept B should be the **collapsed-rail fallback** when horizontal space is short. Concept D ships as a Cortex behaviour, not a layout. Concept C is parked.

---

## 9 · Deliverable inventory (this stage)

- `D1B_PLAN.md`                        — this file.
- `D1B Review.html`                    — visual deliverable: cover, spec boards, dashboard card spec, sidebar concepts. Renders via `design-canvas.jsx`.
- `spec/spec.css`                      — consolidated read-only copy of landed primitive CSS (tokens + AnthButton + Surface + ActionTile + Chip) for the visual deliverable. **Reference only — not a source of truth.** The real source remains the imported `src/` tree.

## 10 · Out of scope for this stage

- App.css migration sweeps (deferred per decision).
- Dark theme variant (D1 is light only).
- New variants on any primitive.
- Mode catalogue migration (separate stage — D1C or D2-pre).
- Cortex command behaviours (separate stage).
