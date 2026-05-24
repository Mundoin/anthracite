import type { LabEnvironment, LabEnvironmentCapabilityFlags } from "./labEnvironment";

export type LocalEnvironmentLifecycleState = "active" | "available" | "archived";
export type LocalEnvironmentProvenance = "generated-lab" | "synthetic" | "fabricated" | "demo";

export interface TopologyPresentation {
  readonly version: 1;
  readonly node_positions: Record<string, { readonly x: number; readonly y: number }>;
}

export interface LocalEnvironmentRecord {
  readonly environment_id: string;
  readonly name: string;
  readonly kind: "fabricated" | "generated-lab";
  readonly scenario_id: string;
  readonly scenario_name: string;
  readonly scenario_seed: string;
  readonly provenance: LocalEnvironmentProvenance;
  readonly status: "unknown" | "idle";
  readonly created_at: string;
  readonly updated_at: string;
  readonly source_summary: string;
  readonly device_count: number;
  readonly link_count: number;
  readonly config_count: number;
  readonly lab_payload: LabEnvironment;
  readonly capability_flags: LabEnvironmentCapabilityFlags;
  readonly generator_version: string;
  readonly lifecycle_state: LocalEnvironmentLifecycleState;
  readonly revision: number;
  readonly origin: "local";
  readonly source_id: string | null;
  readonly sync_state: "local-only" | "clean" | "dirty" | "pending-sync" | "conflict" | "remote-shadow";
  readonly local_only: boolean;
  // Sync-ready fields
  readonly environment_uid: string;
  readonly base_revision: number;
  readonly last_saved_at: string | null;
  readonly last_loaded_at: string | null;
  readonly updated_by: string | null;
  readonly topology_presentation?: TopologyPresentation;
}

export interface EnvironmentLifecycleStoreState {
  readonly environments: readonly LocalEnvironmentRecord[];
  readonly active_environment_id: string | null;
  // Store-level sync & schema tracking
  readonly schema_version: "1";
  readonly store_revision: number;
  readonly storage_origin: "local";
  readonly persistence_kind: "local-browser" | "local-file" | "memory";
  readonly last_saved_at: string | null;
  readonly last_loaded_at: string | null;
}
