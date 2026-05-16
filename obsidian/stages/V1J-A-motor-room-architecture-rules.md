# V1J-A — Motor Room Architecture Rules

**Status:** complete (docs-only)
**Date:** 2026-05-16
**Anchor at start of stage:** `cfa5763 stage-v1j: add config detection engine`
**Predecessor:** V1J — Config Detection Engine
**Successor (recommended):** V1K — Cisco IOS / IOS XE parser at L1/L2

## Why this stage exists

V1G → V1J built the first motor-room spine: vendor registry, canonical
model, config detection. Before parser stages begin (V1K onward), the
useful laws from the old Anthracite PyQt monolith need to land as
**active V1 rules**, not buried in `docs/old_anthracite/`.

Without this, V1K and beyond risk drifting into:
- isolated parser toys with no contract back to the pipeline,
- UI-first thinking that mutates truth from the surface,
- silent loss of old-product knowledge (confidence axes, evidence
  retention, baseline / ranking / noise / exception discipline).

This stage adapts those laws into compact V1 docs and quarantines the
parts that do not belong in V1 (Forge family).

## What old architecture concepts were preserved

From `docs/old_anthracite/`:

- **Layering discipline.** UI is surface; engines own truth.
- **Evidence vs truth split.** Raw bytes are evidence; canonical model
  is truth candidate. Unknown / unparsed lines remain first-class.
- **Pipeline shape.** evidence → normalise → baseline → rank → noise
  group → exception filter → hypothesis → compositor → display.
- **Finding confidence model.** Independent severity / confidence /
  visibility axes; HARD / DERIVED / HEURISTIC signal categories;
  retained visibility reason.
- **Vendor / parser boundary.** Stable platform ids, deterministic
  parser selection, raw vendor CLI bounded to parser boundary, explicit
  unsupported / missing / unknown distinctions.
- **Baseline discipline.** Expected operational state only; missing
  metric = skipped finding; clean state is explicit output.
- **Snapshot / freshness law.** Immutable snapshots, freshness metadata,
  stale is a state.
- **Cortex family.** Useful surface families preserved for later
  (navigation, mode switching, path / trace, route refresh, baseline,
  live config, discovery).

## What was adapted to Rust / Tauri / React

- All pipeline stages are now Rust-engine slots; the React surface is
  always the bottom of the pipeline, never an intermediate stage.
- Truth / model / validation moves to Rust. Python sidecars (later)
  collect evidence only.
- Cortex returns as a React launcher over typed invoke APIs, not as a
  monolithic Python window.
- The "AssessOrchestrator + pdf_report" pattern becomes a Rust assess
  pipeline + Rust/React renderer.
- The "Config Engine" family folds into V1H / V1I / V1J already live,
  with V1K+ filling in parsers.

## Forge quarantine statement

The Forge, learning, drill, puzzle, journal, sound, and protocol
workshop families are **explicitly quarantined** from V1 motor-room
planning. They are listed in
[`OLD_ANTHRACITE_ADAPTATION_MAP.md`](../../docs/architecture/OLD_ANTHRACITE_ADAPTATION_MAP.md)
§7 only to make the boundary visible. They do not appear in the V1
pipeline, the motor-room rules, the engine roadmap, or any future
parser / collector stage.

Re-entry rule: only Bujar revives any of these. Until then they stay in
the old archive and do not influence V1 design choices.

## What changed (docs-only)

New:
- `docs/architecture/MOTOR_ROOM_ARCHITECTURE_RULES.md`
- `docs/architecture/ENGINE_PIPELINE_CONTRACT.md`
- `docs/architecture/OLD_ANTHRACITE_ADAPTATION_MAP.md`
- `obsidian/stages/V1J-A-motor-room-architecture-rules.md` (this note)

Updated:
- `obsidian/ANTHRACITE_INDEX.md` (V1J-A row + adaptation paragraph)

## What did NOT change

- No Rust code touched. No TypeScript. No UI / CSS.
- No parser implementation. No Python sidecar. No Netmiko / Scrapli /
  NAPALM. No live device access. No topology rendering. No Forge
  planning.
- `docs/old_anthracite/*` left intact as source archive.
- Existing architecture docs (`VENDOR_ENGINE_PLAN.md`,
  `CANONICAL_NETWORK_MODEL.md`, `VENDOR_PLATFORM_REGISTRY.md`) untouched.

## Next stage

**V1K — Cisco IOS / IOS XE parser at L1/L2.** First parser, executed
under the rules adopted here. Populates `DeviceModel` for detected
`cisco-iosxe` configs across inventory + topology areas, with
`ParseConfidence` and `UnknownConfigLine` properly filled. Golden
fixtures + receipts land in V1L.

## Cross-references

- [`../../docs/architecture/MOTOR_ROOM_ARCHITECTURE_RULES.md`](../../docs/architecture/MOTOR_ROOM_ARCHITECTURE_RULES.md)
- [`../../docs/architecture/ENGINE_PIPELINE_CONTRACT.md`](../../docs/architecture/ENGINE_PIPELINE_CONTRACT.md)
- [`../../docs/architecture/OLD_ANTHRACITE_ADAPTATION_MAP.md`](../../docs/architecture/OLD_ANTHRACITE_ADAPTATION_MAP.md)
- [`V1J-config-detection-engine.md`](./V1J-config-detection-engine.md)
