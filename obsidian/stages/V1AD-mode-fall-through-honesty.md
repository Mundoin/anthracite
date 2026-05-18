# V1AD — Mode Fall-Through Honesty

**Arc:** HONEST-HIERARCHY (V1AA ✓ · V1AB ✓ · V1AC ✓ · V1AD ✓) — **arc closed**
**Date:** 2026-05-18
**Status:** complete

---

## Objective

Replace the silent fall-through to the hierarchy render for
8 unbuilt ModeRail entries with honest `<ModeNotConnected />`
placeholders. Each placeholder declares `DataSourceState =
"not_connected"` and names the engine not yet wired. Built
modes (hierarchy, intake, assess) remain byte-identical to V1AC.

---

## Scope in

**New files:**
- `src/data/modeStatus.ts` — `ModeBodyState`, `ModeStatus`, `MODE_STATUS` (23 LOC)
- `src/data/__tests__/modeStatus.test.ts` — 4 exhaustiveness + coverage tests
- `src/components/shell/ModeNotConnected.tsx` — placeholder component (27 LOC)
- `src/components/shell/ModeNotConnected.css` — co-located styles (25 LOC)
- `src/components/shell/__tests__/ModeNotConnected.test.tsx` — 6 render tests
- `obsidian/stages/V1AD-mode-fall-through-honesty.md` — this note

**Edited files:**
- `src/components/shell/ModeRail.tsx` — `MODE_LABELS` export added (additive, pure data)
- `src/App.tsx` — 3 imports + not_connected dispatch block added before intake branch
- `docs/architecture/HIERARCHY_HONESTY_CONTRACT.md` — H8 added; V1AD arc roadmap updated to past tense
- `obsidian/ANTHRACITE_INDEX.md` — V1AD row; HONEST-HIERARCHY arc closed

---

## Scope out

No Rust diff. No DataSourceState extension. No AppShell / StatusBar /
OpsStrip / DataSourceTag / Inspector edits. No intake / assess / hierarchy
rendering changes. No new colour tokens. No new npm/Cargo dependencies.

---

## Design decisions

**`MODE_LABELS` exported from ModeRail.tsx.** Labels exist internally in
`MODE_GROUPS`. Rather than duplicating them in `modeStatus.ts`, a pure-data
`export const MODE_LABELS` derived from `MODE_GROUPS.flatMap(...)` was added.
Zero behaviour change. This is the only ModeRail edit and is flagged per scope.

**Dispatch before intake/assess.** The `not_connected` check is the first
branch in the App.tsx dispatch region. It evaluates `MODE_STATUS[activeMode]`,
which covers all 11 ModeIds. The intake and assess branches below become
unreachable for not_connected modes. Hierarchy falls through to its own render
as before.

**`statusRight(layoutView, undefined)` for not_connected modes.** The
not_connected branch passes `undefined` for `activeRow` so the status bar
shows the list-view format (no seeded row data for an unbuilt mode).

---

## ENGINE_AND_API_BOUNDARIES.md cross-check

| ModeId       | engineName in MODE_STATUS          | Doctrine match |
|--------------|------------------------------------|----------------|
| hierarchy    | Environment Engine                 | ✓ exact        |
| intake       | Intake / Parser                    | surface (no engine named) |
| assess       | Validator / Receipt                | surface (no engine named) |
| provisioning | Provisioning Engine                | ⚠ not listed — doc has Config Generation + Config Pull/Diff |
| operate      | Monitoring / Sentinel Engine       | ⚠ compound — doc splits into Monitoring/Polling + Sentinel |
| topology     | Topology Engine                    | ✓ exact        |
| diagnose     | Diagnostic / Hypothesis Engine     | ✓ exact        |
| security     | Compliance Engine                  | ✓ exact        |
| dashboards   | Reporting Engine                   | ✓ exact        |
| build        | Config Generation Engine           | ✓ exact        |
| settings     | Settings (local)                   | special case; no engine in doc |

**Overrides noted:** `provisioning` uses "Provisioning Engine" (not yet in
ENGINE_AND_API_BOUNDARIES.md — future engine to be named when the mode is
built). `operate` uses a compound "Monitoring / Sentinel Engine" (doc
separates them). Both are acceptable V1AD placeholders; the entry must be
updated when the mode body lands.

---

## Halt conditions — status

- HA1 All engine names resolvable ✓ (two named, not verbatim — noted above)
- HA2 ModeRail 11 IDs match prompt ✓
- HA3 App.tsx structural change only in dispatch ✓
- HA4 Built modes byte-identical ✓
- HA5 No Rust diff ✓
- HA6 ModeNotConnected.tsx ≤ 60 LOC (actual: 27) ✓
- HA7 DataSourceState not extended ✓
- HA8 App.tsx anchors L208 confirmed ✓
- HA9 MODE_STATUS coverage complete — 11 entries ✓

---

## Lessons for next stage

- `MODE_STATUS` is now the discipline gate for mode body launches —
  any stage that ships a mode body must flip its entry to `"built"`.
- `MODE_LABELS` in ModeRail is now exported; future consumers can
  import it without further ModeRail edits.
- `ModeNotConnected` is reusable as-is for any future not_connected ModeId.
- HONEST-HIERARCHY arc is closed. Next discovery / topology / nav-IA
  work starts outside this arc.

---

## Suggested commit message

```
stage-v1ad: mode fall-through honesty — ModeNotConnected placeholder closes HONEST-HIERARCHY arc
```
