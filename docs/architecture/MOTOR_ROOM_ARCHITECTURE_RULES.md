# MOTOR_ROOM_ARCHITECTURE_RULES

Active V1 engine law. Adapted from the old Anthracite architecture rules
(see `docs/old_anthracite/ARCHITECTURE_RULES.md`,
`FINDING_CONFIDENCE_MODEL_v1.md`, `CORTEX_VOCABULARY.md`) and compressed to
what the V1 Rust/Tauri/React stack must actually enforce.

These rules apply from V1K onward to every parser, collector, validator,
baseline, ranking, hypothesis, and surface change. Forge / learning / drill
/ puzzle / journal / sound / protocol workshop material is **quarantined**
and does not enter motor-room planning unless Bujar revives it explicitly.

## 1. Layering rules

- React is the terminal operator surface. No logic, no truth.
- Rust engines own deterministic truth, model, and validation.
- Python sidecars (later) collect evidence only. They never decide.
- UI consumes complete typed bundles. It does not assemble from fragments.
- Lower layers never depend on UI state. Engines do not know which panel
  is open or which mode is active.
- Engines expose typed contracts (invoke commands, model types) only.
- No hidden runtime-only truth. If a fact matters, it lives in a model
  field, not in transient state.

## 2. Evidence rules

- Raw collected text (config, CLI output, archive) is **evidence**.
- Parsed canonical models are **truth candidates**, never raw evidence.
- Unknown / unparsed config lines are first-class evidence (V1I
  `UnknownConfigLine`). Never dropped.
- Suppressed findings stay retained internally. Visibility filtering does
  not delete data.
- Every finding must carry evidence references sufficient for offline
  audit: source, line range, parser version, registry version.
- Missing data produces explicit `missing` / `unsupported` / `not_collected`
  states. Never silent zero, never inferred default.

## 3. Pipeline rules

The V1 canonical pipeline (full contract:
[`ENGINE_PIPELINE_CONTRACT.md`](./ENGINE_PIPELINE_CONTRACT.md)):

```
evidence intake
  → normalise (vendor detection + parser → canonical model)
  → baseline evaluate
  → rank findings
  → noise group
  → exception filter
  → hypothesis
  → explanation compositor
  → display projection
```

- Ranking operates on the **full internal finding stream** before any
  display filtering. Display gates must not feed back into ranking.
- Noise grouping is **display-level grouping** only. It groups identical
  signals for the operator; it never mutates truth.
- Exceptions **suppress display, not evidence retention**. Suppressed
  findings carry a `visibility_reason` and remain queryable.
- Hypothesis consumes ranked findings + topology + drift + baseline
  context. It is downstream-only; it cannot invent new facts.
- Explanation compositor combines upstream signals. It does not parse
  raw config, query devices, or invent findings.

## 4. Vendor / parser rules

- Vendor / platform IDs come from the Vendor Registry Engine (V1H,
  [`vendor_registry.rs`](../../src-tauri/src/engines/vendor_registry.rs)).
  No parser invents its own ids.
- Parser selection is deterministic from the platform reference returned
  by the Config Detection Engine (V1J).
- Unsupported vendor / platform returns an explicit `unsupported` status
  in the `PlatformRef` and `DeviceModel.parse_confidence.warnings`.
- Parser output normalises into the canonical `DeviceModel`. No
  vendor-shaped root fields.
- Raw vendor CLI never leaks past the parser boundary except as evidence
  reference or raw artefact stored in `EvidenceMetadata` / `unknown_lines`.
- Parser state is per-device, per-run. No global mutable parser state.
- Parser outputs explicit `unknown` / `default` / `absent` distinctions.
  Absent ≠ default ≠ unknown.
- Vendor quirks are documented adjacent to the parser code and exercised
  by per-vendor golden fixtures (V1L).
- Cross-vendor comparisons use canonical models only. Never raw config
  string compares.

## 5. Confidence / finding rules

Adapted from `docs/old_anthracite/FINDING_CONFIDENCE_MODEL_v1.md`.

- `severity`, `confidence`, and `visibility` are independent axes. A
  finding can be high severity / low confidence / hidden, or any combo.
- Signal categories: `HARD` (deterministic from canonical model),
  `DERIVED` (computed from multiple HARD signals), `HEURISTIC` (rule-set
  pattern with calibrated confidence).
- Confidence thresholds are named constants in one place, never inline
  magic numbers.
- Visibility gating retains a `visibility_reason` (suppressed_by_rule,
  noise_grouped, below_confidence_threshold, exception_match, etc.).
- Weak / ambiguous signals can produce retained internal findings with
  suppressed visibility — preserved for audit + future re-evaluation.
- Finding keys are deterministic. Same input + same engine version =
  byte-identical finding id. No timestamps, no UUIDs in the key.
- **V1P intentionally defers `confidence` and `visibility / suppression`
  axes.** The shipped Validator Engine emits only `severity` and
  `signal` plus structured evidence. Confidence and visibility return
  as additive fields in a later stage (bumping `VALIDATOR_VERSION`).
  See [`VALIDATOR_ENGINE_CONTRACT.md`](./VALIDATOR_ENGINE_CONTRACT.md)
  §"Non-goals (V1P)".

## 6. Baseline / ranking / risk rules

- Baselines describe **expected operational state**, not desired state.
  Intent goes elsewhere (later: change generation).
- Structural assertions (topology shape, addressing scheme) belong to
  consistency / topology engines, not the baseline engine.
- Missing metric → **skipped finding**, never guessed finding. A
  baseline cannot evaluate what it cannot see.
- Device-level trust / risk summaries are **derived** from findings.
  They are projections, not primary facts.
- Clean state is a valid output and must be emitted explicitly. Empty
  findings list ≠ "we forgot to look".

## 7. Snapshot / freshness rules

- Snapshots are immutable. Re-running a collection produces a new
  snapshot, never an in-place edit.
- Cached evidence carries `generation` / `freshness` metadata
  (timestamp, source kind, parser/registry version).
- Route / path / trace results expose their freshness to the surface.
- Stale data is a first-class state, not a hidden failure. Surfaces
  show it; engines do not silently re-use it.

## 8. Cortex rules for V1

- Cortex (old launcher / search / run surface) becomes the Anthracite
  launcher / search / run surface in React, later.
- Useful families to preserve when Cortex returns: navigation, mode
  switching, path / trace, route refresh, baseline, live config,
  discovery.
- Cortex calls typed invoke APIs over engines. It owns no truth.
- **Quarantined from V1 motor-room planning:** Forge, learning, drill,
  puzzle, journal, sound, protocol workshop. Listed for completeness in
  [`OLD_ANTHRACITE_ADAPTATION_MAP.md`](./OLD_ANTHRACITE_ADAPTATION_MAP.md)
  under §7.

## Cross-references

- [`ENGINE_PIPELINE_CONTRACT.md`](./ENGINE_PIPELINE_CONTRACT.md)
- [`VALIDATOR_ENGINE_CONTRACT.md`](./VALIDATOR_ENGINE_CONTRACT.md)
- [`OLD_ANTHRACITE_ADAPTATION_MAP.md`](./OLD_ANTHRACITE_ADAPTATION_MAP.md)
- [`VENDOR_ENGINE_PLAN.md`](./VENDOR_ENGINE_PLAN.md)
- [`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md)
- Source archive: `docs/old_anthracite/`
