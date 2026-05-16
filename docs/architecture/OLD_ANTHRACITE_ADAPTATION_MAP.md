# OLD_ANTHRACITE_ADAPTATION_MAP

What from the old Anthracite (PyQt monolith) is active now, what waits
for which stage, what is quarantined.

Source archive lives at `docs/old_anthracite/`. That folder is a reference
mine, not mandatory reading. This map says when each concept switches on.

## 1. Active now (V1G–V1J)

Already encoded in shipped V1 engines and docs:

- **Vendor registry.** 17 platforms with stable ids — `vendor_registry.rs`,
  `VENDOR_PLATFORM_REGISTRY.md`.
- **Canonical network model.** Vendor-neutral `DeviceModel` and child
  types — `network_model.rs`, `CANONICAL_NETWORK_MODEL.md`.
- **Config detection.** Weighted-signature deterministic platform
  detection — `config_detection.rs`.
- **Parser boundaries.** Parser selection deterministic from registry;
  raw CLI never leaks past parser.
- **Unknown evidence retention.** `UnknownConfigLine` first-class in the
  model.
- **Finding / confidence law.** Severity / confidence / visibility as
  independent axes (`MOTOR_ROOM_ARCHITECTURE_RULES.md` §5).
- **Pipeline contract.** Full nine-stage contract
  (`ENGINE_PIPELINE_CONTRACT.md`).

## 2. Activate during parser stages (V1K → V1O)

- Normalised parser output into `DeviceModel`.
- Per-vendor golden fixture corpus + receipts (V1L).
- Malformed / partial / edge-case fixtures.
- Explicit `unsupported` / `missing` / `not_collected` distinctions on
  every model area.
- Vendor quirks documented next to the parser module + exercised by
  fixtures.

## 3. Activate during topology / path stages

- Topology graph engine.
- Path tracer.
- L2 / L3 split.
- Route freshness metadata.
- Longest-prefix-match (LPM) order rules.
- Failure domain calculation.
- Single-point-of-failure (SPOF) rules.
- Immutable snapshot store.

## 4. Activate during baseline / risk stages

- `BaselineProfile` / `ResolvedBaseline` equivalent in Rust.
- Ranking stage operating on full internal stream.
- Noise grouping (display-only).
- Exception filtering with retained `visibility_reason`.
- Hypothesis engine consuming ranked + topology + drift + baseline.
- Explanation compositor.

## 5. Activate during live access stages

- Python sidecar collectors (Netmiko / Scrapli / NAPALM style). Evidence
  only — they never decide.
- SNMP polling boundary.
- Pull / diff / deploy / terminal flows.
- Rust remains the truth / model / validation / policy broker.

## 6. Surface later (React)

- Cortex launcher (navigation, mode switching, path / trace, route
  refresh, baseline, live config, discovery).
- Panels per mode.
- Topology canvas.
- Terminal overlay.
- Inspector projection surface.

## 7. Quarantined

Not part of V1 motor-room planning. Do not import, adapt, or reference in
parser / pipeline work. Listed only so it is clear they have been
considered and intentionally set aside:

- Forge.
- Learning.
- Drill.
- Puzzle.
- Journal.
- Sound.
- Protocol workshop.

Re-entry rule: only Bujar revives any of these. Until then they stay in
the old archive.

## Cross-references

- [`MOTOR_ROOM_ARCHITECTURE_RULES.md`](./MOTOR_ROOM_ARCHITECTURE_RULES.md)
- [`ENGINE_PIPELINE_CONTRACT.md`](./ENGINE_PIPELINE_CONTRACT.md)
- [`VENDOR_ENGINE_PLAN.md`](./VENDOR_ENGINE_PLAN.md)
- Source archive: `docs/old_anthracite/`
