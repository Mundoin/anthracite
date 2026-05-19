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

export type DiscoveryRunOutcome =
  | { readonly kind: "transport_deferred"; readonly reason: string }
  | { readonly kind: "refused"; readonly reason: string };

export interface DiscoveryRunReport {
  readonly target_label: string;
  readonly platform_hint: LiveCollectionPlatform;
  readonly planned_command_count: number;
  readonly outcome: DiscoveryRunOutcome;
}
