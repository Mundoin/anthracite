# V1AZ — SSH Transport v1

**Objective:** Ship read-only SSH transport (pure-Rust `russh` client) behind the V1AX `attempt_discovery_run` boundary. Operator-triggered, session-only credentials, forbidden-token safety gate, explicit evidence handoff to V1AP/V1AQ import workflow.

**Date:** 2026-05-19

## Scope in

**Rust engine (`src-tauri/src/engines/discovery_runner.rs`, new module `ssh_transport.rs`):**

- `SshTransport` trait — async boundary for pluggable SSH implementation.
  ```rust
  #[async_trait::async_trait]
  pub trait SshTransport: Send + Sync {
      async fn execute_read_only(
          &self,
          host: &str,
          port: u16,
          username: &str,
          credentials: &DiscoveryCredentials,
          commands: &[String],
          limits: SshExecutionLimits,
      ) -> SshExecutionOutcome;
  }
  ```
- `RealRusshTransport` — production impl using `russh` + `russh-keys`. Connects via `russh::client::connect`, authenticates via password (`handle.authenticate_password`) OR via PEM private key (`russh_keys::decode_secret_key` → `handle.authenticate_publickey`), opens one `channel_open_session()` per command, calls `channel.exec`, streams `ChannelMsg::Data` and `ChannelMsg::ExtendedData{ext:1}` while honouring per-command + total output caps, captures `ExitStatus`, and disconnects on completion or failure. All wrapped in `tokio::time::timeout` for connect, authenticate, and per-command stages. Errors mapped through `redact_error()` so neither credential bytes nor russh-internal addresses leak.
- `TofuClient` — `russh::client::Handler` impl. `check_server_key` returns `Ok(true)` (trust-on-first-use). Server-key pinning lands in V1BA.
- `SshTransport` is a trait, so tests inject deterministic mocks without going to a real socket.
- `DiscoveryCredentials` struct — `auth: DiscoveryAuthMaterial` (`Password { password: SecretString }` OR `PrivateKey { private_key_pem: SecretString, passphrase: Option<SecretString> }`). `SecretString` newtype with custom `Debug`/`Display` printing `***`; intentionally NOT `Serialize`. Dropped explicitly at the end of `execute_discovery_run`.
- `SshExecutionLimits` struct — connect timeout (default 10s), per-command timeout (default 15s), per-command output cap (default 1 MiB), total output cap (default 8 MiB). Enforced via `tokio::time::timeout`.
- `CommandExecutionResult` struct — command text, exit code, duration_ms, stdout, stderr, output_truncated flag.
- Updated `DiscoveryRunOutcome` enum — five new variants: `Captured { command_results }`, `AuthFailed { reason_redacted }`, `ConnectionFailed { reason_redacted }`, `Timeout { stage }`, `CommandFailed { partial_results, reason_redacted }`. Existing `TransportDeferred` and `Refused` stay.
- `execute_discovery(target, credentials, transport) → DiscoveryRunReport` — pure function wiring validation, planning, read-only gate, and the trait. `execute_discovery_run` Tauri command instantiates `RealRusshTransport` and delegates.

**Dependencies pinned (`src-tauri/Cargo.toml`):**
- `russh = "0.45"` (pure-Rust async SSH client)
- `russh-keys = "0.45"` (PEM private-key parsing)
- `tokio = "1"` with `["macros", "rt-multi-thread", "time", "io-util", "sync", "net"]`
- `async-trait = "0.1"`
- `SecretString` is implemented locally as a newtype (no `secrecy` crate added) so the redaction discipline lives in this codebase and cannot drift with an external dep.

**TypeScript types (`src/types/discoveryRunner.ts`, extensions):**

- `DiscoveryCredentials` + `DiscoveryAuthMaterial` (`password | private_key`) mirrored from Rust serde shape.
- `SshExecutionLimits` with defaults.
- `CommandExecutionResult` shape.
- `DiscoveryRunOutcome` discriminated union covering all five new variants + existing two.
- `executeDiscoveryRun` wrapper in `src/api/discoveryRunner.ts`.

**UI surface (`src/modes/discovery/DiscoveryMode.tsx` + `Mode.css`, extensions):**

- Credential tab toggle (Password vs. Private Key) visible after target validation passes.
- Password tab: `<input type="password">` for password, autofill disabled.
- Private Key tab: `<textarea>` for PEM text, optional passphrase input, autofill disabled.
- Credential form state is React `useState`, immediately wiped after `execute_discovery_run` completes.
- Outcome panel renders based on variant:
  - `Captured` → green background, each command's stdout/stderr in `<pre>` with truncation badge if needed; hint: "Review and click Import Evidence to proceed to V1AP/V1AQ."
  - `AuthFailed`, `ConnectionFailed`, `Timeout`, `CommandFailed` → red background with redacted reason + partial results if applicable.
  - `Refused` → red background with reason (invalid target or unsafe plan).
  - `TransportDeferred` → yellow background (V1AX placeholder, replaced in V1AZ).
- CSS: dark theme, monospace for `<pre>` blocks, overflow scroll for large outputs.

**Tests:**

- `src-tauri/src/engines/ssh_transport.rs` module tests:
  - `test_securestring_debug_prints_stars` — SecretString Debug impl.
  - `test_forbidden_token_gate` — all forbidden tokens (case insensitive) are caught; safe commands pass.
  - `test_outcome_carry_no_secrets` — all outcomes (`AuthFailed`, `ConnectionFailed`, `CommandFailed`) carry no secret bytes; redaction verified.
  - `test_timeout_enforcement` — tokio::time::timeout fires correctly per connect and per-command limits.
  - `test_output_truncation` — per-command and total-output caps respected; `output_truncated` flag set.
  - `test_mock_transport_determinism` — same input always yields same outcome.

- `__tests__/DiscoveryMode.test.tsx`:
  - Credential form renders when validation passes.
  - Password and Private Key tabs toggle correctly.
  - Form fields have `autoComplete="off"`.
  - Credential state is wiped after `execute_discovery_run` completes.
  - Outcome panel renders for each `DiscoveryRunOutcome` variant.
  - No credential values appear in rendered DOM.
  - `<pre>` blocks render captured stdout/stderr.
  - Truncation badges display when `output_truncated` is true.

**Docs:**

- [`docs/architecture/SSH_TRANSPORT_V1_CONTRACT.md`](../../docs/architecture/SSH_TRANSPORT_V1_CONTRACT.md) — full contract, dependency decision, credential handling, safety gates, outcome enum, pinning posture, evidence handoff, UI surface, determinism invariants, V1BA roadmap.
- This stage note — scope, acceptance, user journey, next candidates.
- `obsidian/ANTHRACITE_INDEX.md` — V1AZ row (see below).

## What did NOT land

- **Server-key pinning / TOFU:** V1AZ accepts any server key. V1BA will add `ServerKeyStore` + pinning.
- **Credential persistence:** No encrypted keyring, no env-var lookup, no SSH agent integration. Each run requires fresh input.
- **Multi-target sweep:** Single target per call. V1BA can add sweep with operator confirmation.
- **Retry / backoff policy:** No automatic retry on timeout or transient error. Operator re-clicks to retry.
- **Structured stderr filtering:** Vendor warnings go to `CommandFailed`. V1BA parsers can declare safe-stderr patterns.
- **Auto-import handoff:** Operator explicitly runs V1AP/V1AQ import after reviewing evidence. Future button can wire directly.
- **IOS-XR / MikroTik parsers:** Parsers live in V1AT plan generation. SSH transport consumes them as-is.
- **Scheduler / polling:** No background Discovery runner. Operator-triggered only.
- **Telemetry:** No execution-time tracking or metrics. Future.

## Acceptance evidence

**Build & check:**
- `pnpm typecheck` — green.
- `pnpm build` — green (132 modules; DiscoveryMode + credential form compile).
- `cargo check --manifest-path src-tauri/Cargo.toml --lib` — green (RealRusshTransport wired against russh 0.45.0; TofuClient implements `russh::client::Handler` via `#[async_trait]`).
- `cargo test --manifest-path src-tauri/Cargo.toml --lib` — **566/566 passing** (+15 new SSH-transport tests covering `SecretString` Debug/Display redaction, credential deserialize roundtrip, `SshExecutionLimits` defaults, `CommandExecutionResult` JSON shape, all 6 `SshExecutionOutcome` variants, read-only gate, forbidden-token detection, error-redaction policy).
- `pnpm test --run` — **744/744 passing** (+16 new V1AZ SSH frontend tests covering credential section gating, password/key tab toggle, all five live outcomes (`captured`, `auth_failed`, `connection_failed`, `timeout`, `command_failed`), truncation badge, scrub-on-complete for success AND failure, scrub of private-key textarea, no-double-fire on rapid clicks, and an explicit DOM-leak assertion that `document.body.innerHTML` never contains the supplied secret bytes).

**Ops readiness:**
- `tools/ops-readiness.ps1` reports READY (13/13).

## Why this slice now

V1AX established the `attempt_discovery_run` boundary and the `DiscoveryRunOutcome` enum. V1AX always returned `TransportDeferred` as a placeholder. V1AZ ships the first real transport behind that same boundary, allowing operator to run actual read-only commands on a target device and capture evidence. No topology auto-import, no pinning, no persistence — but real SSH execution with honest outcome reporting. Operator workflow moves from "validated plan, deferred" to "validated plan, executed, captured, reviewed, explicitly imported."

## Operator user journey

1. **Discovery mode:** Operator enters target (host, port, username, platform, data_source_label) and clicks "Validate".
2. **Plan review:** Plan displays (read-only command list, parser route, `all_commands_read_only` gate, honesty note).
3. **Run via SSH:** Operator clicks "Run via SSH".
4. **Credential entry:** Credential tab appears. Operator enters password OR pastes private-key PEM (+ optional passphrase).
5. **Execution:** SSH runner opens session, runs each command, captures stdout/stderr, respects timeouts and output limits.
6. **Outcome:** Operator sees `Captured` (green, with command results in `<pre>` blocks) OR explicit failure (`AuthFailed`, `ConnectionFailed`, `Timeout`, `CommandFailed`).
7. **Import decision:** Operator reviews captured output. If acceptable, operator manually runs V1AP/V1AQ import (future: one-click "Import Evidence" button).
8. **Topology integration:** Imported evidence flows through existing V1AR managed store pipeline (operator-visible in Assess mode, V1Y).

## Next-stage candidates

- **V1BA:** Server-key pinning + TOFU storage. Credential reference contract. Multi-target sweep with operator confirmation. Retry/backoff policy. Structured stderr filtering for vendor-specific parsers.
- **V1BB:** Auto-import handoff once credential reference is live.
- **V1BC:** IOS-XR and MikroTik parser integration (V1AT plan-generation updates).
- **Telemetry (post-V1BZ):** Execution-time metrics, success rates, failure frequency, output size distribution.

## Cross-links

- **Architecture:** [`docs/architecture/SSH_TRANSPORT_V1_CONTRACT.md`](../../docs/architecture/SSH_TRANSPORT_V1_CONTRACT.md) — full contract, dependencies, safety gates.
- **Foundation:** [`docs/architecture/DISCOVERY_FOUNDATION_V1.md`](../../docs/architecture/DISCOVERY_FOUNDATION_V1.md) — V1AX target profile, plan generation, DiscoveryRunOutcome enum (prior).
- **Topology engine:** [`docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md`](../../docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md) — V1AT ReadOnlyCommand contract, plan-generation safety.
- **Evidence import:** V1AP/V1AQ raw-import path (Tauri command `import_topology_neighbor_output`).
- **Managed store:** [`docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md`](../../docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md) — V1AR (not touched directly by V1AZ).
