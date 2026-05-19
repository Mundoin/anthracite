/**
 * Discovery Runner — TypeScript wire mirror (V1AX).
 *
 * Frontend types for the Discovery Foundation surface.
 * Mirrors Rust serde output from `src-tauri/src/commands/discovery_runner.rs`.
 * Rust is authoritative.
 *
 * Doctrine: `docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md` V1AX.
 */

import type { LiveCollectionPlatform } from "./liveCollection";

export type DiscoveryTransport = "ssh";

export interface DiscoveryTarget {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly platform_hint: LiveCollectionPlatform;
  readonly transport: DiscoveryTransport;
  readonly data_source_label: string;
}

export type DiscoveryTargetIssue =
  | "host_empty"
  | "host_whitespace_only"
  | "port_invalid"
  | "username_empty"
  | "data_source_label_empty";

export interface DiscoveryTargetValidation {
  readonly is_valid: boolean;
  readonly issues: ReadonlyArray<DiscoveryTargetIssue>;
}

export interface DiscoveryRunPlan {
  readonly target: DiscoveryTarget;
  readonly dry_run: unknown;
  readonly all_commands_read_only: boolean;
}

export interface CommandExecutionResult {
  readonly command: string;
  readonly exit_code: number | null;
  readonly duration_ms: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly output_truncated: boolean;
}

export type DiscoveryAuthMaterial =
  | { readonly kind: "password"; readonly password: string }
  | { readonly kind: "private_key"; readonly private_key_pem: string; readonly passphrase: string | null };

export interface DiscoveryCredentials {
  readonly auth: DiscoveryAuthMaterial;
}

export interface SshExecutionLimits {
  readonly connect_timeout_ms: number;
  readonly per_command_timeout_ms: number;
  readonly max_output_bytes_per_command: number;
  readonly max_total_output_bytes: number;
}

export type DiscoveryRunOutcome =
  | { readonly kind: "transport_deferred"; readonly reason: string }
  | { readonly kind: "refused"; readonly reason: string }
  | { readonly kind: "captured"; readonly command_results: ReadonlyArray<CommandExecutionResult> }
  | { readonly kind: "auth_failed"; readonly reason_redacted: string }
  | { readonly kind: "connection_failed"; readonly reason_redacted: string }
  | { readonly kind: "timeout"; readonly stage: string }
  | { readonly kind: "command_failed"; readonly partial_results: ReadonlyArray<CommandExecutionResult>; readonly reason_redacted: string };

export type ServerKeyTrustMode = "tofu_session";

/**
 * V1BD: pin status for a server key observed in an SSH attempt.
 * - `unpinned`   — no stored pin for this host:port.
 * - `matched`    — observed fingerprint matches the stored pin.
 * - `changed`    — observed fingerprint differs from the stored pin (warning).
 * - `unavailable` — pin lookup could not run (store error or pre-handshake exit).
 */
export type ServerKeyPinStatus = "unpinned" | "matched" | "changed" | "unavailable";

/** V1BD: a stored server-key pin for one host:port identity. */
export interface ServerKeyPin {
  readonly algorithm: string;
  readonly fingerprint_sha256: string;
  readonly first_seen_at: string;
  readonly last_seen_at: string;
}

export interface ServerKeyObservation {
  readonly algorithm: string;
  readonly fingerprint_sha256: string;
  readonly trust_mode: ServerKeyTrustMode;
}

export interface DiscoveryRunReport {
  readonly target_label: string;
  readonly platform_hint: LiveCollectionPlatform;
  readonly planned_command_count: number;
  readonly outcome: DiscoveryRunOutcome;
  /**
   * V1BC: observed server host key (algorithm + SHA256 fingerprint + trust mode).
   * `null`/absent when the transport never reached the host-key step (refused,
   * pre-flight failure, planner-only path, or connection_failed before TOFU).
   */
  readonly server_key?: ServerKeyObservation | null;
}
