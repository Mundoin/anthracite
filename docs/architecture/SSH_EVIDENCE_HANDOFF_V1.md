# SSH Evidence Handoff v1 — V1BA Contract

**Stage:** V1BA
**Predecessor:** V1AZ SSH Transport v1 (`docs/architecture/SSH_TRANSPORT_V1_CONTRACT.md`)
**Date:** 2026-05-19

## Identity & Posture

V1BA ships the first explicit handoff from a V1AZ `Captured` SSH outcome
into Anthracite's existing raw-evidence import path
(`import_topology_neighbor_output`, the V1AP/V1AQ command).

V1BA is a **frontend-only consumer**:

- No new Rust engines, no new Tauri commands, no new Cargo deps.
- Captured output is **raw evidence**, not verified topology.
- Importing requires an explicit operator click per importable
  command. There is no auto-import on `Captured`; nothing mutates the
  V1AR managed store without operator action.
- V1BA never invents topology, never widens the V1AP/V1AQ acceptance
  set, never bypasses the read-only gate established by V1AT/V1AX.

## Where the surface lives

- Adapter: `src/modes/discovery/sshEvidenceHandoff.ts` (pure TS,
  deterministic, no I/O).
- UI: handoff section rendered inside the `Captured` outcome panel of
  `src/modes/discovery/DiscoveryMode.tsx`. Only visible after a
  successful SSH capture.
- Import path: `importTopologyNeighborOutput()` wrapper at
  `src/api/topology.ts`, which calls the existing
  `import_topology_neighbor_output` Tauri command. **Unchanged by
  V1BA.** No Rust touched.

## Contract types

```ts
type EvidenceHandoffSourceKind = "lldp" | "cdp" | "unknown";

type EvidenceHandoffNotImportableReason =
  | "non_neighbour_command"      // show version, show interfaces, ...
  | "unrecognised_command"       // free-form / vendor extension not classified
  | "empty_output"               // recognised command but stdout blank
  | "command_failed_exit"        // non-zero exit code
  | "stdout_only_safe";

interface EvidenceHandoffCandidate {
  command: string;
  source_kind: EvidenceHandoffSourceKind;
  importable: boolean;
  reason: EvidenceHandoffNotImportableReason | null;
  raw_text: string;              // stdout for importable; "" otherwise
  source_label: string;          // `live_ssh_captured:<target_label>:<command>`
  platform_hint: string;
  local_node_default: string;    // = target.data_source_label || target.host
  exit_code: number | null;
  output_truncated: boolean;
}

interface EvidenceHandoffPlan {
  target_label: string;
  platform_hint: string;
  candidates: ReadonlyArray<EvidenceHandoffCandidate>;
  importable_count: number;
  not_importable_count: number;
}
```

## Classifier

Pure substring match over the lowercased command text, against the
closed set the V1AP/V1AQ importer already accepts:

| Pattern (case-insensitive) | source_kind |
|----------------------------|-------------|
| `show lldp neighbor` / `show lldp neighbour` | `lldp` |
| `display lldp neighbor` / `display lldp neighbour` (Huawei VRP) | `lldp` |
| `lldp neighbors` / `lldp neighbours` (exact match) | `lldp` |
| `show cdp neighbor` / `show cdp neighbour` | `cdp` |
| anything else | `unknown` |

For `unknown` source_kind, a secondary classifier distinguishes
**non-neighbour shows** (`show version`, `show interfaces`,
`show running`, `show startup`, `show ip route`, `show ip interface`,
`show inventory`, `show platform`, `display version`) so the operator
sees `non_neighbour_command` instead of the more generic
`unrecognised_command`.

Empty stdout and non-zero exit codes are surfaced as `empty_output`
and `command_failed_exit` respectively, with `importable: false`.

## Source label / provenance

Every candidate carries a deterministic `source_label`:

```
live_ssh_captured:<target.data_source_label>:<command>
```

The label flows through to the V1AP/V1AQ
`RawNeighborEvidenceImportRequest.source_label` field, so the imported
evidence can be traced back to the originating SSH capture in the
V1AR managed evidence store and V1AS edge-review surface.

## Operator UI flow

1. Operator completes the V1AZ flow: Validate → Plan → enter
   credentials → **Run via SSH**.
2. On `Captured` outcome, the existing command-results list renders
   as before, followed by a new **Evidence handoff** section.
3. Handoff section shows:
   - Importable / not importable counts.
   - Environment ID input (operator-supplied).
   - Per-candidate row: command, classified `source_kind`, `Local node`
     input (defaulted to `target.data_source_label`), and an **Import**
     button. For non-importable rows, no Import button — just the
     classified reason.
4. Operator clicks **Import** on a row.
5. UI calls `importTopologyNeighborOutput(request)`. Status moves
   `idle → importing → done | failed`. On `done`, accepted / rejected
   / stored counts and the new `evidence_set_id` render in place.
6. Operator may then leave Discovery mode and inspect the imported
   evidence via the existing Topology mode (V1AJ/V1AS review surface
   and V1AY graph renderer). V1BA does **not** add new graph
   features and does not link-jump automatically.

The handoff section is gated on `runReport.outcome.kind === "captured"`.
It does **not** render for any of `transport_deferred`, `refused`,
`auth_failed`, `connection_failed`, `timeout`, `command_failed`.
Regression-tested explicitly.

## What V1BA does not do

- **No new evidence store.** Reuses V1AR managed store via existing
  V1AP/V1AQ command.
- **No auto-import.** Operator clicks per candidate.
- **No new Tauri commands.** No new Cargo deps.
- **No DeviceModel mutation.** V1AR managed store remains the single
  source of truth for neighbour evidence.
- **No widening of the importer's accepted source kinds.** If a future
  importer accepts more than LLDP / CDP, V1BA's classifier will need
  to be extended in lockstep; until then anything unfamiliar is
  honestly classified as `unknown`.
- **No multi-target sweep.** Each handoff is per-capture.
- **No graph link-jump.** Operator navigates manually to Topology mode.
- **No retries.** Operator re-clicks Import on failure.
- **No fake topology.** Truncation flag and exit code are surfaced;
  truncated output is still imported when classified, since the
  importer is the authority on what to keep — but the operator can see
  truncation occurred.

## Credential discipline

Captured outputs come from V1AZ, which never includes credentials in
its outcome shape. The handoff adapter passes through `command`,
`stdout`, `exit_code`, `output_truncated` only. Defense-in-depth tests
assert:

- `JSON.stringify(plan)` matches no `password` / `private_key` /
  `passphrase` substring.
- `document.body.innerHTML` after a captured render does not contain
  the operator's password (test types a unique secret and asserts
  non-containment).

## What V1BA+ can build on this

- **Auto-import once the V1BA credential-reference contract lands**
  — operator can pre-approve trusted targets so importing skips the
  per-candidate click.
- **Wider command classifier** as V1AQ accepts more vendor neighbour
  formats.
- **Link-jump to Topology mode** showing the freshly imported
  evidence set with V1AY graph-renderer focus.
- **Diagnose handoff** integrating V1AW projection with newly imported
  evidence — operator gets immediate "what changed" answers post-import.

## References

- `docs/architecture/SSH_TRANSPORT_V1_CONTRACT.md` — V1AZ captured
  outcome shape consumed by V1BA.
- `docs/architecture/DISCOVERY_FOUNDATION_V1.md` — V1AX target profile
  + read-only planner.
- `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` — V1AP/V1AQ raw
  import contract + V1AR managed store rules unchanged.
- `obsidian/stages/V1BA-ssh-evidence-handoff-v1.md` — stage note.
