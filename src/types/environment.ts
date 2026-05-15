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
