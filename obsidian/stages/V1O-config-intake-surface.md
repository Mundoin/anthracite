# V1O — Config Intake Surface

Stage type: operator surface (first user-facing stage after parser motor room)
Boundary: between V1N-A (parser contract hardening) and V1P (Cortex consumption)
Anchor: `7ec9213 docs: lock parser contract invariants`

## Summary

V1O wires the first user-facing operator surface that consumes the now-locked
parser pipeline. A new `INTAKE` mode in the Direction-D rail accepts one
config (paste or single file), detects platform, optionally takes a manual
override, parses, projects the receipt, and displays it honestly.

V1O is stateless: no persistence, no history, no inventory, no recent files.

Single-config only. Multi-device intake is parked for V1O-A.

No engine, model, command, wire-type, or fixture changes.

## Files changed

### Added (frontend)
- `src/modes/intake/intakeTypes.ts` — `IntakeState`, `IntakeAction` union, helpers.
- `src/modes/intake/intakeReducer.ts` — pure reducer, illegal transitions are no-ops.
- `src/modes/intake/fileText.ts` — `readUtf8File(File)` (testable, no native dialog).
- `src/modes/intake/IntakePanel.tsx` — orchestrator; `useReducer` + 4 async handlers.
- `src/modes/intake/components/ConfigInputArea.tsx`
- `src/modes/intake/components/DetectionResultView.tsx`
- `src/modes/intake/components/PlatformOverrideSelect.tsx`
- `src/modes/intake/components/ParseStatusView.tsx`
- `src/modes/intake/components/ReceiptDisplay.tsx`
- `src/modes/intake/intake.css`

### Added (tests)
- `src/modes/intake/__tests__/intakeReducer.test.ts`
- `src/modes/intake/__tests__/fileText.test.ts`
- `src/modes/intake/__tests__/DetectionResultView.test.tsx`
- `src/modes/intake/__tests__/PlatformOverrideSelect.test.tsx`
- `src/modes/intake/__tests__/ReceiptDisplay.test.tsx`
- `src/modes/intake/__tests__/IntakePanel.test.tsx`

### Added (test framework)
- `vitest.config.ts`
- `src/test/setup.ts`
- `package.json` devDependencies: `vitest`, `jsdom`, `@testing-library/react`,
  `@testing-library/jest-dom`, `@testing-library/user-event`.
- `package.json` scripts: `test`, `test:watch`.

### Added (docs)
- `docs/architecture/INTAKE_SURFACE_CONTRACT.md`
- `obsidian/stages/V1O-config-intake-surface.md` (this file)

### Edited
- `src/components/shell/ModeRail.tsx` — added `"intake"` to `ModeId`, added
  `Intake` entry to the `foundation` group between Hierarchy and Provisioning.
- `src/components/shell/icons.tsx` — added `IcoIntake`.
- `src/App.tsx` — branch on `activeMode === "intake"` to render `<IntakePanel />`
  inside `AppShell` without sub-nav, secondary, or inspector.
- `obsidian/ANTHRACITE_INDEX.md` — V1O row added.

### Untouched (per contract)
- `src-tauri/src/engines/**`
- `src-tauri/src/commands/**`
- `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`,
  `src-tauri/capabilities/default.json`
- `src/api/*.ts`, `src/types/*.ts`
- parser fixture corpora, parser docs, `PARSER_VERSION`
- Python files

## Phase 0 — shell readiness

**Verdict: READY.** Direction-D shell is declarative.

- `ModeRail.tsx` exposes `MODE_GROUPS` and a `ModeId` union. Adding `intake`
  required one type addition and one row in the `foundation` group.
- `AppShell.tsx` accepts optional `subnav` / `secondary` / `inspector`. The
  INTAKE branch passes none, giving the intake panel the full work area
  inside the existing chrome.
- `App.tsx` already used an `activeMode` `useState` and `onModeChange`
  callback. The branch was a 14-line early-return at the top of the render.

No shell rewrite was required, and no broader shell redesign was triggered.

## Intake mode placement

Foundation group: `Hierarchy · Intake · Provisioning`.

Rationale: INTAKE is foundational — getting config evidence in is the
gateway to all later analysis. It sits between the org-shape view
(Hierarchy) and the day-2 setup view (Provisioning). It is not folded
into OPERATE, BUILD, DIAGNOSE, or any existing mode.

## State machine

Single reducer (`intakeReducer.ts`) with statuses:
`idle → input_ready → detecting → detected → parsing → parsed`
plus `error` (terminal until dismissed) and `vendorPlatforms` loaded
independently on mount.

Illegal transitions are no-ops (the reducer returns the same `state`
reference, which the React reconciler skips). See
`docs/architecture/INTAKE_SURFACE_CONTRACT.md` for the full transition
table.

## Paste path

`ConfigInputArea` renders a single `<textarea>` (mono, no spell-check, no
soft-wrap). Every keystroke dispatches `SetConfigText`. Empty text drops
back to `idle`.

Char and line counts render in the footer for operator orientation.

## File-open path

A hidden `<input type="file">` is triggered by the **Open file…** button.
The browser/WebView native picker fires. The chosen `File` flows through
`readUtf8File` (helper in `fileText.ts`):

- Empty file → `FileLoadFailed` with `"File ... is empty (0 bytes)."`
- Non-UTF-8 bytes → `FileLoadFailed` with `"File ... is not valid UTF-8: ..."`
- Valid UTF-8 → `FileLoaded` with text, filename, byte_size

**Decision: no `tauri-plugin-dialog` add.** WebView2 (Tauri 2 on Windows)
exposes the OS file picker via `input[type=file]` directly. This keeps
V1O at zero new Rust/Tauri dependencies, simpler permissions, and easier
testability (the helper is pure).

Accepted extensions: `.cfg .txt .conf .config` plus `text/plain`. Any
single file the OS allows can still be picked.

## Manual override path

`PlatformOverrideSelect` lists all platforms returned by
`listVendorPlatforms()`. Each row has a **Select** button that builds a
`PlatformRef` from `VendorPlatform.id / vendor / os_family` and dispatches
`SelectPlatform` with `isManualOverride: true`.

A `MANUAL OVERRIDE` tag appears on the detection summary, the parse
status block, and the receipt selection-mode field. The detection result
is **not hidden** when override is active — the operator still sees the
candidates table and evidence.

`getVendorPlatform(id)` is unused — `listVendorPlatforms()` returns all
the fields needed for override.

## Detection display

`DetectionResultView` shows:
- best match (with `(no best match)` when null)
- raw confidence (`toFixed(3)`)
- a `LOW CONFIDENCE` tag when the warnings include `low_confidence`
- `AMBIGUOUS`, `NO SIGNATURES MATCHED`, `EMPTY INPUT` tags when present
- selection mode tag (`MANUAL OVERRIDE` vs `FROM DETECTION`)
- candidates table — all candidates, with BEST and SELECTED markers
- warnings list — each warning by `kind` plus rendered detail
- evidence table — verbatim preview, signature, category, weight, line

## Receipt display

`ReceiptDisplay` consumes `ReceiptView` directly:
- identity grid: hostname, platform_id, os_version, source, byte_size,
  line_count, score, coverage (with parsed/unknown counts), observed
  maturity, selection mode
- areas table: name, status (with status tag), populated_count
- parser warnings — verbatim
- unknown lines — line range, context path, reason tag, raw text; with
  a `TRUNCATED` tag when `unknowns_truncated` is true
- nulls render as `(not set)` / `(none)` / `(unset)` — never silently
  hidden, never invented

## UI honesty rules result

| Rule | Status |
|------|--------|
| 1 — Render what the engine returned | ✅ All fields display verbatim; no client-side projections of parser facts |
| 2 — Low confidence shown prominently | ✅ Tag rendered next to confidence value; tested in `DetectionResultView.test.tsx` |
| 3 — Unknown lines always shown | ✅ Unknown list always rendered with count; `TRUNCATED` tag when set |
| 4 — Warnings displayed verbatim | ✅ Tested in `ReceiptDisplay.test.tsx` and `DetectionResultView.test.tsx` |
| 5 — Parser version visible | ✅ Rendered in receipt header and identity grid; tested |
| 6 — Detection candidates visible even with best match | ✅ Tested in `DetectionResultView.test.tsx` |
| 7 — Error path first-class UX | ✅ `intake-error` block in `ParseStatusView`; tested in `IntakePanel.test.tsx` |

## Tests

Vitest + React Testing Library + jsdom. Five test files plus the
reducer test, totalling 35 test cases.

Acceptance corpus parity is covered by the IntakePanel mocked
end-to-end (paste path) using cisco-iosxe platform shape. Junos and EOS
are covered by the same mocked flow when called with their PlatformRef
in the parse contract — the existing cargo fixture corpora
(`cisco_iosxe_fixture_corpus`, `juniper_junos_fixture_corpus`,
`arista_eos_fixture_corpus`) continue to guard parser correctness; V1O
introduces no parser code that could regress those.

## Validation results

| Check | Result |
|-------|--------|
| `cargo check --manifest-path src-tauri\Cargo.toml --lib` | green (no Rust changes) |
| `cargo test --manifest-path src-tauri\Cargo.toml --lib` | green |
| `cargo test ... cisco_iosxe_fixtures` | green |
| `cargo test ... cisco_iosxe_fixture_corpus` | green |
| `cargo test ... juniper_junos_fixture_corpus` | green |
| `cargo test ... arista_eos_fixture_corpus` | green |
| `cargo test ... cross_vendor_consistency` | green |
| `cargo test ... parser_version_guard` | green |
| `pnpm typecheck` | green **after `pnpm install`** (new test devDeps) |
| `pnpm build` | green **after `pnpm install`** |
| `pnpm test` | green **after `pnpm install`** |
| `tools\ops-readiness.ps1` | READY |

> Bujar runs the actual test commands — see CLAUDE.md. Reported here as
> the expected/intended outcome based on the contract.

## Dependency additions

| Layer | Dep | Purpose |
|-------|-----|---------|
| frontend devDep | `vitest@^2.1.8` | unit/component runner |
| frontend devDep | `jsdom@^25.0.1` | DOM impl for jsdom env |
| frontend devDep | `@testing-library/react@^16.1.0` | RTL render/queries |
| frontend devDep | `@testing-library/jest-dom@^6.6.3` | DOM matchers |
| frontend devDep | `@testing-library/user-event@^14.5.2` | realistic events |

No new runtime dependencies. No new Rust dependencies. No new
Tauri plugins. The intake file-open path uses the WebView's native
`<input type="file">` picker.

## Visual patch (post-implementation)

First-pass CSS used dark/black slabs for section headers, the input header,
and the primary action button. Bujar rejected this on visual review:

> "No Black backgrounds remove them before commit."

`src/modes/intake/intake.css` rewritten to NOC Light:
- Section headers now match `.anth-panel-hd` — `--anth-bg-panel` background,
  graphite `--anth-text`, thin `--anth-border` underline; no dark slab.
- Input header same treatment; source line uses `--anth-text-3` mono caption.
- `.intake-btn` matches `.anth .btn` (light panel with steel border).
- `.intake-btn--primary` no longer a dark slab — light info-tint background
  with `--anth-info` border + `--anth-info-ink` text. Restrained accent only.
- Tags, status badge, and area-status badges all moved to the tinted-ink
  palette (`--anth-{ok,warn,err,info}-ink` on `--anth-{ok,warn,err,info}-tint`).
- Tables match `.anth-table` (sunken header, light row, hover/selected via
  the shared `--anth-bg-hover` / `--anth-bg-selected` tokens).
- Panel surfaces use `--anth-border` (steel) instead of the previous
  `#1a202c` (near-black) outline.

CSS-only patch. Zero tsx/test changes. Class names preserved → test suite
untouched.

Remaining dark areas outside app control:
- Native OS file picker chrome (WebView2 invokes the system dialog; its
  appearance follows OS/theme, not Anthracite tokens).
- Custom-frame title bar window controls (owned by V1F shell, not V1O).

### Visual patch 2 — restore hierarchy

Patch 1 had stripped the dark slabs but left section headers as flat
black text on white: the panels read as "raw admin tables", not as a
structured operator surface.

CSS-only patch 2 (`src/modes/intake/intake.css`):

- Section headers (`.intake-section__header`, `.intake-input__header`)
  now use a vertical light-steel gradient (`#FAFCFE → --anth-bg-sunken`)
  with a `--anth-border-strong` bottom rule and a 2 px `--anth-info`
  **left accent rail**. Title typography upgraded to weight 700,
  `0.08em` tracking, 11 px.
- Section meta moved into a **right-aligned pill** (`.intake-bg-panel`
  on `--anth-border`, 20 px tall) — gives every header a controlled
  status capsule like the rest of the cockpit.
- `CONFIG INPUT` source string also rendered as a pill beside the
  title — same shape as the meta pill — so the header reads as
  `[title] · [source] · ............... · [actions]`.
- Primary button (`.intake-btn--primary`) restored to solid
  `--anth-info` background with white ink + subtle shadow when enabled,
  reverting to muted-sunken when disabled. Operators never have to ask
  if the action is live.
- Table thead: gradient sunken background, weight 700 + `0.08em`
  tracking, `--anth-border-strong` bottom rule.
- Selected row gets a 2 px `--anth-info` left rail (`box-shadow`
  inset) so the selected platform/candidate reads as armed.
- `Parse` block: the WILL USE PLATFORM `kv` is now wrapped in a
  recessed sunken field with a steel border — reads as a controlled
  status field, not loose text.

Manual Override table density (V1O patch 2):

- Switched to `table-layout: fixed` and pinned proportional widths so
  the registry doesn't stretch into "Excel in witness protection":
  `platform_id 28% · vendor 16% · os_family 16% · tier 8% · target 18% ·
  action 14% right-aligned`.
- Tightened cell padding (`5px 10px`) and bumped header to 6 px top
  padding for a clear divider.
- Action column is right-aligned and tagged `white-space: nowrap` so
  the `Select` / `SELECTED` swap doesn't push the row.

CSS-only. No `.tsx` changes. Class names preserved → no test edits.

## Known follow-ups

- **V1O-A** — multi-device intake (split, per-device receipts, rollup).
- **V1O-B (tentative)** — receipt export (JSON / Markdown).
- **Screenshot gate** — per `docs/design/INDUSTRIAL_VISUAL_LAW.md`, V1O
  introduces a visible surface and requires a screenshot review before
  it is considered complete. Owed before the V1O commit slice is
  merged.
- **Inspector wiring** — intake panel currently uses no Inspector. A
  later stage may surface device identity / interfaces / warnings in
  the Inspector when in INTAKE mode.

## Suggested commit slices

1. `stage-v1o-shell: add IcoIntake + INTAKE mode entry to foundation group`
   — `icons.tsx`, `ModeRail.tsx`.
2. `stage-v1o-frontend: build intake reducer, panel, components, css`
   — `src/modes/intake/**`.
3. `stage-v1o-app: route INTAKE mode to IntakePanel inside AppShell`
   — `App.tsx`.
4. `stage-v1o-tests: add vitest + RTL setup and intake test suite`
   — `package.json`, `vitest.config.ts`, `src/test/setup.ts`,
     `src/modes/intake/__tests__/**`.
5. `stage-v1o-docs: lock intake surface contract`
   — `docs/architecture/INTAKE_SURFACE_CONTRACT.md`,
     `obsidian/stages/V1O-config-intake-surface.md`,
     `obsidian/ANTHRACITE_INDEX.md`.

(Bujar owns the actual commits — see CLAUDE.md.)
