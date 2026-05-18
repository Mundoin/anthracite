# Anthracite V1 — Product Roadmap

> Repo-visible roadmap and strategic checkpoint produced at the V1AI-A stage.
> Lives in the repo so direction survives chat context loss.
>
> Companion docs:
> - [`PARSER_PREP_LANE.md`](./PARSER_PREP_LANE.md) — Codex parser-prep lane contract.
> - `obsidian/stages/V1AI-A-roadmap-checkpoint.md` — stage note.

---

## Anchor

- Commit anchor at roadmap freeze: `af690b43da213834fe3ec6ac7b31c328ad63fbd2`
  (stage V1AI — *persist discovery imports*).
- Roadmap stage: **V1AI-A — Product Roadmap + Agent-Local Hygiene Plan**.
- Posture: **STOPPED**. No implementation prompt until Bujar picks the next
  Stage Group.

---

## What is alive now

Below is the honest set of pipes that *work end-to-end* in the current build.
Everything else is a placeholder, an empty contract, or doctrine without code.

- **Environment Engine.** Catalogue + active-selection persistence + readiness
  projection. Wired to HOME / Environment Centre / Inspector.
- **Vendor Registry Engine.** Vendor + platform metadata used by detection and
  parsing.
- **Config Detection Engine.** Single-config and per-slice platform detection.
- **Config Splitter Engine.** Pasted / file / archive batch splitting.
- **Archive Intake Engine.** Zip / tar / tar.gz extraction with provenance.
- **Parser Engines (L1/L2):** Cisco IOS-XE, Cisco NX-OS, Juniper Junos,
  Arista EOS. Receipt + validation per parsed device.
- **Validator Engine + rule packs** (MGMT-HYG, DIAG-HYG). Findings surface
  shared across INTAKE + ASSESS via the FindingsDisplay contract.
- **INTAKE workspace.** Single + batch + archive. Stage column, findings
  column, run-summary strip, export (copy/save JSON + Markdown), Preview +
  Import to Discovery actions.
- **ASSESS viewer.** Loads V1R export JSON, triage filters, by-device /
  by-severity views.
- **Hierarchy honesty contract.** DataSourceState + `DataSourceTag`, real-vs-
  demo separation, inspector identity real-promotion, mode fall-through
  honesty.
- **Ops Console.** Engine readiness snapshot + Discovery Inventory section
  wired to the live Discovery Engine command.
- **Discovery Engine (V1AF → V1AI).** Empty spine → typed wire shape →
  empty-state surface → INTAKE-to-Discovery preview pipe → authoritative
  import + persisted JSON inventory. `inventory_view` returns real records
  after import. App refresh chain wires Ops Console to the new count.
- **Topology Engine + Topology Mode v1 (V1AJ).** Stateless read-model projector
  consumes persisted Discovery records, produces deterministic node/edge/layer shapes.
  Frontend workspace v1: read-only node list + summary + source state via DataSourceTag.
  Edges empty (no link-fact inference yet; wire shape locked). No graph viz library;
  Babylon rendering deferred.
- **Discovery Inventory Browser (V1AK).** Operator-facing read-only Discovery Inventory
  Browser inside Hierarchy → Devices detail segment. Honest consumption of persisted
  records with live source state and record detail. Three-state surface: unavailable /
  empty / loaded. No mutation semantics. DETAIL_SUBNAV count derives from live
  `sourceRecordCount` when real, falls back to seed otherwise.
- **Topology Adjacency Readiness (V1AL).** TopologyView extended with deterministic 
  adjacency readiness contract (4 fact-source categories: LLDP, CDP, config-neighbor, 
  manual). All sources ship V1AL with `present: false, count: 0`; state auto-transitions 
  when future fact-ingestion stages flip present. TopologyMode adds "Adjacency readiness" 
  section; honest "0 reliable links" preserved. No edge inference, no fake adjacency.

---

## What is still missing

- **Topology Engine.** No Rust engine, no read model, no graph. Mode body is
  `not_connected`.
- **Diagnose / path-trace seed.** No surface, no read model.
- **Operate.** No operator action surface yet.
- **Build / Forge.** Not connected.
- **Cortex command surface.** Mode body absent.
- **Sentinel / Monitoring / Polling.** Not started.
- **Discovery mutation semantics.** Update / overwrite / merge / delete are
  out of scope until explicitly gated. First-wins import is current
  behaviour.
- **Persistent record browser.** No environment-filtered inventory view in
  the operator surface yet — `inventory_view` exists, no UI for it beyond Ops
  Console's count.
- **Parser depth gaps.** L3/4 protocols (OSPF/BGP advanced, NAT, QoS,
  AAA, VPN, firewall, security objects) are shallow or absent across all
  vendors.
- **Vendor coverage gaps.** Fortinet FortiOS, Huawei VRP, MikroTik RouterOS
  not started.

---

## Strategic rules (binding for every future stage)

1. **Pipe rule.** Every stage must do one of:
   create a pipe, strengthen a pipe, expose a pipe honestly, or prepare the
   next pipe. No ornamentation stages.
2. **Honesty rule.** Surfaces never lie. Real / empty / demo /
   unavailable / not_connected are distinct states with visible provenance.
3. **Deterministic rule.** Engines are pure given the same inputs. No LLM in
   engines. No clock. No randomness. No I/O inside the engine boundary
   except via explicit persistence stores.
4. **Visual law rule.** Polish lands later, but every surface must already
   belong to Anthracite. Industrial light NOC tone. Dense but readable. No
   black slabs. No random colour flooding. No toy graph. No hideous
   temporary UI.
5. **Engine-ownership rule.** A capability lives in the engine that owns the
   data. No mode-private engine for shared capability. No frontend shadow
   stores of engine truth.
6. **Stop rule.** After this roadmap freeze, no implementation prompt fires
   until Bujar picks the next Stage Group below.

---

## Three Stage Groups

The next 6 directions compress into 3 product stage groups. Each group is a
sequenced batch of stages; group order is *not* fixed yet — Bujar picks.

### Stage Group 1 — Product Spine Map + Parallel Parser Prep

**Purpose.** Lock the master "bring everything to life" map. Define what
OCC builds now and what Codex prepares in parallel without integrating
parser code. Set parser-depth prep lane.

**Product spine (canonical order):**

`Environment → INTAKE → Discovery Inventory → Topology →
Diagnose / Assess / Operate / Build`

Environment is the operator scope. INTAKE feeds canonical DeviceModel
into Discovery. Discovery holds persisted DeviceModel-backed records.
Topology consumes persisted Discovery records. Diagnose / Assess /
Operate / Build read from Topology and from Discovery directly. Forge,
Sentinel, Cortex layer in once the spine exists.

**Codex parser-prep lane** (full contract in
[`PARSER_PREP_LANE.md`](./PARSER_PREP_LANE.md)):

- Codex may create raw fixtures, intent notes, syntax maps,
  edge-case catalogues, and coverage notes.
- Codex must **not** integrate Rust parser logic.
- Codex must **not** bump parser versions, edit cross-vendor invariants,
  or modify golden `expected.json` integration.
- OCC integrates Codex's prepared material into real parser stages in the
  fullness of time.

**Proposed parser-lab structure:**

```
parser-lab/
  cisco-iosxe/
  cisco-nxos/
  juniper-junos/
  arista-eos/
  fortinet-fortios/
  huawei-vrp/
  mikrotik-routeros/
```

**Parser-depth priority (top → bottom):**

1. Interfaces deeper (sub-interfaces, breakouts, port-channels, MTU, MAC,
   description discipline)
2. VLAN / L2 switching (access/trunk, native VLAN, voice VLAN, STP roots)
3. Static routes (next-hop, distance, tracking)
4. OSPF / BGP basics (areas, neighbors, AS, route-maps minimal)
5. ACL (numbered, named, ipv4/ipv6, log)
6. NAT (static, dynamic, PAT, twice-NAT)
7. QoS (class-maps, policy-maps, marking, shaping)
8. AAA / management plane (tacacs/radius, line auth, ssh, telnet, snmp)
9. VPN / tunnels (gre, ipsec, mpls L3vpn, l2vpn primitives)
10. Firewall / security objects (FortiOS / NX-OS / Junos service objects,
    address-groups, policies)

**Vendor priority (top → bottom):**

1. Cisco IOS-XE  *(parser exists; deepen)*
2. Cisco NX-OS   *(parser exists; deepen)*
3. Juniper Junos *(parser exists; deepen)*
4. Arista EOS    *(parser exists; deepen)*
5. Fortinet FortiOS *(not started)*
6. Huawei VRP    *(not started)*
7. MikroTik RouterOS *(not started)*

OCC owns parser code; Codex owns fixture/coverage/intent prep.

---

### Stage Group 2 — Topology Comes Alive

**Status:** Adjacency readiness contract declared (V1AL). Remaining work: fact ingestion
(parser-derived neighbor facts likely first) + future edge rendering.

**Topology Engine spine (V1AJ):**

- Rust Topology Engine reads persisted Discovery records via
  `inventory_view(env)`.
- Projects a deterministic topology read model (nodes + edges + layers +
  metadata).
- No live graph magic yet.
- No polling.
- No fake topology.
- DeviceModel-backed Discovery records are the *only* source.
- Engine is pure: same Discovery snapshot → same graph bytes.

**Adjacency Readiness (V1AL):**

- TopologyView extended with deterministic adjacency readiness contract.
- Four fact-source categories (LLDP, CDP, config-neighbor, manual) declared.
- All sources ship V1AL with `present: false, count: 0`.
- State machine (NoneAvailable → Partial → Ready) auto-transitions when future
  fact ingestion stages flip `present: true` on sources.
- TopologyMode adds "Adjacency readiness" section with per-source visibility.
- Honest "0 reliable links" preserved; no fake edges.

**Topology mode body v1 (V1AJ):**

- Visible topology workspace rendered from the persisted Discovery
  records of the active environment.
- Strict Anthracite visual law: industrial light NOC tone, dense but
  readable, no black slabs, no random colour flooding, no toy graph.
- No final polish, but no hideous temporary UI either — the surface must
  already feel like Anthracite from stage one.
- Honest empty / partial / loaded states surfaced with DataSourceTag.
- No interactive editing in v1.

**Next in Stage Group 2:**

- **Edge Inference.** Implement fact ingestion paths (parser-derived LLDP/CDP
  neighbors likely first). Flip `present: true` on relevant sources; state
  auto-transitions; edge count increments.
- **Edge Rendering.** Babylon.js integration for interactive 2D/3D topology
  graph visualization; camera, node selection, drill-down.

---

### Stage Group 3 — Inventory Operations + Diagnose Seed

**Purpose.** Make persisted inventory operationally useful. Prepare the
first diagnosis / path-trace surface.

**Discovery inventory browser:**

- **COMPLETE (V1AK).** Operator-facing read-only browser inside Hierarchy → Devices
  detail segment. Consumes persisted Discovery records with live source state. Three-state
  surface: unavailable / empty / loaded. Record detail panel shows full metadata. No
  mutation semantics (add/edit/delete/merge deferred).

**Discovery mutation semantics (deferred):**

- Update / overwrite / merge / delete are **not** immediate.
- First-wins import remains current behaviour until a roadmap stage
  explicitly gates a change.
- When mutation lands, it lands as one bounded stage with rejection-mode
  symmetry to current import.

**Diagnose / path-trace seed:**

- Topology facts → first Diagnose read model.
- No fake live telemetry.
- Deterministic input/output.
- Starts turning Anthracite into an operator workstation, not a parser
  utility.

---

## OCC vs Codex lane summary

- **OCC (this main coding agent).** Integration owner. Architecture
  decisions, Rust engine implementation, Tauri / React / TypeScript /
  Babylon implementation, major refactors, product-shaping. Reviews and
  integrates Codex's prepared parser-prep material.
- **Codex.** Parser-prep factory + low-risk doc / index hygiene. Produces
  raw fixtures, intent notes, syntax maps, edge-case catalogues, coverage
  notes. Does **not** edit Rust parsers, bump versions, or modify
  cross-vendor invariants.

Full contract in [`PARSER_PREP_LANE.md`](./PARSER_PREP_LANE.md).

---

## Stop rule

After this roadmap freeze, no implementation prompt fires until Bujar
picks one of:

- Stage Group 1 — *Product Spine Map + Parallel Parser Prep* (start lane
  and / or first stage)
- Stage Group 2 — *Topology Comes Alive* (engine spine first, then mode
  body)
- Stage Group 3 — *Inventory Operations + Diagnose Seed*

Bujar may also redirect entirely — the rule is "no auto-continuation".
