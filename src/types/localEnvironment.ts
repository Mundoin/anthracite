import type { LabEnvironment, LabEnvironmentCapabilityFlags } from "./labEnvironment";

export type LocalEnvironmentLifecycleState = "active" | "available" | "archived";
export type LocalEnvironmentProvenance = "generated-lab" | "synthetic" | "fabricated" | "demo";

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
  readonly sync_state: "local-only";
  readonly local_only: boolean;
}

export interface EnvironmentLifecycleStoreState {
  readonly environments: readonly LocalEnvironmentRecord[];
  readonly active_environment_id: string | null;
}
