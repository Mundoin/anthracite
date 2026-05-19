# Discovery Foundation Contract — Anthracite V1AX

## Identity & Posture

**V1AX** ships the first real read-only discovery foundation. Operator-triggered,
deterministic, no background polling, no scheduler, no live transport. Builds on
**V1AT** (live-collection planner) and **V1AR** (managed evidence store).

Discovery Foundation answers the single operator question:

> "What remote devices are on my network, and what can I learn about them?"

The answer flows through three stages:

1. **Validate** — operator enters target host/port/username/platform_hint.
2. **Plan** — generate deterministic, read-only command set for that platform.
3. **Attempt** — future: run the plan against real SSH transport; today: honest
   deferral until transport lands.

---

## Scope (in)

**Mode and UI:**

- New mode: `ModeId "discovery"` under Foundation group.
- Engine label: "Discovery Runner".
- New `DiscoveryMode.tsx` under `src/modes/discovery/`.
- Target form (host, port, username, platform_hint, data_source_label).
- Plan display: command set, import mode, parser route, warnings, honesty note.
- Attempt surface: three honest outcomes — deferred (until V1AY transport), refused
  (invalid target or unsafe plan), captured (future when transport ships).

**Rust engine:**

- `discovery_runner.rs` module in `src-tauri/src/engines/`.
- `validate_discovery_target` command — parse + validate target profile.
- `plan_discovery_run` command — consume target, emit deterministic command
  plan (reuses `plan_live_topology_collection` from V1AT).
- `attempt_discovery_run` command — returns `DiscoveryRunOutcome::TransportDeferred`
  always. Refuses on invalid target or unsafe plan.
- All three commands are deterministic, read-only, no I/O.

**Target profile contract:**

```rust
DiscoveryTarget {
  host: String                    // hostname or IP
  port: u16                       // default 22
  username: String                // for auth; not persisted
  platform_hint: LiveCollectionPlatform  // enum: cisco-iosxe, junos, etc.
  transport: "ssh"                // literal; future transports TBD
  data_source_label: String       // provenance label for future evidence
}
```

Validation rules:
- `host` non-empty, parseable as hostname or IP.
- `port` in range 1–65535.
- `username` non-empty.
- `platform_hint` in `LiveCollectionPlatform` closed set.
- `data_source_label` non-empty.

**Plan generation:**

- Reuses `plan_live_topology_collection` from V1AT.
- Returns deterministic, serializable command plan.
- `all_commands_read_only` computed gate; attempts refuse if any command is non-read-only.
- No mutations to platform registry, fuzzy resolver, or evidence store.

**Evidence handoff path:**

- When real SSH transport ships (V1AY+), raw command output flows through
  existing V1AP/V1AQ raw-output import path.
- Evidence persists into V1AR managed evidence store (5-tuple dedup:
  `(source_kind, local_node_id, local_interface, remote_node_id, remote_interface)`).
- V1AX does NOT short-circuit that path; future stages plug in cleanly.

---

## Scope (out)

- **Real SSH transport.** No SSH crate added. No credentials persisted. No
  connection pooling. Deferred to V1AY transport driver.
- **Credential persistence.** Session-only username/password; nothing saved to
  disk or environment.
- **Multi-target sweeps.** Single-device discovery only. Batch discovery deferred.
- **Scheduling.** No background polling, no cron, no event loop. Operator-triggered
  only.
- **Retries.** No timeout handling, no backoff. Transport will own retry strategy.
- **Write/configure commands.** All commands are read-only. Attempts refuse if
  plan contains any mutation.
- **Graph renderer.** Topology edges exist in V1AS; renderer deferred pending
  discovery operator feedback.
- **DeviceModel schema expansion.** No new fields added to the canonical model.
- **Fuzzy resolver changes.** Inventory matching stays exact (hostname/record_id).
- **Parser extraction.** Parser stages (V1AP/V1AQ/V1AV) unchanged; V1AX does not
  trigger extraction.

---

## Mode placement

**Foundation group**, between Intake and Provisioning.

| Position | Mode | Purpose |
|----------|------|---------|
| — | Intake | Single-config + batch import, findings, validation |
| → | **Discovery** | **Remote network discovery (operator-triggered, read-only)** |
| → | Provisioning | Reserved; not landed |

Mode rail entry: new `<ModeButton>` with Discovery icon, mounted after Intake.
`MODE_STATUS` entry in `src/data/modeStatus.ts` flips from `not_connected`
→ `built`.

---

## Target profile contract (detailed)

### Field definitions

| Field | Type | Constraints | Example |
|-------|------|-------------|---------|
| `host` | string | non-empty; valid hostname or IP | `"router-01.lab"` or `"192.168.1.1"` |
| `port` | u16 | 1–65535 | `22` |
| `username` | string | non-empty | `"admin"` |
| `platform_hint` | enum | closed set from `LiveCollectionPlatform` | `"cisco-iosxe"` |
| `transport` | literal | `"ssh"` only | `"ssh"` |
| `data_source_label` | string | non-empty; becomes evidence provenance | `"lab-site-a"` |

### Validation order

1. Parse host as hostname or IP address.
2. Check port range.
3. Check username non-empty.
4. Validate platform_hint membership.
5. Check data_source_label non-empty.

If any fail, return `ValidationError` with the first failure reason. UI displays
the reason; operator corrects and resubmits.

---

## Plan generation

**Input:** validated `DiscoveryTarget`.

**Output:** `LiveCollectionPlan` (same shape as V1AT):

```
LiveCollectionPlan {
  all_commands_read_only: bool
  commands: [{
    kind,
    text,
    parser_route: { output_kind, vendor_platform, parser_hints }
  }]
  planned_import_mode,
  warnings,
  deferred_note
}
```

**Algorithm:**

- Dispatcher selects parser route based on `platform_hint`.
- Compiler emits platform-specific read-only commands (e.g., `show lldp
  neighbors` for IOS-XE).
- Returns the plan serialized and ready for future execution.

**Safety gate:** `all_commands_read_only` computed by inspecting every
command in the plan. If any command is write/configure/delete/shutdown,
the gate is false and attempts refuse with "Plan contains non-read-only
commands; discovery is read-only."

---

## Runner boundary

**`attempt_discovery_run` behavior:**

Until V1AY ships real SSH transport:

1. Check target validity (rerun validation).
2. Check plan safety (rerun `all_commands_read_only` gate).
3. Return `DiscoveryRunOutcome::TransportDeferred { reason: "SSH transport not yet implemented; see V1AY roadmap." }`.

UI displays the deferral message honestly. Operator reads the roadmap,
understands the stage, and returns when V1AY ships.

If target is invalid or plan is unsafe, refuse with appropriate error message.

---

## Evidence path

**Today (V1AX):** No transport, no evidence.

**Tomorrow (V1AY+):**

Raw output from successful discovery run:

```
SSHCommandResult {
  command: String,
  output: String,
  exit_code: u8
}
```

Flows into existing **V1AP/V1AQ raw-output import path** via new
`import_discovery_raw_output` Tauri command. Import path:

1. Dispatcher routes output to appropriate parser (IOS-XE, Junos, etc.).
2. Parser extracts neighbor evidence, identity, interfaces, services.
3. Evidence persists into **V1AR managed evidence store** (5-tuple dedup).
4. Store projects into **V1AN/V1AM topology edge pipeline**.
5. Edges appear live in **V1AS topology review surface**.
6. Answers appear in **V1AW diagnose seed**.

V1AX does NOT short-circuit this path; future transport stages plug in cleanly.

---

## UI surface

**Location:** `src/modes/discovery/DiscoveryMode.tsx` + `.css` under Foundation group.

**Three-step flow:**

### 1. Target form (always visible)

- Fields: host, port, username, platform_hint select, data_source_label.
- Validate button → calls `validate_discovery_target`.
- On success: unlock Plan button.
- On failure: show validation error.

### 2. Plan display (conditional on successful validation)

- Command list: kind + text for each command.
- Parser route metadata.
- `all_commands_read_only` gate status.
- Warning set (e.g., "platform deferred in V1AY").
- Honesty note: "This is a dry-run plan. No commands executed yet."

### 3. Attempt surface (conditional on ready plan)

- Attempt button → calls `attempt_discovery_run`.
- On TransportDeferred: display deferral message with roadmap link.
- On Refused: display refusal reason.
- On Captured (V1AY+): display success, show evidence link to V1AR import.

**Empty state:** When nothing entered, show guidance:
"Enter a target device (hostname or IP) to discover remote network topology."

**Clean state (optional):** If target is validated but no plan generated,
show "Plan is ready. Review above and click Attempt Run to proceed."

---

## Tauri commands

All three are deterministic, read-only, no I/O.

### `validate_discovery_target`

**Input:**
```
{
  host: String,
  port: u16,
  username: String,
  platform_hint: String,
  transport: String,
  data_source_label: String
}
```

**Output:**
```
{
  ok: bool,
  target?: DiscoveryTarget,        // on success
  error?: String                   // on failure
}
```

### `plan_discovery_run`

**Input:**
```
{
  target: DiscoveryTarget
}
```

**Output:**
```
{
  plan: LiveCollectionPlan
}
```

### `attempt_discovery_run`

**Input:**
```
{
  target: DiscoveryTarget,
  plan: LiveCollectionPlan
}
```

**Output:**
```
{
  outcome: "TransportDeferred" | "Refused",
  reason?: String,
  evidence?: []          // future: captured evidence structure
}
```

---

## Invariants

- **No transport crate added.** SSH deferred to V1AY.
- **No credentials persisted.** Session-only memory.
- **No write/configure commands.** `all_commands_read_only` gate is enforced.
- **No scheduler.** Operator-triggered only.
- **No fuzzy resolver changes.** Inventory matching stays exact.
- **No DeviceModel schema expansion.** Reuses existing fields.
- **No parser extraction.** V1AP/V1AQ/V1AV unchanged.
- **Deterministic plan generation.** Same target always yields same plan.

---

## What V1AY can build on this

**Transport driver (V1AY):**

- Add SSH crate (likely `openssh-rs` or `async-ssh2-tokio`).
- Implement `execute_discovery_run(target, plan) → SSHCommandResult[]`.
- Wire Tauri command to live execution.
- Change `attempt_discovery_run` to actually run the plan.
- Return captured evidence to V1AR import path.

**Credential reference contract (V1AY+):**

- Persistent credential storage (encrypted key store, environment lookup, or
  SSH agent).
- Credential reuse across multiple discovery runs.
- Credential rotation / expiry policy.

**Evidence preview surface (V1AY+):**

- Real-time evidence stream UI (show captured devices as they arrive).
- Merge preview before import (operator confirms evidence before persisting).
- Evidence diff display (comparing old vs. new topology).

---

## References

- **V1AT:** [`docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md`](./TOPOLOGY_ENGINE_BOUNDARY.md) — live-collection
  planner, plan determinism, read-only safety gate.
- **V1AR:** [`obsidian/stages/V1AR-evidence-set-management.md`](../obsidian/stages/V1AR-evidence-set-management.md)
  — managed evidence store, 5-tuple dedup, import modes.
- **V1AW:** [`obsidian/stages/V1AW-diagnose-seed.md`](../obsidian/stages/V1AW-diagnose-seed.md) — diagnose
  answers that consume discovery output.
- **Source of Truth:** [`docs/architecture/ANTHRACITE_V1_SOURCE_OF_TRUTH.md`](./ANTHRACITE_V1_SOURCE_OF_TRUTH.md).
- **Modes & Engines:** [`docs/architecture/MODES_AND_ENGINES_MAP.md`](./MODES_AND_ENGINES_MAP.md).
