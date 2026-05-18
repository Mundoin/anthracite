# V1AE — Settings Mode Body + Inspector Identity Real Promotion

**Arc:** HONEST-HIERARCHY (V1AA ✓ · V1AB ✓ · V1AC ✓ · V1AD ✓) — arc closed; V1AE is arc-validation
**Date:** 2026-05-18
**Status:** complete

---

## Objective

Two flips in one stage to validate H7 (boundary source-state) and H8 (mode body state)
end-to-end before Discovery Engine work begins.

**FLIP 1:** `settings` mode: `not_connected` → `built`. Build minimum honest read-only
body. Validates H8 flip-discipline.

**FLIP 2:** `inspectorIdentity` block: `demo` → `real` (conditional on overlay success).
Validates H7 boundary-placement under real engine swap.

**Combined-stage exception:** V1AE bundles two flips for arc-validation reasons. Future
stages default back to single-purpose discipline.

---

## Scope in

**New files:**
- `src/modes/settings/SettingsMode.tsx` — read-only settings body (three sections: Display, Engines, Operator)
- `src/modes/settings/SettingsMode.css` — co-located styles (reuse existing tokens)
- `src/modes/settings/__tests__/SettingsMode.test.tsx` — 6 render tests
- `obsidian/stages/V1AE-settings-and-identity-real.md` — this note

**Edited files:**
- `src/data/modeStatus.ts` — settings entry flipped: `not_connected` → `built`
- `src/data/__tests__/modeStatus.test.ts` — count update: 3→4 built, 8→7 not_connected
- `src/data/hierarchySource.ts` — `inspectorIdentityIsReal` boolean; `sourceStateByBlock.inspectorIdentity` conditional
- `src/data/__tests__/hierarchySource.test.ts` — 3 new tests (identity demo, identity real, demote on no-match)
- `src/App.tsx` — settings branch before not_connected check; SettingsMode import
- `docs/architecture/HIERARCHY_HONESTY_CONTRACT.md` — arc-validation note appended before H7
- `obsidian/ANTHRACITE_INDEX.md` — V1AE row

---

## Scope out

No Rust diff. No DataSourceState extension. No environment.ts edits. No hierarchySeeds.ts edits.
No ModeRail edits. No AppShell/OpsStrip/StatusBar/Inspector/DataSourceTag/ModeNotConnected edits.
No d1/d2 edits. No intake/assess edits. No tokens.css edits. No api/* edits. No new npm/Cargo deps.

---

## Design decisions

**Settings as first built mode without a Rust engine.** H8 states: "ModeRail entries whose
body is not yet built render `<ModeNotConnected />`". A mode body that IS built but sources
only local config (the locked industrial dark theme, the MODE_STATUS engine roster) needs no
engine. H8 explicitly supports this — body state is independent of engine state. The Engines
section surfaces engine readiness honestly via MODE_STATUS rather than pretending AAA is wired.

**inspectorIdentityIsReal condition.** The overlay at L64 of hierarchySource.ts uses
`r?.active_environment_id ? envs.find(...) ?? null : null`. The promotion is real only when
both conditions hold: `activeEnv !== null` AND `r?.active_environment_id != null`. If the
environment list hasn't loaded (envs = []), find() returns undefined → coerced to null →
promotion is false → stays demo. H1 aggregate stays demo because other blocks remain seeded.

**No aggregate promotion.** H1 (weakest-member rule) holds: all other blocks are demo. Even
with inspectorIdentity = "real", the aggregate sourceState remains "demo". HE6 does not fire.

---

## ENGINE_AND_API_BOUNDARIES.md — settings

Settings mode sources only `MODE_STATUS` (local TS constant) and theme info (hardcoded).
No engine, no Tauri command, no API call. HE10 does not fire.

---

## Halt conditions — status

- HE1 hierarchySource.ts ≤ 95 LOC ✓ (was 85, now 86)
- HE2 SettingsMode.tsx ≤ 80 LOC ✓
- HE3 No interactive elements ✓
- HE4 Only one visible change to hierarchy surface (identity marker disappears with real env) ✓
- HE5 DataSourceState not extended ✓
- HE6 Aggregate sourceState stays demo ✓
- HE7 No Rust diff ✓
- HE8 modeStatus exhaustiveness test passes with updated counts ✓
- HE9 Identity overlay already in place at L64 — no missing readiness fields ✓
- HE10 Settings has no Tauri calls ✓
- HE11 L64 overlay shape intact ✓

---

## Doctrine extension

Settings is the first `"built"` mode without a Rust engine. This extends the H8 discipline:
a mode body can be built if its content is honest about the absence of an engine (the Engines
section lists each mode's engine state via MODE_STATUS). The AAA Engine placeholder in the
Operator section is explicit `not_connected`. No silent claims.

---

## Lessons for Discovery Engine stage

- `MODE_STATUS` is the single gate for mode body state. Discovery/Topology modes flip when
  their bodies land — same discipline.
- `inspectorIdentityIsReal` condition is the template for future block promotions:
  `activeEnv !== null && r?.active_environment_id != null`. Future blocks add their own
  boolean at the boundary, never at the surface.
- H1 aggregate stays demo until ALL contributing blocks promote. Discovery Engine landing
  will need to promote `rows`, `listKpis`, and related blocks together.
- Settings mode is reusable as-is; the Engines section auto-updates as MODE_STATUS flips.

---

## Suggested commit message

```
stage-v1ae: settings mode body + inspector identity real promotion — arc-validation
```
