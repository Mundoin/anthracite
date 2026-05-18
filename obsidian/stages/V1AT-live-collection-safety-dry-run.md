# V1AT — Live Collection Safety Gate + Dry-Run Plan

**Arc:** TOPOLOGY-LIVE
**Date:** 2026-05-18
**Status:** landed

---

## Objective

Prepare Anthracite for future read-only live neighbour collection
without contacting any device. V1AT is the safety / control layer
that every future SSH driver must consult before any device contact.
It answers, deterministically and without side effects:

- What would Anthracite collect from a device?
- Which platform commands would be used?
- Is the action read-only?
- What evidence store import mode would be used?
- What risks/warnings exist before running?
- Can the operator review a dry-run plan before any contact happens?
- Can future live collection plug into the existing V1AP/V1AQ
  raw-output parser and V1AR evidence store?

V1AT is **not** the stage that opens SSH sessions. It is **not** a
polling stage. It is **not** a collection daemon.

---

## Scope in

**New Rust module: `src-tauri/src/engines/live_collection_plan.rs`**

- Types: `LiveCollectionPlatform`, `LiveCollectionSourceKind`,
  `LiveCollectionCommandPlan`, `LiveCollectionSafetyWarning`,
  `LiveCollectionUnsupportedReason`, `LiveCollectionReadinessState`,
  `LiveCollectionDryRunRequest`, `LiveCollectionDryRunPlan`.
- Pure function: `plan_live_topology_collection(req) -> plan`.
- 13 inline `#[cfg(test)]` tests covering each platform, mode, and
  warning category. Repeated calls are deterministic; full plan is
  serde-round-trippable.

**New Tauri command: `src-tauri/src/commands/live_collection.rs`**

- `plan_live_topology_collection_cmd(request) -> LiveCollectionDryRunPlan`.
- Registered in `src-tauri/src/lib.rs` `invoke_handler`.

**New TS module: `src/types/liveCollection.ts`**

- Wire mirror of the Rust types using snake_case fields.

**New TS module: `src/api/liveCollection.ts`**

- `planLiveTopologyCollection(request)` — thin invoke wrapper.

**New UI component: `src/modes/topology/LiveCollectionDryRunPanel.tsx`**

- Honesty header: "No device contact is performed in this stage."
- Platform hint selector (IOS-XE / NX-OS / IOS-XR / EOS / Junos /
  Huawei VRP (deferred) / Nokia SR OS (deferred) / FortiOS
  (unsupported) / MikroTik (unsupported)).
- Collection-source checkboxes (LLDP default on, CDP default off).
- Planned import mode selector (Merge default, Append, Replace
  (caution)).
- Target label input — display-only, never used to open a
  connection. No host/IP/SSH/credential field exists.
- Plan (dry run) button — disabled when no `onPlan` callback wired.
- Result section: readiness chip, planned import mode chip, planned
  command list with `read-only` badge + parser route, warning list
  (closed enum so wording stays deterministic), unsupported reason,
  safety checklist, plan-level honesty note.

**TopologyMode integration**

- Optional `onPlanLiveCollection` prop on `TopologyModeProps`.
- `LiveCollectionDryRunPanel` mounted in both empty and real
  branches; degrades to disabled-button when no callback wired.
- `App.tsx` wires the prop to `planLiveTopologyCollection` so the
  button works out of the box.

**Tests**

- 13 Rust unit tests in `live_collection_plan.rs` covering: per-platform
  command coverage, unsupported reasons, no-source-kinds blocking,
  replace-mode warning, unknown platform hint, missing target,
  deterministic repeat, serde round-trip, dedup of duplicated source
  kinds, honesty checklist always present.
- 9 React tests in `__tests__/LiveCollectionDryRunPanel.test.tsx`:
  honest render, merge default, no credential fields, disabled
  button without callback, request payload shape, command list +
  read-only badges, unsupported state, replace-mode warning, error
  surface, full checklist render.
- 4 regression tests in `TopologyMode.test.tsx`: panel mounts in
  real branch alongside V1AS surface, mounts in empty branch, no
  credential fields, plan button disabled without wired callback.

**Docs**

- `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` — V1AT section.
- `docs/architecture/ENGINE_AND_API_BOUNDARIES.md` — Live Collection
  Planning engine section.
- `docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md` — Stage Group 2
  V1AT marked COMPLETE.
- `obsidian/ANTHRACITE_INDEX.md` — V1AT row.
- This stage note.

---

## Scope out

- No real SSH / NETCONF / RESTCONF / SNMP / gNMI library, code
  path, or dependency.
- No credentials, no credential storage, no host/IP plumbing.
- No background tasks, schedulers, polling daemons.
- No real command execution. No raw output ingestion from a live
  device.
- No evidence-store mutation from V1AT.
- No parser changes.
- No DeviceModel / validator / rule-pack changes.
- No graph renderer.
- No fuzzy matching, hostname substring matching, management-IP /
  chassis-ID / interface-description promotion, subnet/VLAN
  inference.
- No new runtime dependency.
- No `parser-lab/` edits. The protected Codex prep folder
  (`parser-lab/_live_collection_readiness/`) was observed read-only
  for doctrine only.
- No `AGENTS.md` / `CLAUDE.md` edits.

---

## Architecture law respected

- Rust engines own truth and safety contracts.
- TS mirrors wire shapes; React surfaces state and operator
  controls only.
- No fake live truth. No hidden device contact. No background
  collection.
- V1AP/V1AQ raw-output parser, V1AR evidence store, and V1AS review
  surface remain authoritative. V1AT does not alter any of them.

---

## Safety contract

Every emitted command has `read_only: true` by construction —
asserted in Rust unit tests for every supported platform/source
combination.

Readiness state:

| State | When |
|-------|------|
| `ready` | At least one read-only command planned AND no blocking warning. |
| `not_ready` | Empty plan, unknown platform, missing target, no source kinds, or no source-kind matches platform. |
| `unsupported` | Platform is FortiOS / MikroTik (`parser_unsupported`) or Huawei VRP / Nokia SR OS (`driver_deferred`). |

Future drivers MUST:

1. Call `plan_live_topology_collection_cmd(request)` first.
2. Refuse execution unless `readiness == ready`.
3. Surface the plan to the operator.
4. Feed any collected raw output through the V1AP/V1AQ import path
   (`importTopologyNeighborOutput`).
5. Let the V1AR store handle the actual mutation under the
   operator-chosen mode.
6. Never short-circuit the parser or the store.

---

## Honest wording (used)

- Dry-run collection plan · Read-only command set · Operator review
  required · No device contact performed · Planned import mode ·
  Unsupported platform · Platform hint · Collection source.

## Dishonest wording (avoided)

- Live discovery · polling · auto discovery · smart topology ·
  autonomous collection · background scan · device sweep · push ·
  remediation.

---

## Risks / notes

- Platform coverage matches the V1AQ raw-output dispatcher exactly:
  IOS-XE / NX-OS / EOS get both LLDP and CDP commands; Junos and
  IOS-XR get LLDP only; Huawei VRP and Nokia SR OS are honest
  driver-deferred; FortiOS and MikroTik are honest parser-unsupported.
  Any future expansion in the parser dispatcher MUST be reflected
  here and validated by the deterministic Rust tests.
- The target-label field is display-only. A later stage that adds
  real driver wiring will introduce a proper connection-target
  contract — V1AT does not pre-empt that boundary.
- The Plan button degrades gracefully (disabled) when no
  `onPlanLiveCollection` callback is wired so component callers can
  render the surface without the IPC dependency for tests.

---

## Cross-links

- [`../../docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md`](../../docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md) — V1AT boundary section.
- [`../../docs/architecture/ENGINE_AND_API_BOUNDARIES.md`](../../docs/architecture/ENGINE_AND_API_BOUNDARIES.md) — Live Collection Planning engine entry.
- [`../../docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md`](../../docs/roadmap/ANTHRACITE_V1_PRODUCT_ROADMAP.md) — Stage Group 2 V1AT COMPLETE.
- `src-tauri/src/engines/live_collection_plan.rs`
- `src-tauri/src/commands/live_collection.rs`
- `src/types/liveCollection.ts`
- `src/api/liveCollection.ts`
- `src/modes/topology/LiveCollectionDryRunPanel.tsx`
- `src/modes/topology/__tests__/LiveCollectionDryRunPanel.test.tsx`
- [`V1AS-topology-edge-review-graph-ready-surface.md`](./V1AS-topology-edge-review-graph-ready-surface.md) — previous stage.
