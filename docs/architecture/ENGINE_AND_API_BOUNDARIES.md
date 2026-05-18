# Engine and API Boundaries — Anthracite V1

> Companion to `ANTHRACITE_V1_SOURCE_OF_TRUTH.md` and
> `MODES_AND_ENGINES_MAP.md`.
> Each engine here is **deterministic** in V1. No LLM, no fuzzy heuristic
> inside an engine. Engines expose **typed APIs** consumed by modes via the
> Rust ↔ TS bridge (Tauri commands or a comparable typed transport).
> If a screen needs a capability that doesn't fit an existing engine,
> propose a new engine here first — never grow it inside a mode.

API surface concepts below are intentionally abstract (verb-noun shapes).
They are contracts, not Rust signatures. Concrete signatures land in code
during their build stage.

---

## Environment Engine

- **Responsibility.** Define, persist, switch, and expose the active
  operator *environment* (the production estate being worked on).
- **Owned data.** Environment definitions, active selection, environment-
  scoped configuration.
- **API surface concept.** `listEnvironments`, `getActive`, `setActive`,
  `createEnvironment`, `updateEnvironment`, `deleteEnvironment`.
- **Consumers.** HOME (primary), every other mode (read active).
- **Test requirement.** Round-trip of definition, selection persistence,
  cold-start reads the last active environment deterministically.
- **Must NOT own.** Inventory, devices, vendor model — only the
  environment record they belong to.

---

## AAA / RBAC / Audit Engine

- **Responsibility.** Operator identity, role/permission model, audit log
  of operator actions.
- **Owned data.** Operator profile, roles, permissions, signed audit
  entries.
- **API surface concept.** `currentOperator`, `can(action, target)`,
  `recordAudit(event)`, `queryAudit(filter)`.
- **Consumers.** Every mode that mutates state or surfaces protected
  data. Ambient.
- **Test requirement.** Permission decisions are pure functions of role +
  action. Audit entries are append-only and tamper-evident.
- **Must NOT own.** UI for sign-in screens (mode owns surface). Domain
  facts other than identity/permission.

---

## Inventory Engine

- **Responsibility.** Authoritative list of devices, interfaces, and their
  logical relationships within an environment.
- **Owned data.** Device records, interface records, tags, ownership.
- **API surface concept.** `listDevices(env)`, `getDevice(id)`,
  `upsertDevice`, `removeDevice`, `listInterfaces(deviceId)`.
- **Consumers.** HOME (summary), BUILD, OPERATE, DIAGNOSE, FORGE, ASSESS.
- **Test requirement.** Idempotent upserts, stable IDs, query results
  deterministic.
- **Must NOT own.** Vendor capability model, topology adjacency, live
  state.

---

## Vendor Model Engine

- **Responsibility.** Vendor and platform capability model — what a
  device of vendor X / platform Y can do, expose, and accept.
- **Owned data.** Vendor catalogue, platform capabilities, syntax models,
  feature flags.
- **API surface concept.** `listVendors`, `getPlatform(id)`,
  `capabilities(platformId)`, `validate(deviceContext, intent)`.
- **Consumers.** BUILD, FORGE, Config Generation, Compliance, ASSESS,
  INTELLIGENCE.
- **Test requirement.** Vendor model is pure data + pure functions over
  it; no side effects.
- **Must NOT own.** Live device state, inventory IDs, environment
  context.

---

## Discovery Engine

- **Responsibility.** Deterministic, reproducible discovery of devices and
  facts about them. Produces typed evidence — never raw freeform text in
  consumer APIs.
- **Owned data.** Discovery runs, discovery facts, evidence snapshots.
- **API surface concept.** `runDiscovery(scope)`, `latestFacts(deviceId)`,
  `evidence(runId)`.
- **Consumers.** Inventory Engine (writes via discovery), Topology Engine,
  ASSESS, DIAGNOSE.
- **Test requirement.** Given a fixed input fixture, discovery produces a
  stable fact graph.
- **Must NOT own.** Inventory authoritative state (writes into it
  through typed transactions), topology rendering.

### V1AF status

Discovery Engine is implemented as a connected-but-empty spine. The single command
is `get_discovery_inventory(environment_id?: string)`, which returns a deterministic
empty `DiscoveryInventoryView`. No discovery I/O yet; `runDiscovery`, `latestFacts`,
and `evidence` are future surface. See `DISCOVERY_ENGINE_BOUNDARY.md` for ownership
details and planned inventory evolution phases.

### V1AH addition

V1AH adds `preview_discovery_import(environment_id, candidates)` — a preview-only, non-mutating command
that accepts INTAKE BatchRun-derived import candidates and returns typed acceptances + rejections + summary.
Discovery now owns the import-candidate intake seam; deterministic record-ID derivation and rejection logic
are engine-side. Persistence and actual inventory mutation remain future stages. See `DISCOVERY_ENGINE_BOUNDARY.md`
V1AH section for the full pipe contract, rejection-reason enum, record-ID format, and DeviceModel carry-through.

### V1AI addition

V1AI adds `import_discovery_records(environment_id, candidates) → DiscoveryImportCommitResult` — the first
mutating Discovery command. Recomputes acceptance against current store state and persists records to JSON
(`<app_data_dir>/discovery_inventory.json`). Discovery inventory is now persistent; `inventory_view()` returns
`source_state = "real"` when records are present. Introduces `DiscoveryStore` trait (persist/load abstraction).
First-wins on duplicate record ID (second import of same candidates returns `imported_count: 0`). See
`DISCOVERY_ENGINE_BOUNDARY.md` V1AI section for persistence schema, extended record fields, App refresh callback
chain, and INTAKE import action wording.

---

## Topology Engine

- **Responsibility.** Source of truth for topology adjacency: nodes,
  edges, layers, and the *information topology* and *live topology*
  graphs. Owns the graph; does **not** render it.
- **Owned data.** Graphs (information / live), layers, edge metadata,
  graph diffs.
- **API surface concept.** `getGraph(env, kind)`, `nodes`, `edges`,
  `subgraph(filter)`, `diffGraph(a, b)`.
- **Consumers.** OPERATE, DIAGNOSE, ASSESS, BUILD (read), Babylon
  rendering layer (read).
- **Test requirement.** Deterministic graph build from inventory +
  discovery + monitoring snapshot. Diffs are stable.
- **Must NOT own.** Rendering, camera state, selection UI, Babylon
  resources. Babylon is a renderer.

### V1AJ addition

V1AJ ships the Topology Engine spine + visible Topology workspace v1. New Rust `TopologyEngine`
with stateless `project(environment_id, records) -> TopologyView` method. New command
`get_topology_view(environment_id?) -> TopologyView` composes with Discovery Engine: reads
`inventory_view(env_id).records` from Discovery, passes them to Topology projector. Engine
produces typed node/edge/layer shapes; edges empty in V1AJ (no link-fact inference yet;
wire shape locked for future stages). Node IDs namespaced `topo::<discovery-record-id>`,
labels hostname-or-record-id fallback, role/layer always `"device"`/`"inventory"` in V1AJ.
Frontend TopologyMode v1 renders read-only node list, source state via `DataSourceTag`,
summary (nodes/edges/records). No graph viz library; Babylon rendering deferred. See
`TOPOLOGY_ENGINE_BOUNDARY.md` for ownership, determinism contract, and future stages.

### V1AL addition

V1AL extends `TopologyView` with `adjacency_readiness: TopologyAdjacencyReadiness` — a deterministic
contract explaining why edges are absent and which future link-fact sources will populate them.
Four new Rust types define the readiness state machine: `TopologyAdjacencyFactSourceState`
(NoneAvailable | Partial | Ready), `TopologyAdjacencyFactSourceKind` (Lldp | Cdp |
ConfigNeighbor | Manual), `TopologyAdjacencyFactSource`, and `TopologyAdjacencyReadiness`.
All 4 fact sources ship V1AL with `present: false, count: 0`; state transitions automatically
when future ingestion stages flip `present: true`. `eligible_node_count` (V1AL: all nodes)
supports future tightening via role/layer constraints. No new command; existing `get_topology_view`
passes adjacency readiness. TS types mirror the Rust contract. TopologyMode adds "Adjacency
readiness" section rendering per-source rows; existing "0 reliable links" line preserved.
No edge inference, no fake adjacency, no parser/DeviceModel/ModeRail changes. Scope-out
strict: pure readiness visibility. See `TOPOLOGY_ENGINE_BOUNDARY.md` V1AL section for
types, state semantics, determinism, and future hook.

### V1AM addition

V1AM lands explicit link-fact ingestion pipeline in the Topology Engine. New Rust `TopologyLinkFact`
struct carries `source_kind`, `local_node_id`, `remote_node_id`, `local_interface`,
`remote_interface`, `evidence`, and `source_label`. New `project_edges_from_link_facts(nodes, facts)
-> (edges, ProjectionStats)` helper deterministically projects edges from facts, handling
self-link rejection, unknown-node rejection, and symmetric dedup via canonical edge ID format
(`topo-edge::{kind}::{lo_node}::{lo_iface_or_*}::{hi_node}::{hi_iface_or_*}`). `TopologyEngine::project_with_facts(env,
records, facts)` is the internal overload; `project()` becomes a thin wrapper calling it with
zero facts. `TopologyEdge` gains `local_interface`, `remote_interface`, and `evidence` fields
(additive). `ProjectionStats` reports counts by source kind; `compute_adjacency_readiness`
is now data-driven from real fact counts instead of hardcoded. Live command path (`get_topology_view`)
still passes zero facts — no fact source connected yet, engine is the socket future stages
plug into. No parser changes, no DeviceModel mutation, no new Tauri command. See
`TOPOLOGY_ENGINE_BOUNDARY.md` V1AM section for types, edge ID format, acceptance rules,
and future hook.

### V1AN addition

V1AN lands the explicit-evidence intake mapper that turns parser-derived neighbour evidence
(LLDP, CDP, config-neighbour, manual) into `TopologyLinkFact` records. New Rust `TopologyNeighborEvidence`
struct carries `source_kind`, `local_node_id`, `local_interface`, `remote_node_id`, `remote_interface`,
`remote_chassis_id`, `remote_system_name`, `remote_port_id`, `source_label`, and `evidence_notes`.
New `NeighborEvidenceMappingStats` struct reports `evidence_total`, `accepted`, `rejected_unknown_local`,
`rejected_unknown_remote`, and `rejected_self_link`. New `map_neighbor_evidence_to_link_facts(nodes, evidence)
-> (facts, stats)` helper deterministically maps evidence to facts, rejecting self-links and unknown-node
evidence, preserving raw fields in evidence strings (`"{kind}:remote_sys={sys}|chassis={chassis}|port={port}[|notes={notes}]"`).
`TopologyEngine::project_with_neighbor_evidence(env, records, evidence)` is the internal overload that pipes
evidence through the mapper to `project_with_facts`. Mapper produces facts in input order; no mapper-level dedup
(V1AM's `project_edges_from_link_facts` handles edge collapse). Live command path (`get_topology_view`)
unchanged — still passes zero evidence, still shows zero edges and NoneAvailable readiness. No parser changes,
no DeviceModel mutation, no new Tauri command. See `TOPOLOGY_ENGINE_BOUNDARY.md` V1AN section for evidence
model, acceptance rules, and future hook.

### V1AO addition

V1AO lands the first persisted explicit-evidence source for the topology pipeline. New Rust `TopologyEvidenceStore`
trait owns read/write/clear contract; `NullTopologyEvidenceStore` (no-op, tests/cold-start) and
`JsonFileTopologyEvidenceStore` (one JSON file per environment at `{app_data}/topology_evidence/{env_id}.json`,
schema-versioned `"v1"`, corrupt/missing → empty Vec, honest) provide implementations. New `TopologyEvidenceSet`
struct carries `schema_version`, `environment_id`, `evidence_set_id` (deterministic from env+content hash),
`source_label`, `evidence_count`, and `evidence` array. `TopologyView` gains two new required fields:
`projection_stats: ProjectionStats` and `evidence_stats: NeighborEvidenceMappingStats` (both surfaced to
operator/test layer, additive wire). Tauri builder registers `Box<dyn TopologyEvidenceStore>` as state;
three new commands: `import_topology_neighbor_evidence(environment_id, evidence, source_label) -> TopologyEvidenceSet`,
`get_topology_neighbor_evidence(environment_id) -> Vec<TopologyNeighborEvidence>`,
`clear_topology_neighbor_evidence(environment_id) -> Result<(), String>`. Existing `get_topology_view`
signature unchanged (adds injected store state internally); command path now reads from store and calls
`project_with_neighbor_evidence(env, records, &evidence)` (equivalent to V1AN with zero evidence when store empty).
Import REPLACES env's evidence (not append); `evidence_set_id` deterministic across runs. TopologyMode gains
"Imported neighbour evidence" panel (textarea + Import button, header intentionally "Imported" not "Live discovery"),
rejection-counts banner (accepted/total + per-category breakdown), and edge list/table (no graph viz library).
No parser changes, no parser-lab changes, no hostname matching, no background polling, no DeviceModel mutation,
no new validator/rule pack changes. Backwards-compat: empty store → V1AN behaviour. See `TOPOLOGY_ENGINE_BOUNDARY.md`
V1AO section for store contract, command surface, and operator UI surface.

### V1AP addition

V1AP lands the first bounded, topology-owned parser that extracts neighbour adjacency facts from raw vendor output.
New Rust module `src-tauri/src/engines/topology_neighbor_output.rs` with `RawNeighborSourceKind` enum (Lldp, Cdp);
`RawNeighborEvidenceImportRequest` struct carrying `environment_id`, `local_node` (hostname or record_id),
`source_kind`, `platform_hint` (optional), `raw_text`, `source_label` (optional); `RawNeighborRejectionReason`
enum (UnresolvedLocal, UnresolvedRemote, SelfLink, UnsupportedFormat, ParseEmpty, MissingRequiredField);
`RawNeighborParsedEntry` and `RawNeighborRejectedEntry` structs; `RawNeighborEvidenceImportResult` struct
with counts and accepted/rejected entries. Format-specific parsers: `parse_iosxe_lldp_detail`, `parse_iosxe_cdp_detail`,
`parse_eos_lldp_detail`. Generic dispatcher: `parse_raw_neighbor_output(source_kind, text) -> Vec<RawNeighborParsedEntry>`.
Exact-match resolver: `resolve_node_id(records, needle) -> Option<String>` — case-insensitive trim, matches hostname
or record.id, no fuzzy, no fallback. Import orchestrator: `import_raw_neighbor_output(request, records, store)` —
parses, resolves, validates, calls `store.store()` only if `accepted_evidence_count > 0` (safety guard). Tauri command:
`import_topology_neighbor_output(request) -> Result<RawNeighborEvidenceImportResult, String>`. Supported formats:
Cisco IOS-XE LLDP/CDP, Arista EOS LLDP. Unsupported (explicitly rejected): NX-OS, Junos, others. Resolver rules:
exact-match-only (case-insensitive trim), no substring/fuzzy/IP/chassis fallback. Rejection categories: UnresolvedLocal
(local node not found), UnresolvedRemote (remote node not found), SelfLink (local == remote), UnsupportedFormat,
ParseEmpty, MissingRequiredField. Store-write policy: REPLACE per-environment; safety guard prevents clearing on
zero-accepted. TopologyMode UI: tabbed evidence-import section — Tab 1 "Structured JSON" (V1AO), Tab 2 "Raw
neighbour output" (V1AP) with source-kind radio, local-node text, raw-text area, Import button, result summary
(counts + rejection list capped at 5). Honest wording: "Raw neighbour output", "Imported evidence", "Resolved",
"Unresolved", "Rejected" — never "Live discovery"/"Scanning"/"Polling". Scope-out strict: no vendor parser changes,
no parser version bumps, no DeviceModel mutation, no parser-lab changes, no live polling, no graph library, no fuzzy
matching, no second store. Reuse V1AO `TopologyEvidenceStore`. Future hook: NX-OS/Junos and other formats plug into
same pipeline; no engine changes needed. See `TOPOLOGY_ENGINE_BOUNDARY.md` V1AP section for types, resolver contract,
and rejection categories.

---

## Monitoring / Polling Engine

- **Responsibility.** Scheduled polling of device state and emission of
  typed snapshots. Drives live state without owning it forever.
- **Owned data.** Poll schedules, latest snapshot per device/metric,
  rolling short-window history.
- **API surface concept.** `schedule(env)`, `latestSnapshot(deviceId)`,
  `snapshotWindow(deviceId, from, to)`.
- **Consumers.** OPERATE, Topology Engine (for live edges), Sentinel,
  DIAGNOSE, ASSESS.
- **Test requirement.** Snapshot schemas are typed and versioned. Replay
  of a recorded poll stream produces the same downstream state.
- **Must NOT own.** Long-term metric archival, alerting policy.

---

## Config Generation Engine

- **Responsibility.** Turn intent + vendor model + inventory into a
  candidate device configuration, deterministically.
- **Owned data.** Generation templates, generation results, contract
  versions.
- **API surface concept.** `generate(intent, context) → candidate`,
  `explain(candidate)`.
- **Consumers.** BUILD, FORGE, ASSESS.
- **Test requirement.** Same inputs → byte-identical candidate. Diffs
  against prior generation are stable.
- **Must NOT own.** Live device push (delegates to Config Pull/Diff
  Engine or OPERATE-controlled flows).

---

## Config Pull / Diff Engine

- **Responsibility.** Pull running configuration from a device and diff it
  against a baseline (intended config, last-known, or compliance
  baseline). Optionally push, gated by OPERATE.
- **Owned data.** Pulled configs, diff records, baselines.
- **API surface concept.** `pull(deviceId)`, `diff(deviceId, baselineId)`,
  `applyChange(planId)` (gated).
- **Consumers.** OPERATE, DIAGNOSE, ASSESS, Compliance Engine.
- **Test requirement.** Diff is a pure function of two configs + a
  vendor-aware normaliser. Deterministic across runs.
- **Must NOT own.** Intent, vendor capability semantics, compliance
  rules.

---

## Compliance Engine

- **Responsibility.** Evaluate configs/state against a typed rule catalog
  and produce findings with severity and evidence.
- **Owned data.** Rule catalogue, rule run records, findings.
- **API surface concept.** `listRules`, `evaluate(target, scope)`,
  `findings(runId)`.
- **Consumers.** BUILD, OPERATE, DIAGNOSE, ASSESS, FORGE (validate).
- **Test requirement.** Each rule is pure, given typed inputs. Findings
  carry evidence references.
- **Must NOT own.** Remediation actions, narrative authoring,
  vendor model semantics.

---

## Diagnostic / Hypothesis Engine

- **Responsibility.** Run rule-driven hypotheses over typed evidence and
  return ranked verdicts. **Deterministic**, no LLM in V1.
- **Owned data.** Hypothesis catalogue, case records, verdicts, evidence
  bindings.
- **API surface concept.** `openCase(scope)`, `attachEvidence(caseId, e)`,
  `evaluate(caseId) → verdicts`, `closeCase(caseId, finding)`.
- **Consumers.** DIAGNOSE, ASSESS, OPERATE (open case handoff).
- **Test requirement.** Hypothesis evaluation reproducible from a frozen
  evidence bundle.
- **Must NOT own.** Long-term storage of reports (Reporting Engine), live
  poll scheduling.

---

## Sentinel Engine

- **Responsibility.** Always-on detection over polling snapshots and
  topology diffs. Emits typed Sentinel signals.
- **Owned data.** Detection rules, signal log, signal acknowledgements.
- **API surface concept.** `listSignals(filter)`,
  `acknowledge(signalId)`, `subscribe(stream)`.
- **Consumers.** OPERATE, DIAGNOSE, ASSESS, HOME (count summary).
- **Test requirement.** Given a replayed polling stream + topology diff
  stream, signal output is stable.
- **Must NOT own.** Remediation, hypothesis logic, alert delivery
  outside the app.

---

## Assessment Engine

- **Responsibility.** Orchestrator for the ASSESS workflow. Owns the
  sequencing, run record, and composite report assembly. Pure orchestration
  layer — domain work belongs to consumed engines.
- **Owned data.** Assessment run records, step status, composite report
  metadata.
- **API surface concept.** `startAssessment(env, policy)`,
  `status(runId)`, `cancel(runId)`, `report(runId)`.
- **Consumers.** ASSESS (primary), HOME (recent / status), Reporting,
  DIAGNOSE (case handoff).
- **Test requirement.** Same policy + same fixture inputs → same run
  graph and same composite report.
- **Must NOT own.** Discovery, topology, compliance, diagnostic, or
  reporting logic. Only orchestrates.

---

## Reporting Engine

- **Responsibility.** Persist, version, and retrieve report-grade
  artifacts (assessment reports, diagnose findings, forge publications).
- **Owned data.** Report artifacts, versions, references.
- **API surface concept.** `save(report)`, `get(reportId)`,
  `list(filter)`, `version(reportId)`.
- **Consumers.** DIAGNOSE, ASSESS, FORGE, INTELLIGENCE, HOME (recent).
- **Test requirement.** Saved artifacts are content-addressable and
  retrievable by stable IDs.
- **Must NOT own.** Domain semantics of the artifacts.

---

## Forge / Knowledge Engine

- **Responsibility.** Storage and retrieval of operator-authored knowledge
  (playbooks, protocols, design notes) and curated vendor knowledge.
- **Owned data.** Knowledge entries, categories, references, version
  history.
- **API surface concept.** `listEntries(filter)`, `getEntry(id)`,
  `saveEntry(draft)`, `publish(draftId)`.
- **Consumers.** FORGE, INTELLIGENCE, BUILD (read), DIAGNOSE (read).
- **Test requirement.** Versioning is monotonic; published entries are
  immutable except via explicit new version.
- **Must NOT own.** Generation logic (Config Generation), evaluation
  logic (Compliance).

---

## Cortex Command Engine

- **Responsibility.** Deterministic command/search surface for the
  operator across HOME, OPERATE, and INTELLIGENCE. **In V1, no LLM.**
  Indexes typed names, IDs, recent artifacts, navigation actions.
- **Owned data.** Command/index store, recent commands, navigation
  actions catalogue.
- **API surface concept.** `query(input) → ranked typed results`,
  `execute(commandId, args)`, `register(commandSpec)`.
- **Consumers.** HOME, OPERATE, INTELLIGENCE, mode rail.
- **Test requirement.** Same input + same indexed corpus → same ranked
  results.
- **Must NOT own.** LLM inference, fuzzy NL parsing, free-form text
  generation. If a future Cortex (LLM) is reintroduced, it sits **outside**
  this engine and feeds typed results in.

---

## Engine boundaries (rules of thumb)

1. **Engines own data; modes own surface.** A mode never persists domain
   state; an engine never owns selection or camera state.
2. **No mode-private engine for shared capability.** Two modes that need
   the same fact share the same engine.
3. **Typed-only at the boundary.** Strings are not an interchange format.
4. **Deterministic at the engine boundary.** Side effects (polling,
   discovery I/O) are isolated and surfaced as typed events.
5. **Babylon never owns truth.** Topology truth lives in the Topology
   Engine; Babylon receives a typed graph and draws it.
