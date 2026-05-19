# V1BA — SSH Capture → Evidence Handoff v1

**Objective:** Land the first explicit operator-triggered handoff from
a V1AZ `Captured` SSH outcome into Anthracite's existing raw evidence
import path. No fake topology, no auto-mutation, no new evidence store.

**Date:** 2026-05-19
**Predecessor:** V1AZ SSH Transport v1 (`acdd6d6 + 47ee3cb`)

## Scope in

**Frontend adapter (`src/modes/discovery/sshEvidenceHandoff.ts`):**

- `buildEvidenceHandoff(target, report)` — pure deterministic adapter
  consuming a V1AZ `DiscoveryRunReport`. Returns an empty plan when the
  outcome is not `captured`.
- Per-command classifier mapping `command` text to
  `EvidenceHandoffSourceKind` (`lldp | cdp | unknown`). Closed set:
  `show lldp neighbor`/`neighbour`, `display lldp neighbor`/`neighbour`,
  `lldp neighbors`/`neighbours`, `show cdp neighbor`/`neighbour`.
- Non-importable reasons surfaced explicitly: `non_neighbour_command`,
  `unrecognised_command`, `empty_output`, `command_failed_exit`.
- `buildImportRequest(candidate, env_id, local_override, mode)` —
  builds a `RawNeighborEvidenceImportRequest` against the existing
  V1AP/V1AQ contract; returns `null` for non-importable inputs or
  when env_id / local_node is empty.
- Deterministic `source_label` = `live_ssh_captured:<target_label>:<command>`.

**UI extension (`src/modes/discovery/DiscoveryMode.tsx`):**

- Handoff section appears inside the existing `Captured` outcome
  panel. Hidden on every other outcome (`transport_deferred`,
  `refused`, `auth_failed`, `connection_failed`, `timeout`,
  `command_failed`).
- Environment ID input, per-candidate `Local node` override, per-row
  Import button.
- Import button disabled until env_id + local_node both non-empty.
- Status states per candidate: idle → importing → done | failed.
  Imported state renders accepted / rejected / stored counts +
  `evidence_set_id`. Failed state renders error message.
- Non-importable rows render the reason and have no Import button.
- "Empty hint" panel shows when no candidates are importable.

**Reused without modification:**

- `import_topology_neighbor_output` Tauri command (V1AP/V1AQ).
- `importTopologyNeighborOutput` wrapper in `src/api/topology.ts`.
- `RawNeighborEvidenceImportRequest` / `RawNeighborEvidenceImportResult`
  types.
- V1AR managed store. V1BA never mutates V1AR directly.

**Tests (27 new):**

- `__tests__/sshEvidenceHandoff.test.ts` — 18 adapter tests:
  - LLDP classification (Cisco-style, Huawei `display lldp neighbor`).
  - CDP classification.
  - Non-neighbour command (`show version`, `show interfaces`) →
    `non_neighbour_command`.
  - Unrecognised command → `unrecognised_command`.
  - Empty stdout on a recognised command → `empty_output`.
  - Non-zero exit code → `command_failed_exit`.
  - Provenance preserved in `source_label`.
  - `output_truncated` preserved.
  - Empty plan for non-captured outcomes.
  - Mixed batch (LLDP + CDP + show + unrecognised).
  - JSON-stringify never contains `password` / `private_key` / `passphrase`.
  - `buildImportRequest` — happy path, override, returns null for
    non-importable / empty env_id / empty local_node.
- `__tests__/DiscoveryMode.handoff.test.tsx` — 9 UI tests:
  - Handoff section renders after `captured`.
  - Handoff section absent on `auth_failed` / `connection_failed` /
    `timeout` / `command_failed`.
  - Import button disabled until env_id provided.
  - Click Import → calls existing API exactly once with the right
    request shape (env_id, source_kind, local_node, raw_text,
    source_label).
  - Honest import-failure rendering when API throws.
  - Non-importable candidate renders reason + has no Import button +
    empty-hint panel when zero importable.
  - Import does NOT fire without explicit click (env id alone is
    insufficient).
  - DOM never contains the operator's password after handoff renders
    (unique-secret assertion).

## Scope out

- **No new Rust.** No engine, no command, no Cargo dep added.
- **No auto-import.** Operator clicks per candidate.
- **No multi-target sweep.** One handoff per captured run.
- **No DeviceModel mutation.** Topology truth flows through V1AR only.
- **No widening of importer source kinds.** LLDP/CDP only, matching
  the V1AP/V1AQ acceptance set.
- **No fake topology.** Truncated outputs are flagged, not hidden.
- **No graph-renderer / diagnose link-jump.** Operator navigates
  manually.
- **No retries.** Operator re-clicks on failure.
- **No project-map refresh** in this commit (per directive).
- **No git add / commit / push / AO retro** (per directive).
- **No parser changes.**

## Acceptance evidence

- `pnpm typecheck` — green.
- `pnpm test --run` — **772/772** (71 files; +27 V1BA: 18 adapter + 9
  handoff UI).
- `pnpm build` — green (407.45 kB JS, 85.89 kB CSS, 132 modules).
- `cargo check --manifest-path src-tauri/Cargo.toml --lib` — green.
- `cargo test --manifest-path src-tauri/Cargo.toml --lib` — **579/579**.
- `tools/ops-readiness.ps1` — **READY** (13/13).

V1BA is frontend-only — no Rust artifact change attributable to V1BA.

## Operator user journey

1. Discovery mode → Validate → Plan → enter credentials → Run via SSH.
2. On `Captured`, command outputs render as before. Below them, the
   new **Evidence handoff** section appears.
3. Operator enters Environment ID. Per-candidate row shows command,
   classified source kind, default local node (editable), and an
   Import button (disabled until env_id provided).
4. Operator clicks Import on a row. Status flips to *Importing…*,
   then *Imported* with accepted / rejected / stored counts and the
   new `evidence_set_id`. Or *Import failed* with the error message
   if the existing API call raises.
5. Non-importable rows render their reason in line; no Import button.
6. Operator may navigate to Topology mode to inspect the imported
   evidence in the V1AS review surface or the V1AY graph renderer.
   V1BA does not auto-jump there.

## Why this slice now

V1AZ landed real SSH execution, but `Captured` outputs were a dead
end: the operator could see raw stdout/stderr but had no in-app path
into the existing managed evidence store. V1BA closes that gap with
the smallest honest surface — a pure adapter, a single section in the
existing mode, and a click-per-candidate flow — without inventing new
storage, new commands, or new graph behaviour.

## Next-stage candidates

- **V1BA:** Credential-reference contract enabling pre-approved
  auto-import for trusted targets.
- **V1BC:** Wider classifier (more vendor neighbour formats) in
  lockstep with V1AQ acceptance updates.
- **V1BD:** Link-jump from a successful import into Topology mode
  with the freshly imported evidence-set ID focused.
- **V1BE:** Diagnose mode integration — show "what changed" answers
  immediately after an evidence import.

## Cross-links

- Architecture: [`docs/architecture/SSH_EVIDENCE_HANDOFF_V1.md`](../../docs/architecture/SSH_EVIDENCE_HANDOFF_V1.md)
- V1AZ transport contract: [`docs/architecture/SSH_TRANSPORT_V1_CONTRACT.md`](../../docs/architecture/SSH_TRANSPORT_V1_CONTRACT.md)
- V1AX foundation: [`docs/architecture/DISCOVERY_FOUNDATION_V1.md`](../../docs/architecture/DISCOVERY_FOUNDATION_V1.md)
- Topology engine: [`docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md`](../../docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md) (V1AP/V1AQ raw import + V1AR managed store, unchanged)
