# V1AU — Fixture-backed Live Collection Simulator

**Arc:** TOPOLOGY-LIVE
**Date:** 2026-05-18
**Status:** landed

---

## Objective

Prove the V1AT → V1AP/V1AQ → V1AR → V1AS flow end-to-end **without
any device contact**. V1AU is a frontend-only bridge: given a ready
V1AT dry-run plan, the simulator maps a planned `(command, source)`
pair to a synthetic raw neighbour output bundle and feeds it through
the existing `importTopologyNeighborOutput` route. The V1AR
managed evidence store handles the mutation; the V1AS edge review
surface displays the projected edges. The simulator is the bridge
toward a future real driver — it is **not** the driver.

---

## Scope in

**New TS modules:**

- `src/modes/topology/liveCollectionSimulatorFixtures.ts` — synthetic
  raw output snippets for iosxe/nxos/eos × LLDP+CDP, junos LLDP, and
  iosxr LLDP. Each fixture carries `platform`, `source_kind`,
  `command`, `local_node` (synthetic `sim-<platform>-a` label),
  `raw_output`, `label` (always contains "synthetic"), and
  `expected_route_note`. Unsupported / deferred platforms (FortiOS,
  MikroTik, Huawei VRP, Nokia SR OS) have no fixtures by
  construction — verified in tests.
- `src/modes/topology/liveCollectionSimulator.ts` — pure helpers:
  - `canSimulateLiveCollectionPlan(plan, envId)` — closed-set gate.
  - `findSimulationFixture(plan, command)` — null when absent.
  - `listSimulationPairs(plan)` — `(command, fixture)` pairs.
  - `planHasAnySimulationFixture(plan)` — convenience predicate.
  - `buildRawNeighborImportFromSimulation({...})` — produces the
    exact `RawNeighborEvidenceImportRequest` wire shape; no new
    fields, no host/IP/credential.

**UI integration:**

- `LiveCollectionDryRunPanel` gains an optional
  `onImportRawNeighborOutput` prop and a new "Fixture simulator"
  section rendered below the plan result. The section provides a
  fixture command selector, route + planned-import-mode display, and
  a Simulate button that calls the existing import callback with the
  fixture's raw output and the plan's planned import mode.
- `TopologyMode` threads the existing `onImportRawNeighborOutput`
  callback into the panel. No new prop on `TopologyModeProps`.

**Tests:**

- 16 helper tests in `liveCollectionSimulator.test.ts`: gate
  semantics, fixture lookup, plan ordering, request shape, mode
  threading, no-host/IP/credential keys, fixture metadata sanity.
- 7 new UI tests in `LiveCollectionDryRunPanel.test.tsx`: simulator
  renders after ready plan, no host/IP/credential inputs, Simulate
  fires raw-import callback with V1AP wire shape, plan import mode
  threads through, no-fixture honest message (Junos CDP),
  unsupported plan honest message (FortiOS), simulator error
  observable, disabled when callback missing.

**Docs:**

- `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` — V1AU section.
- `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` — Stage Group 2
  V1AU marked COMPLETE.
- `obsidian/ANTHRACITE_INDEX.md` — V1AU row.
- This stage note.

---

## Scope out

- No real SSH / NETCONF / RESTCONF / SNMP / gNMI library, code path,
  or dependency.
- No credentials, credential storage, host/IP, or transport
  plumbing.
- No shell command execution, no external process execution.
- No polling daemon, scheduler, or background task.
- No new Rust engine. No new Tauri command. No new wire types.
- No parser changes (V1AP/V1AQ untouched).
- No DeviceModel / validator / rule-pack changes.
- No V1AR evidence-store semantic changes — V1AU only delivers raw
  bytes to the existing import route.
- No graph renderer. No fuzzy matching. No resolver changes.
- No `AGENTS.md` / `CLAUDE.md` edits. No `parser-lab/` edits.
- No new runtime dependency.
- No project-map update in this stage (per instruction — recommend
  refresh after commit).

---

## Architecture law respected

- Rust engines and parsers own truth. The simulator does not parse,
  validate, or project — it hands raw bytes to the V1AP/V1AQ import
  route exactly like an operator paste would.
- The V1AT dry-run plan remains the safety gate. The simulator only
  proceeds when `plan.readiness === "ready"`.
- The V1AR managed evidence store remains authoritative for any
  resulting mutation; the simulator carries the plan's planned
  import mode through but never opens a side channel.
- The V1AS edge review surface continues to display the resulting
  projected edges with no additional rendering path.

---

## Safety wording (used)

- Fixture simulator · No device contact · Bundled synthetic raw
  output only · Simulation unavailable · Operator review required.

## Dishonest wording (avoided)

- Live discovery · live driver · auto discovery · smart topology ·
  background scan · polling · device sweep.

---

## Risks / notes

- **Fixture coverage matches V1AT planner coverage exactly.**
  iosxe/nxos/eos × LLDP+CDP plus junos LLDP plus iosxr LLDP. Junos
  CDP and IOS-XR CDP have no fixtures (and the planner does not
  emit those commands). Any future expansion of V1AT planner or
  V1AQ parser dispatcher should land a paired fixture; the simulator
  tests enforce that fixtures never cover unsupported / deferred
  platforms.
- **Parser acceptance is downstream.** A fixture passes raw bytes
  to V1AP/V1AQ. If the parser rejects a synthetic line, the
  simulator surfaces the import result honestly
  (`parsed N · accepted X · rejected Y · stored Z`). Synthetic
  fixtures aim for realistic vendor shapes but their primary job is
  to exercise the wire path, not to maximise acceptance.
- **No host/IP/credential ever flows.** The fixture's `local_node`
  field is a display-only synthetic label and is the same shape as
  the existing V1AP `local_node` input — the operator-paste path
  already accepts it.
- **Simulator gating is component-local state** in the panel; not
  persisted across sessions.
- **Project map refresh recommended** after Bujar commits V1AU
  because a landed stage / deferred boundary changes the
  `current_state` and `next_candidates` sections of the source
  JSON.

---

## Cross-links

- [`../../docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md`](../../docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md) — V1AU section.
- [`../../docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md`](../../docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md) — Stage Group 2 V1AU COMPLETE.
- `src/modes/topology/liveCollectionSimulator.ts`
- `src/modes/topology/liveCollectionSimulatorFixtures.ts`
- `src/modes/topology/LiveCollectionDryRunPanel.tsx`
- `src/modes/topology/__tests__/liveCollectionSimulator.test.ts`
- `src/modes/topology/__tests__/LiveCollectionDryRunPanel.test.tsx`
- [`V1AT-live-collection-safety-dry-run.md`](./V1AT-live-collection-safety-dry-run.md) — previous stage.
