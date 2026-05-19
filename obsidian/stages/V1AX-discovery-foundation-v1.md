# V1AX — Discovery Foundation v1

**Arc:** DISCOVERY  
**Date:** 2026-05-19  
**Status:** landed

---

## Objective

Ship the first real discovery foundation: operator-triggered, read-only,
deterministic. Foundation group gains a new Discovery mode that accepts a
target device, generates a platform-specific read-only command plan, and
honestly defers execution until SSH transport lands in V1AY. No transport
crate, no credentials persisted, no scheduler, no graph renderer. Builds on
V1AT (live-collection planner) and V1AR (managed evidence store).

---

## Scope in

**Rust engine (`src-tauri/src/engines/discovery_runner.rs`):**

- `validate_discovery_target` — parse and validate host/port/username/platform_hint/transport/data_source_label.
- `plan_discovery_run` — consume validated target, emit deterministic read-only command plan (reuses V1AT `plan_live_topology_collection`).
- `attempt_discovery_run` — returns `DiscoveryRunOutcome::TransportDeferred` always. Refuses on invalid target or unsafe (non-read-only) plan.
- All three are deterministic, read-only, no I/O.

**Tauri command wiring:**

- Three new Tauri commands exposing the three Rust functions.
- TypeScript wire mirrors in `src/api/discovery.ts`.
- Full type safety across boundary.

**TypeScript types (`src/modes/discovery/discoveryTypes.ts`):**

- `DiscoveryTarget` — validated target profile.
- `DiscoveryPlan` — read-only command set (shape reused from V1AT `LiveCollectionPlan`).
- `DiscoveryRunOutcome` — deferred/refused/captured (future).
- `DiscoveryValidationError` — validation failure details.

**UI surface (`src/modes/discovery/DiscoveryMode.tsx` + `.css`):**

- Target form: host, port, username, platform_hint select, data_source_label.
- Validate button → `validate_discovery_target`.
- Plan display: command list, parser route metadata, `all_commands_read_only` gate, warnings, honesty note.
- Attempt button → `attempt_discovery_run`.
- Three honest outcomes: TransportDeferred (show deferral message + roadmap), Refused (show reason), Captured (future).
- Empty state when nothing entered. Clean state when validated but not attempted.

**Mode integration:**

- New `ModeId "discovery"` in Foundation group, between Intake and Provisioning.
- New `<ModeButton>` entry in mode rail with Discovery icon.
- `src/data/modeStatus.ts` flips `discovery` from `not_connected` → `built`.
- `src/App.tsx` adds `activeMode === "discovery"` branch, consuming existing discovery + topology state (no new callbacks, no new fetches).

**Tests:**

- `__tests__/discoveryRunner.test.rs` — validation (host, port, username, platform, label), plan generation (determinism, command set, gate), attempt deferral, refusal on invalid/unsafe.
- `__tests__/DiscoveryMode.test.tsx` — form render + field validation, plan display, attempt outcomes, empty/clean states, API error handling.

**Docs:**

- `docs/architecture/DISCOVERY_FOUNDATION_V1.md` — purpose, scope, contracts, evidence path, tauri commands, what V1AY builds on.
- This stage note.
- `obsidian/ANTHRACITE_INDEX.md` V1AX row.

---

## What did NOT land

- **Real SSH transport.** No SSH crate added. No connection pooling, no timeout handling. Deferred to V1AY transport driver.
- **Credential persistence.** Session-only username/password. No encrypted key store, no environment lookup, no SSH agent integration.
- **Multi-target sweeps.** Single-device discovery only. Batch discovery deferred.
- **Polling/scheduling.** No background tasks, no cron, no event loop. Operator-triggered only.
- **Graph renderer.** Topology edges exist in V1AS; renderer waits until discovery truth is known.
- **DeviceModel schema expansion.** No new fields.
- **Parser extraction.** V1AP/V1AQ/V1AV unchanged; no new parser stages triggered.
- **Write/configure commands.** `all_commands_read_only` gate is enforced; unsafe plans are refused.
- **Fuzzy resolver changes.** Inventory matching stays exact (hostname/record_id).

---

## Acceptance evidence

```
pnpm typecheck                                    clean
pnpm test --run (full)                            658 passed (+10 runner, +6 UI)
pnpm build                                        126 modules, ~475 ms
cargo check / cargo test (src-tauri)              green
tools/ops-readiness.ps1                           READY
```

---

## Why this slice now

Bujar's directive: Discovery Foundation precedes graph renderer. Renderer waits
until discovery operator feedback confirms what topology truth should look like.
Foundation lands **before** rendering, establishing the read-only safety boundary
and the evidence handoff path that V1AY transport will plug into.

---

## Operator user journey

1. **Enter target:** Host (or IP), port (default 22), username, platform hint
   (closed enum), data-source label for future evidence.
2. **Validate:** Click Validate. On success: form locks, Plan button unlocks.
   On failure: error message, operator fixes field.
3. **Review plan:** Read deterministic command list. Confirm `all_commands_read_only`
   gate (always true in V1AX). Understand parser route and warnings.
4. **Attempt run:** Click Attempt. UI shows deferral message: "SSH transport
   ships in V1AY. See roadmap."
5. **Return in V1AY:** When transport lands, same workflow runs live. Evidence
   flows into V1AR, projects into V1AS edges, answers appear in V1AW.

Three honest outcomes at every stage: success, refusal with reason, deferral with
timestamp + roadmap.

---

## Next-stage candidates

**V1AY — Transport Driver (SSH + Platform Routes):**

- Add SSH crate (openssh-rs or async-ssh2-tokio).
- Implement `execute_discovery_run(target, plan)`.
- Change `attempt_discovery_run` to actually run the plan.
- Evidence flows through V1AP/V1AQ/V1AR into V1AS/V1AW.

**V1AY-A — Credential Reference Contract:**

- Persistent credential storage (key store, environment, SSH agent).
- Credential reuse across multiple runs.
- Credential rotation / expiry.

**V1AY-B — Evidence Preview Surface:**

- Real-time evidence stream UI (show devices as captured).
- Merge preview before import (operator confirms before persist).
- Evidence diff (old vs. new topology).

---

## Cross-links

- [`../../docs/architecture/DISCOVERY_FOUNDATION_V1.md`](../../docs/architecture/DISCOVERY_FOUNDATION_V1.md)
- `src-tauri/src/engines/discovery_runner.rs`
- `src/modes/discovery/discoveryTypes.ts`
- `src/modes/discovery/DiscoveryMode.tsx`
- `src/api/discovery.ts`
- `src/data/modeStatus.ts` (discovery flip)
- `src/App.tsx` (discovery branch wiring)
- [`V1AW-diagnose-seed.md`](./V1AW-diagnose-seed.md) — answers from discovery output.
- [`V1AT-live-collection-safety-dry-run.md`](./V1AT-live-collection-safety-dry-run.md) — plan reuse.
- [`V1AR-evidence-set-management.md`](./V1AR-evidence-set-management.md) — evidence store handoff.
