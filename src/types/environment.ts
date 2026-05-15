/**
 * Environment Engine — TypeScript surface.
 *
 * Mirrors `src-tauri/src/engines/environment.rs`. Keep in sync.
 * The Rust side is authoritative; TS types describe what the typed
 * Tauri command boundary returns.
 */

export type EnvironmentStatus = "healthy" | "degraded" | "offline" | "unknown";

export interface Environment {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly device_count: number;
  readonly status: EnvironmentStatus;
  readonly updated_at: string;
  readonly summary: string;
}

export type EnvironmentLifecycleState =
  | "ready"
  | "degraded"
  | "offline"
  | "incomplete";

export interface EnvironmentReadiness {
  readonly active_environment_id: string | null;
  readonly active_environment_name: string | null;
  readonly lifecycle_state: EnvironmentLifecycleState;
  readonly total_environments: number;
  readonly total_devices: number;
  readonly healthy_count: number;
  readonly degraded_count: number;
  readonly offline_count: number;
  readonly unknown_count: number;
  readonly message: string;
}
