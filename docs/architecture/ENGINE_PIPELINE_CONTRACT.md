# ENGINE_PIPELINE_CONTRACT

V1 canonical pipeline contract. Every motor-room engine fits into one of
these stages and respects the boundary above and below it.

Companion to [`MOTOR_ROOM_ARCHITECTURE_RULES.md`](./MOTOR_ROOM_ARCHITECTURE_RULES.md).
Adapted from the old Anthracite pipeline (collect → normalize → baseline →
rank → noise group → exception filter → hypothesis → compositor → display).

## Pipeline

```
[1 evidence intake]
        │
        ▼
[2 normalisation]   ← vendor_registry + config_detection + parsers
        │
        ▼
[3 baseline]        ← expected operational state
        │
        ▼
[4 ranking]         ← full internal finding stream
        │
        ▼
[5 noise grouping]  ← display-only collation
        │
        ▼
[6 exception filter]← visibility gating, retain internally
        │
        ▼
[7 hypothesis]      ← causal grouping from upstream signals
        │
        ▼
[8 compositor]      ← combine + rank for surface
        │
        ▼
[9 display projection] → React surfaces
```

Each stage may add to the bundle; none may rewrite upstream truth.

## 1. Evidence Intake

**Inputs (V1):** config paste, file import, archive, synthetic golden
fixture, eventually Python-sidecar collectors (SSH/SNMP/NETCONF).

**Outputs:** raw evidence + `EvidenceMetadata` (source, source_kind,
captured_at, byte_size, line_count).

**Rules:** never parses, never decides. Bytes in, evidence record out.

## 2. Normalisation

**Inputs:** raw evidence.

**Outputs:** populated `DeviceModel` + `ParseConfidence` +
`UnknownConfigLine[]`.

**Steps:**
1. Vendor detection (`config_detection` engine, V1J) → `PlatformRef`.
2. Parser selection from `vendor_registry` (V1H) using `platform_id`.
3. Parser populates canonical model areas it supports at its maturity
   level. Anything it does not understand goes to `unknown_lines`.
4. `ParseConfidence` records counts, score, observed maturity, warnings.

**Rules:** raw vendor CLI does not leave this stage except as evidence
ref. Cross-vendor comparison happens *only* on the canonical model.

## 3. Baseline

**Inputs:** `DeviceModel`(s) + resolved baseline profile (future).

**Outputs:** finding stream tagged with baseline rule id, severity,
confidence, signal category (HARD / DERIVED / HEURISTIC).

**Rules:** missing input metric → skipped finding, not guessed. Clean
state is an explicit emission, not silence.

## 4. Ranking

**Inputs:** full internal finding stream.

**Outputs:** stable, deterministically ordered finding stream.

**Rules:** sort uses (severity, confidence, impact) with explicit
tiebreakers (e.g. finding key). No randomness, no timestamps. Operates on
**full** stream — display filters live downstream.

## 5. Noise Grouping

**Inputs:** ranked finding stream.

**Outputs:** grouped projection for display + ungrouped internal stream
preserved.

**Rules:** grouping is presentation-level. Internal stream is unchanged.

## 6. Exception Filtering

**Inputs:** ranked + grouped stream + exception ruleset.

**Outputs:** visibility-tagged stream. Suppressed findings remain
queryable with `visibility_reason`.

**Rules:** never deletes findings. Only flips `visibility` axis.

## 7. Hypothesis

**Inputs:** ranked findings + topology + drift + baseline context.

**Outputs:** causal groupings ("these 7 findings share root cause R"),
including contradictions ("hypothesis H1 explains 5, contradicts 2").

**Rules:** downstream-only. Never invents primary facts. Contradictions
are first-class output, not silenced.

## 8. Compositor

**Inputs:** every upstream signal (findings, hypotheses, topology,
freshness, parse confidence).

**Outputs:** surface-ready projection bundles.

**Rules:** combine + rank + render. No new fact invention. No
re-querying upstream engines.

## 9. Display Projection

**Inputs:** compositor bundle.

**Outputs:** typed projection delivered to React via invoke API.

**Rules:** React may annotate (highlight, expand, hover) but never
mutates underlying truth. UI state stays in UI.

## Old Python/PyQt concept → V1 equivalent

| Old (PyQt monolith) | V1 (Rust engines + React surface) |
|---|---|
| TopologyGraph | future Rust topology engine (post-V1L) |
| Rankings | Rust ranking stage (post-baseline) |
| FailureDomain, SPOF rules | Rust topology / consistency engine |
| Drift | Rust diff engine over snapshots |
| PathTracer, L3Tracer | Rust path/trace engine + future collector |
| Snapshots | immutable evidence + model snapshots in Rust store |
| BaselineEngine / BaselineStore / BaselineProfile | Rust baseline engine (V1P+) |
| RouteParser / RouteCollector | Rust route parser inside vendor parsers + Python collector later |
| HypothesisEngine | Rust hypothesis engine (post-baseline) |
| ExplanationCompositor | Rust compositor stage |
| DiscoveryOrchestrator + Strategies | Rust orchestrator behind typed invoke API |
| SNMPEngine, walkers, stores, pollers | Python-sidecar collector boundary; Rust normalises to DeviceModel |
| ComplianceEngine + YAML rules | Rust rules engine consuming canonical model |
| AssessOrchestrator + pdf_report | Rust assess pipeline + Rust/React renderer |
| Config Engine (vendor) | Rust parser + model + (later) render spine — V1H/V1I/V1J already live |
| BUILD: DraftStore/StagingStore/FabricatedStore/renderers | Rust change-generation engine (V1 long tail, L6) |
| LIVE: Connection/Deploy/Pull/Diff/Drift/Poll/Terminal/Ash | Python sidecar evidence + Rust policy/broker; React terminal overlay |
| Cortex (launcher / search / run) | React launcher surface over typed invoke APIs |
| Panels per mode, topology canvas, context panel, terminal overlay | React surfaces, one per mode, consuming projection bundles |

## Cross-references

- [`MOTOR_ROOM_ARCHITECTURE_RULES.md`](./MOTOR_ROOM_ARCHITECTURE_RULES.md)
- [`OLD_ANTHRACITE_ADAPTATION_MAP.md`](./OLD_ANTHRACITE_ADAPTATION_MAP.md)
- [`VENDOR_ENGINE_PLAN.md`](./VENDOR_ENGINE_PLAN.md)
- [`CANONICAL_NETWORK_MODEL.md`](./CANONICAL_NETWORK_MODEL.md)
- [`VENDOR_PLATFORM_REGISTRY.md`](./VENDOR_PLATFORM_REGISTRY.md)
- Source archive: `docs/old_anthracite/`
