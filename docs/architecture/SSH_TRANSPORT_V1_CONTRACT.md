# SSH Transport V1 Contract — Anthracite V1AZ

**Status:** v1 · **Date:** 2026-05-19

> **Pair doc:** [`docs/architecture/DISCOVERY_FOUNDATION_V1.md`](./DISCOVERY_FOUNDATION_V1.md)
> (V1AX container boundary). See also: [`obsidian/stages/V1AZ-ssh-transport-v1.md`](../obsidian/stages/V1AZ-ssh-transport-v1.md).

## Identity & Posture

V1AZ closes the transport gap inside the V1AX `attempt_discovery_run` boundary by shipping the first real SSH client. **Posture is operator-triggered, read-only, deterministic, and safe-by-contract.**

- **Operator-triggered:** Discovery runner invokes SSH transport only when the operator clicks "Run via SSH" after a valid plan is displayed. No scheduler, no polling, no background sweep.
- **Read-only execution:** Every command in the plan carries the V1AT `ReadOnlyCommand` contract. Pre-flight gate `all_commands_read_only` refuses any plan that does not pass. Defense-in-depth forbidden-token list adds a second gate: any command containing `configure terminal`, `conf t`, `enable`, `write memory`, `write erase`, `copy run`, `reload`, `shutdown`, `delete`, `format`, `erase`, `commit`, or `no <stanza>` is short-circuited to `Refused`.
- **Session-only credentials:** Password and private-key (PEM text) exist only in memory for the duration of a single `execute_discovery_run` call. No disk, no keyring, no environment variable, no cross-restart reuse. Credentials are dropped explicitly at scope exit.
- **Deterministic:** Same target + plan + credentials → same outcomes every time. No randomness, no concurrency, no state mutations across runs.
- **Honest outcome reporting:** Five new `DiscoveryRunOutcome` variants (see **Outcomes** section) report success, auth failure, connection failure, timeout, or command failure with redacted reason strings.

## Dependency Decision

**Crate choices:**

| Crate | Role | Rationale |
|-------|------|-----------|
| `russh` (0.45) | Pure-Rust async SSH client | Windows-first, no OpenSSL-sys, tokio-native, maintained. Primary transport. |
| `russh-keys` (0.45) | PEM parsing + key types | Paired with russh; handles Ed25519, RSA, ECDSA private keys. |
| `tokio` (1.x) | Async runtime | features `["macros", "rt-multi-thread", "time", "io-util", "sync", "net"]`. Runtime for russh client. |
| `async-trait` (0.1) | Async trait method support | Transport trait boundary and russh `Handler` impl. |

**`SecretString` is implemented locally** (not from the `secrecy` crate) — kept in `src-tauri/src/engines/ssh_transport.rs` as a small newtype with custom `Debug`/`Display` (`***`) and no `Serialize` derive. Keeping the redaction discipline in-tree avoids dependency drift on a security-sensitive primitive.

**Versions pinned in `src-tauri/Cargo.toml`:**
- `russh = "0.45"`
- `russh-keys = "0.45"`
- `tokio = "1"` (with features above)
- `async-trait = "0.1"`

All updates require Bujar approval. This small, auditable surface is intentional.

## Credential Handling Model

Credentials are provided by the operator in the UI and consumed by a single `execute_discovery_run` call. **No persistence; no reuse across runs; no fallback chains.**

**Input shape:**

```rust
pub struct DiscoveryCredentials {
    pub auth: DiscoveryAuthMaterial,
}

#[serde(tag = "kind", rename_all = "snake_case")]
pub enum DiscoveryAuthMaterial {
    Password { password: SecretString },
    PrivateKey { private_key_pem: SecretString, passphrase: Option<SecretString> },
}
```

**Handling rules:**

1. **Operator picks exactly one mode per attempt:** `password` OR `private_key` (+ optional passphrase).
2. **SecretString wrapper:** Local newtype in `ssh_transport.rs`. `Debug` and `Display` both print `***` regardless of content. Intentionally NOT derived `Serialize`. Credentials never appear in logs, error messages, JSX render, test fixtures, or Serde output.
3. **Parsing private keys:** `russh_keys::decode_secret_key(pem, passphrase_opt)` parses the PEM text into a russh `KeyPair` once; the SecretString-wrapped PEM and passphrase are dropped when `execute_discovery_run` returns.
4. **Session scope:** Credential variables live in the async function body of `execute_discovery_run`. At function exit (success, error, or panic) Rust's drop semantics free the heap memory; Rust does not guarantee bytewise zeroing, so the higher-priority safety is that no copy of the bytes ever escapes the function into a log, returned struct, or error string.
5. **No reuse:** Each call to `execute_discovery_run` (Tauri boundary) receives fresh credential input. No credential storage layer, no reference-counting, no session cache, no env-var fallback, no keychain integration.

## Read-Only Safety Gate

**Primary gate: V1AT `ReadOnlyCommand` contract.**

Every command in the plan carries a `read_only: bool` flag set by `plan_discovery_run`. Gate `all_commands_read_only` verifies all are `true` before returning the plan to the UI. If any command is non-read-only, plan generation fails with a rejection reason.

**Secondary gate: Forbidden-token allowlist.**

At execution time, before invoking any command on the SSH session, the runner checks for these forbidden substrings (case-insensitive on most vendors; exact case for Cisco):

- `configure terminal` / `conf t` (config mode entry)
- `enable` (privilege escalation)
- `write memory` / `wr` (save config)
- `write erase` (erase config)
- `copy run` (copy running-config)
- `reload` (device reboot)
- `shutdown` (port/interface disable or device halt)
- `delete` / `erase` (file operations)
- `format` (filesystem ops)
- `commit` (configuration commit, vendor-agnostic)
- `no <stanza>` (negation, often used to remove config)

**Short-circuit behavior:** If any forbidden token is found, the command is refused immediately with outcome `Refused { reason_redacted: "command contains forbidden operation" }`. No SSH session is opened. No partial execution of the plan.

## Bounded Execution

**Limits struct:**

```rust
pub struct SshExecutionLimits {
    /// Connection timeout. Default: 10s.
    pub connect_timeout_ms: u64,
    
    /// Per-command timeout. Default: 15s.
    pub per_command_timeout_ms: u64,
    
    /// Max output bytes per individual command. Default: 1 MB.
    pub max_output_bytes_per_command: usize,
    
    /// Max cumulative output across all commands. Default: 8 MB.
    pub max_total_output_bytes: usize,
}
```

**Timeout enforcement:**

- Connection attempt: wrapped in `tokio::time::timeout(connect_timeout_ms, russh_connect(…))`.
- Each command execution: wrapped in `tokio::time::timeout(per_command_timeout_ms, session.exec(…))`.
- Timeout → outcome `Timeout { stage: "connect" | "command_N" }`.

**Output truncation:**

- Per-command stdout + stderr combined, up to `max_output_bytes_per_command`. Excess bytes are discarded; result carries `output_truncated: true` flag.
- After each command, check running total against `max_total_output_bytes`. If next command would exceed, short-circuit to `Timeout { stage: "output_limit_exceeded" }`.
- Truncation is marked explicitly in the outcome so the operator knows the evidence is incomplete.

## Outcomes

**Updated `DiscoveryRunOutcome` enum:**

```rust
pub enum DiscoveryRunOutcome {
    /// Target invalid or plan unsafe before execution.
    Refused { reason_redacted: String },
    
    /// Transport not yet available (V1AZ replaces this with real execution).
    TransportDeferred { reason: String },
    
    /// Successfully captured command outputs. No auto-import.
    Captured { 
        command_results: Vec<SshCommandResult> 
    },
    
    /// Authentication (password or key) failed.
    AuthFailed { 
        reason_redacted: String 
    },
    
    /// TCP/SSH handshake failed (host unreachable, port closed, key exchange error).
    ConnectionFailed { 
        reason_redacted: String 
    },
    
    /// Connect or command timeout.
    Timeout { 
        stage: String  // "connect" or "command_N"
    },
    
    /// Command returned non-zero exit code or stderr (after redaction).
    CommandFailed { 
        partial_results: Vec<SshCommandResult>,
        reason_redacted: String 
    },
}

pub struct SshCommandResult {
    pub command: String,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub output_truncated: bool,
}
```

**Redaction policy:**

- `reason_redacted` fields contain only:
  - Generic descriptions: "authentication failed", "host unreachable", "command timed out"
  - Vendor error codes (e.g. `%SSH-3-USERAUTH_FAILED`) without secret bytes
  - NOT: credential material, hostname details, command text, raw stderr from device
- If an error message contains secret bytes (e.g. a password echo), those bytes are replaced with `[REDACTED]`.

**`CommandFailed` behavior:**

If any command returns a non-zero exit code or produces stderr, the entire plan short-circuits. `CommandFailed` carries all results captured up to that point in `partial_results`, plus the failure reason. Subsequent commands in the plan are not executed.

## Server-Key Pinning

**Current posture (V1AZ): Trust-on-first-use without pinning.**

V1AZ accepts any server key on first connection. No TOFU (Trust-on-First-Use) store, no pinning database, no fingerprint validation. This is a deliberate, time-limited boundary.

**Risk statement:** An attacker who can intercept the TCP connection (same network, DNS hijack, BGP hijack, etc.) can present a forged SSH key and capture credentials or commands. **This risk is accepted for V1AZ because:**
1. Discovery runs are operator-initiated and local to a known network.
2. V1BA will add server-key pinning + TOFU storage.
3. Shipping the read-only transport now is higher priority than pinning infrastructure.

**V1BA will land:**
- `ServerKeyStore` — persistent TOFU database (first-key-per-host).
- `pin_server_key(host, fingerprint)` — manual pinning.
- `verify_server_key(host, offered_key)` — gate that checks TOFU or pinned key. Refuse on mismatch.

## Evidence Handoff

**No auto-import in V1AZ.**

`execute_discovery_run` returns a `Captured { command_results }` outcome with raw stdout/stderr. The operator is shown these outputs in a `<pre>` block with a truncation badge if needed. A hint UI nudges the operator to run the next step explicitly: `import_topology_neighbor_output(evidence_blob)` (existing V1AP/V1AQ Tauri command).

**Rationale:**

- Operator reviews captured output before committing to topology.
- Evidence diff is shown in Assess mode (V1Y, future).
- No blind auto-import of potentially corrupt or irrelevant data.
- V1AR managed store is not touched by SSH transport directly.

**Future (post-V1AZ):**

Once a credential reference contract lands (V1BA+), the transport can surface a one-click "Import" button that directly invokes `import_topology_neighbor_output`, passing the captured evidence. Until then, operator does it manually.

## UI Surface

**DiscoveryMode gains two new sections:**

1. **Credential tab** — after target validation passes, operator toggles between "Password" and "Private Key" tabs.
   - Password tab: `<input type="password" name="password">` + Submit button.
   - Private Key tab: `<textarea>` for PEM text + optional passphrase `<input>` + Submit button.
   - Credential form state is React `useState`, never persisted. State is wiped after `execute_discovery_run` completes.

2. **Outcome panel** — renders based on `DiscoveryRunOutcome` variant:
   - `Refused` → red panel with reason.
   - `TransportDeferred` → yellow panel with deferral message (V1AZ replaces this).
   - `Captured` → green panel; each command's stdout/stderr in a `<pre>` block; truncation badges; hint: "Click 'Import Evidence' to move to V1AP/V1AQ import workflow."
   - `AuthFailed`, `ConnectionFailed`, `Timeout`, `CommandFailed` → red panel with redacted reason + partial results if applicable.

**Interaction sequence:**

1. Operator fills target form (host, port, username, platform, data_source_label).
2. Operator clicks "Validate" → `validate_discovery_target`.
3. Plan displays (read-only command list, parser route, gate status, honesty note).
4. Operator clicks "Run via SSH" → credential form appears.
5. Operator enters password or PEM key (+ passphrase if needed) → Submit.
6. SSH runner executes plan, displays outcome.
7. If `Captured`, operator can review evidence and click "Import Evidence" (future button; for now, manual V1AP/V1AQ step).

**CSS:** Reuse existing Anthracite dark theme (see `src/modes/*/Mode.css`). Credential form follows intake-panel styling. `<pre>` blocks use monospace + overflow scroll.

## Determinism & Safety Invariants

**Determinism:**

- Same `(target, plan, credential)` → same `DiscoveryRunOutcome` every time.
- No randomness in command order, retry logic, or output processing.
- No clock-dependent behavior except timeouts.

**Safety:**

1. **No scheduler.** Runner only executes on operator click.
2. **No polling.** No background refresh of credentials or connection state.
3. **No concurrent multi-target sweeps.** Single target per `attempt_discovery_run` call.
4. **No write commands.** Forbidden-token gate + read-only plan contract.
5. **No credential persistence.** `SecretString` dropped at function exit.
6. **No secret logging.** Error messages redacted; test fixtures never include real credentials.
7. **No secret in JSX.** Component state does not render credential values; form fields have `autoComplete="off"`.

## What V1BA Can Build on This

- **Server-key pinning + TOFU** — Add `ServerKeyStore`, manual pin API, and verification gate.
- **Multi-target sweep** — Operator provides target list; runner iterates with same credential, collecting results. Requires operator confirmation before execution.
- **Retry & backoff policy** — Automatic retry on transient failure (connect timeout, command timeout). Exponential backoff. Configurable per-target or global.
- **Structured stderr filtering** — Some vendors emit non-error warnings to stderr. Parsers can declare expected patterns; runner filters them before `CommandFailed` short-circuit.
- **Automatic raw-import handoff** — Once credential reference contract lands, "Import Evidence" button directly wires to `import_topology_neighbor_output`.
- **IOS-XR / MikroTik parsers** — Once parsers are added to V1AT plan-generation, they are automatically available to SSH transport.
- **Telemetry** — Track execution time per command, total duration, output size. Non-blocking, no performance impact.

## References

- **V1AT:** [`docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md`](./TOPOLOGY_ENGINE_BOUNDARY.md) — `ReadOnlyCommand` contract, plan-generation safety gates.
- **V1AX:** [`docs/architecture/DISCOVERY_FOUNDATION_V1.md`](./DISCOVERY_FOUNDATION_V1.md) — `DiscoveryRunOutcome` enum (prior), target profile contract, attempt runner boundary.
- **V1AP/V1AQ:** Raw evidence import path (referenced in handoff; exact boundary spec in future arch doc).
- **V1AR:** [`docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md`](./TOPOLOGY_ENGINE_BOUNDARY.md) — Managed topology store (not touched directly by SSH transport).
- **Stage note:** [`obsidian/stages/V1AZ-ssh-transport-v1.md`](../obsidian/stages/V1AZ-ssh-transport-v1.md).
