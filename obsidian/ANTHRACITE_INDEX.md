# ANTHRACITE_INDEX

Entry point for the Anthracite v1 project memory vault.

## What this vault is

Long-form, markdown-first project memory for **Anthracite** — a living network
intelligence cockpit. This vault is the *narrative* counterpart to the code
and to `PRODUCT.md` / `GOALS.md`.

## Layout

- [`stages/`](./stages/) — one note per build stage (V1A, V1B, V1C, …).
- [`decisions/`](./decisions/) — ADR-style decisions, dated `YYYY-MM-DD-<slug>.md`.
- [`agents/`](./agents/) — agent-specific notes (Claude, Codex, AO).
- [`build-log/`](./build-log/) — chronological session log.

## Stage map

| Stage | Status        | Note |
|-------|---------------|------|
| V1A   | complete      | [stages/V1A-ground-zero.md](./stages/V1A-ground-zero.md) |
| V1B   | complete      | Source of truth + architecture map |
| V1C   | complete      | [stages/V1C-environment-centre-spine.md](./stages/V1C-environment-centre-spine.md) |
| V1D   | complete      | [stages/V1D-environment-persistence.md](./stages/V1D-environment-persistence.md) |
| V1E   | complete      | [stages/V1E-environment-readiness.md](./stages/V1E-environment-readiness.md) |
| V1E-B | complete      | [stages/V1E-B-graphite-light.md](./stages/V1E-B-graphite-light.md) |
| V1E-C | complete      | [stages/V1E-C-noc-light.md](./stages/V1E-C-noc-light.md) |
| V1E-D | complete      | [stages/V1E-D-noc-dark.md](./stages/V1E-D-noc-dark.md) |
| V1E-E | complete      | [stages/V1E-E-noc-light-refinement.md](./stages/V1E-E-noc-light-refinement.md) |
| V1E-F | complete      | [stages/V1E-F-enterprise-polish.md](./stages/V1E-F-enterprise-polish.md) |
| V1E-G | complete      | [stages/V1E-G-typography-tune.md](./stages/V1E-G-typography-tune.md) |
| V1F   | complete · landed visual baseline | [stages/V1F-anthracite-master-shell-environment-port.md](./stages/V1F-anthracite-master-shell-environment-port.md) |
| V1G   | complete · engine buildout pivot (docs-only) | [stages/V1G-engine-buildout-pivot.md](./stages/V1G-engine-buildout-pivot.md) |
| V1H   | complete · Vendor Registry Engine | [stages/V1H-vendor-registry-engine.md](./stages/V1H-vendor-registry-engine.md) |
| V1I   | complete · Canonical Network Model | [stages/V1I-canonical-network-model.md](./stages/V1I-canonical-network-model.md) |
| V1J   | complete · Config Detection Engine | [stages/V1J-config-detection-engine.md](./stages/V1J-config-detection-engine.md) |
| V1J-A | complete · Motor Room Architecture Rules (docs-only) | [stages/V1J-A-motor-room-architecture-rules.md](./stages/V1J-A-motor-room-architecture-rules.md) |
| V1K   | complete · Cisco IOS / IOS XE parser L1/L2 | [stages/V1K-cisco-iosxe-parser.md](./stages/V1K-cisco-iosxe-parser.md) |
| V1L   | complete · Fixture corpus + receipt projection | [stages/V1L-fixture-corpus-and-receipts.md](./stages/V1L-fixture-corpus-and-receipts.md) |
| V1M   | complete · Juniper Junos parser L1/L2 | [stages/V1M-juniper-junos-parser.md](./stages/V1M-juniper-junos-parser.md) |
| V1N   | complete · Arista EOS parser L1/L2 + cross-vendor invariant | [stages/V1N-arista-eos-parser.md](./stages/V1N-arista-eos-parser.md) |
| V1N-A | complete · Parser contract hardening + debt ledger cleanup | [stages/V1N-A-parser-contract-hardening.md](./stages/V1N-A-parser-contract-hardening.md) |
| V1O   | complete · Config Intake operator surface (single config, stateless) | [stages/V1O-config-intake-surface.md](./stages/V1O-config-intake-surface.md) |
| V1O-A | complete · Config splitter engine + multi-device intake (batch view, drill-down) | [stages/V1O-A-multi-device-intake.md](./stages/V1O-A-multi-device-intake.md) |
| V1O-B | complete · Archive intake engine (zip / tar / tar.gz) + provenance + collapsed inventory | [stages/V1O-B-archive-intake.md](./stages/V1O-B-archive-intake.md) |
| V1P   | complete · Validator Engine + MGMT-HYG rule pack v1 + FindingsPanel above ReceiptDisplay | [stages/V1P-validator-engine.md](./stages/V1P-validator-engine.md) |
| V1P-A | complete · INTAKE two-lane workspace + semantic role tokens + lane-item accent rails | [stages/V1P-A-intake-visual-hierarchy.md](./stages/V1P-A-intake-visual-hierarchy.md) |
| V1Q   | complete · Batch Run Workspace — Analyse batch, per-row Stage + Findings, RunSummaryStrip, drill-down stored results | [stages/V1Q-batch-run-workspace.md](./stages/V1Q-batch-run-workspace.md) |
| V1R   | complete · Batch Run Export — deterministic JSON + Markdown copy actions, raw config omitted by default | [stages/V1R-batch-run-export.md](./stages/V1R-batch-run-export.md) |
| V1S   | complete · Save Batch Run Export to Files — Save JSON / Save Markdown, zero-dep file save via File System Access API | [stages/V1S-save-batch-run-export-files.md](./stages/V1S-save-batch-run-export-files.md) |
| V1T   | complete · Mixed archive corpus + BatchRun density proof (24 devices, 3 vendors) before sort/filter UI | [stages/V1T-mixed-archive-density-proof.md](./stages/V1T-mixed-archive-density-proof.md) |
| V1U   | complete · DIAG-HYG rule pack v1 + Cisco NX-OS parser L1/L2 (4th vendor, cross-vendor invariant) | [stages/V1U-diag-hyg-and-nxos.md](./stages/V1U-diag-hyg-and-nxos.md) |
| V1W   | halted · premise contradicted repo state (no ModeRail / App-root edits attempted); see V1W-R | — |
| V1W-R | complete · ASSESS artifact viewer — read-only viewer of V1R BatchRun export JSON, reuses FindingsPanel + RunSummaryStrip | [stages/V1W-R-assess-artifact-viewer.md](./stages/V1W-R-assess-artifact-viewer.md) |
| V1X   | complete · ASSESS triage v1 — search, severity/rule chips, by-device/by-severity views, per-device collapse; pure helpers in triage.ts | [stages/V1X-assess-triage-v1.md](./stages/V1X-assess-triage-v1.md) |
| V1Y   | complete · Shared display contract — RunSummaryStrip author/viewer modes, ASSESS displayAdapter, V1W-R synthetic-BatchRun adapter retired | [stages/V1Y-shared-display-contract.md](./stages/V1Y-shared-display-contract.md) |
| V1Z   | complete · ASSESS metadata + version-aware loading — AssessMetadataHeader, SUPPORTED_EXPORT_VERSIONS constant, tightened wrong_export_version message | [stages/V1Z-assess-metadata-version-awareness.md](./stages/V1Z-assess-metadata-version-awareness.md) |
| V1Z-A | complete · Telnet emission across 4 parsers + MGMT-HYG-004 + DIAG-HYG-004 land; RULE_PACK_VERSION 2→3, Junos NtpAccum parity fix; closes ASSESS-FORWARD arc | [stages/V1Z-A-telnet-and-parker-rule-retirement.md](./stages/V1Z-A-telnet-and-parker-rule-retirement.md) |
| V1AA  | complete · Hierarchy Honesty Contract + `DataSourceState` (docs + 20-LOC type module); opens HONEST-HIERARCHY arc | [stages/V1AA-hierarchy-honesty-contract.md](./stages/V1AA-hierarchy-honesty-contract.md) |
| V1AB  | complete · Hierarchy demo/empty labelling — `<DataSourceTag>` wired to D1/D2/Inspector/OpsStrip/StatusBar; all seeded values marked | [stages/V1AB-hierarchy-honest-labelling.md](./stages/V1AB-hierarchy-honest-labelling.md) |
| V1AC  | complete · Typed data-source boundary — seeds to `src/data/hierarchySeeds.ts`; `getHierarchyView` boundary in `src/data/hierarchySource.ts`; `source="demo"` literals replaced with `view.sourceStateByBlock.*`; H7 added | [stages/V1AC-environment-data-source-boundary.md](./stages/V1AC-environment-data-source-boundary.md) |
| V1AD  | complete · HONEST-HIERARCHY arc closed — 8 silent fall-through ModeIds replaced with `<ModeNotConnected />`; `MODE_STATUS` in `src/data/modeStatus.ts`; H8 added | [stages/V1AD-mode-fall-through-honesty.md](./stages/V1AD-mode-fall-through-honesty.md) |
| V1AE  | complete · Arc-validation — settings mode body (FLIP 1: H8 flip-discipline); inspectorIdentity real promotion (FLIP 2: H7 boundary); first built mode without engine | [stages/V1AE-settings-and-identity-real.md](./stages/V1AE-settings-and-identity-real.md) |
| V1AF  | complete · Discovery Engine spine — connected-but-empty, deterministic; device inventory boundary owned | [stages/V1AF-discovery-engine-spine.md](./stages/V1AF-discovery-engine-spine.md) |
| V1AG  | complete · Discovery empty-state integration — frontend adapter, App fetch, OpsConsoleMode surface; Hierarchy untouched | [stages/V1AG-discovery-empty-state-integration.md](./stages/V1AG-discovery-empty-state-integration.md) |
| V1AH  | complete · INTAKE → Discovery import preview pipe — first real pipe, preview-only, deterministic record-ID derivation | [stages/V1AH-intake-to-discovery-import-preview.md](./stages/V1AH-intake-to-discovery-import-preview.md) |
| V1AI  | complete · Discovery inventory persistence + authoritative import — first persisted inventory, JSON store, App refresh chain | [stages/V1AI-discovery-import-persistence.md](./stages/V1AI-discovery-import-persistence.md) |
| V1AI-A | complete · Product roadmap checkpoint + agent-local hygiene (docs-only) — 3-group roadmap, parser-prep lane, `.codex/`/`nul` ignored | [stages/V1AI-A-roadmap-checkpoint.md](./stages/V1AI-A-roadmap-checkpoint.md) |
| V1AJ  | complete · Topology read model + workspace v1 — TopologyEngine spine, get_topology_view command, TopologyMode list/grid, source state honest | [stages/V1AJ-topology-read-model-and-workspace.md](./stages/V1AJ-topology-read-model-and-workspace.md) |
| V1AK  | complete · Discovery Inventory Browser — operator-facing read-only browser inside Hierarchy Devices detail, live source state, three-body-state (unavailable/empty/loaded), record detail | [stages/V1AK-discovery-inventory-browser.md](./stages/V1AK-discovery-inventory-browser.md) |
| V1AL  | complete · Topology Adjacency Readiness — 4 fact-source categories (LLDP/CDP/config-neighbor/manual) declared with present:false; state machine (NoneAvailable→Partial→Ready) auto-transitions on future ingestion; TopologyMode adds "Adjacency readiness" section; 0 reliable links honest | [stages/V1AL-topology-adjacency-readiness.md](./stages/V1AL-topology-adjacency-readiness.md) |
| V1AM  | complete · Topology Link Fact Pipeline — Topology Engine gains `TopologyLinkFact` and `project_edges_from_link_facts(nodes, facts)`; `TopologyEdge` carries interface refs + evidence; readiness is data-driven from real fact counts; live `get_topology_view` still passes zero facts; engine is the socket future ingestion stages plug into | [stages/V1AM-topology-link-fact-pipeline.md](./stages/V1AM-topology-link-fact-pipeline.md) |
| V1AN  | landed · Parser-Derived Neighbour Evidence Intake — Topology Engine gains `TopologyNeighborEvidence` + deterministic mapper `map_neighbor_evidence_to_link_facts(nodes, evidence)` + internal `project_with_neighbor_evidence(env, records, evidence)`. Accepted evidence becomes `TopologyLinkFact` and projects through V1AM's edge pipeline. Unknown-remote and self-link evidence rejected. Live command path unchanged. Vendor parser extraction is next. | [stages/V1AN-parser-derived-neighbour-evidence-intake.md](./stages/V1AN-parser-derived-neighbour-evidence-intake.md) |
| V1AO  | landed · Persisted Neighbour Evidence Store + Live Topology Edges — `TopologyEvidenceStore` (trait + Null + JSON-file impls) persists explicit evidence per environment. `get_topology_view` reads stored evidence and projects real edges + readiness counts + rejection diagnostics. New Tauri commands: import/get/clear. TopologyMode adds import panel + rejection banner + edge list. No parser extraction yet; operator imports manually; parser stages follow in V1AP+. | [stages/V1AO-persisted-neighbour-evidence-store.md](./stages/V1AO-persisted-neighbour-evidence-store.md) |
| V1AP  | landed · Raw Neighbour Output Import + Inventory Resolver — Bounded, topology-owned parsers extract LLDP/CDP entries from raw vendor output (IOS-XE, EOS). Exact inventory resolver matches nodes by hostname/record_id only. Accepted evidence persists into V1AO store, projecting through V1AN/V1AM into live edges. NX-OS/Junos explicitly unsupported and honestly rejected. | [stages/V1AP-raw-neighbour-output-import.md](./stages/V1AP-raw-neighbour-output-import.md) |
| V1AQ  | landed · Vendor Raw Output Coverage Expansion — V1AP parsers extended to NX-OS LLDP/CDP, Junos LLDP (terse), IOS-XR LLDP, EOS CDP (plus optional Huawei VRP, Nokia SR OS). Platform hint selector in UI routes dispatcher deterministically. Auto cascade preserves first-match. FortiOS/MikroTik explicitly unsupported with honest rejections. Resolver, store, pipeline unchanged. | [stages/V1AQ-vendor-raw-output-coverage-expansion.md](./stages/V1AQ-vendor-raw-output-coverage-expansion.md) |
| V1AR  | landed · Evidence Set Management + Merge Semantics — Topology evidence store gains explicit import modes (replace/append/merge) with deterministic dedup on 5-tuple. Source labels and evidence notes merge with lex-sorted joins. Empty incoming never wipes. New summary exposes active counts, labels, kinds. Mode radio + Evidence Summary panel + Clear-with-confirmation in UI. V1AM/V1AN/V1AP/V1AQ pipeline unchanged; future SSH and parser ingestion plug into managed store. | [stages/V1AR-evidence-set-management.md](./stages/V1AR-evidence-set-management.md) |
| V1AS  | landed · Topology Edge Review + Graph-Ready Surface — Pure-frontend review surface inside TopologyMode. New `topologyReview.ts` adapter (review rows, stats, aggregate rejection summary, graph-ready contract). Stats strip, kind+text filters, selected-edge inspector, evidence drilldown, "renderer not attached" handoff note. Existing edge-list testids preserved. No Rust changes, no parser changes, no live collection, no graph renderer. | [stages/V1AS-topology-edge-review-graph-ready-surface.md](./stages/V1AS-topology-edge-review-graph-ready-surface.md) |

## V1J-A adaptation

V1G/V1H/V1I/V1J built the first engine spine. **V1J-A** imports and
adapts the old Anthracite motor-room rules into compact V1 law before
parser work proceeds. Forge / learning / drill / puzzle / journal /
sound / protocol workshop families are explicitly quarantined.

New architecture docs:

- [`../docs/architecture/MOTOR_ROOM_ARCHITECTURE_RULES.md`](../docs/architecture/MOTOR_ROOM_ARCHITECTURE_RULES.md) — V1 engine law (layering, evidence, pipeline, vendor/parser, confidence, baseline, snapshot, Cortex).
- [`../docs/architecture/ENGINE_PIPELINE_CONTRACT.md`](../docs/architecture/ENGINE_PIPELINE_CONTRACT.md) — nine-stage pipeline contract + old→V1 concept map.
- [`../docs/architecture/OLD_ANTHRACITE_ADAPTATION_MAP.md`](../docs/architecture/OLD_ANTHRACITE_ADAPTATION_MAP.md) — active-now / activate-later / quarantined categories.

Next stage: **V1K — Cisco IOS / IOS XE parser L1/L2.**

## V1G pivot

Direction D / Anthracite Master remains the visual source of truth. Mainline
work now moves to the motor room: vendor intelligence + deterministic engines.

New architecture docs:

- [`../docs/architecture/VENDOR_ENGINE_PLAN.md`](../docs/architecture/VENDOR_ENGINE_PLAN.md) — engine roster, L0–L6 maturity, V1H → V1O sequence.
- [`../docs/architecture/CANONICAL_NETWORK_MODEL.md`](../docs/architecture/CANONICAL_NETWORK_MODEL.md) — internal vendor-neutral network language.
- [`../docs/architecture/VENDOR_PLATFORM_REGISTRY.md`](../docs/architecture/VENDOR_PLATFORM_REGISTRY.md) — first vendor / platform target list.

## Conventions

- Vault is read-write for both Claude and Codex.
- One note per stage. Stage notes link forward and backward.
- Decisions are dated and never deleted — superseded decisions link to their
  replacement.
- Build log entries are short and chronological. Stage notes are the long form.

## Source-of-truth pointers

- Product: [`../PRODUCT.md`](../PRODUCT.md)
- Goals: [`../GOALS.md`](../GOALS.md)
- Codex: [`../AGENTS.md`](../AGENTS.md)
- Claude: [`../CLAUDE.md`](../CLAUDE.md)
- README: [`../README.md`](../README.md)
