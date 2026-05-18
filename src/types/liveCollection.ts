/**
 * Live Collection — TypeScript wire mirror (V1AT).
 *
 * Mirrors `src-tauri/src/engines/live_collection_plan.rs`. Rust is
 * authoritative. V1AT is a planning/safety boundary: no SSH, no
 * device contact, no credentials, no polling, no store mutation.
 *
 * Doctrine: `docs/architecture/TOPOLOGY_ENGINE_BOUNDARY.md` V1AT.
 */

import type { TopologyEvidenceImportMode } from "./topology";

export type LiveCollectionPlatform =
  | "iosxe"
  | "nxos"
  | "iosxr"
  | "eos"
  | "junos"
  | "huawei_vrp"
  | "nokia_sros"
  | "fortios"
  | "mikrotik";

export type LiveCollectionSourceKind = "lldp" | "cdp";

export type LiveCollectionReadinessState =
  | "ready"
  | "not_ready"
  | "unsupported";

export type LiveCollectionUnsupportedReason =
  | "driver_deferred"
  | "parser_unsupported";

export type LiveCollectionSafetyWarning =
  | "unsupported_platform"
  | "no_source_kind_selected"
  | "replace_import_mode_selected"
  | "unknown_platform_hint"
  | "missing_target_identifier"
  | "empty_command_plan"
  | "no_source_kind_matches_platform";

export interface LiveCollectionCommandPlan {
  readonly source_kind: LiveCollectionSourceKind;
  readonly command: string;
  readonly read_only: boolean;
  readonly raw_neighbor_source_kind: string;
  readonly platform_hint: string;
  readonly planned_import_function: string;
  readonly note: string;
}

export interface LiveCollectionDryRunRequest {
  readonly environment_id: string | null;
  readonly target_label: string | null;
  readonly platform_hint: string | null;
  readonly source_kinds: readonly LiveCollectionSourceKind[];
  readonly planned_import_mode: TopologyEvidenceImportMode | null;
}

export interface LiveCollectionDryRunPlan {
  readonly readiness: LiveCollectionReadinessState;
  readonly environment_id: string | null;
  readonly target_label: string | null;
  readonly platform: LiveCollectionPlatform | null;
  readonly raw_platform_hint: string | null;
  readonly planned_import_mode: TopologyEvidenceImportMode;
  readonly commands: readonly LiveCollectionCommandPlan[];
  readonly warnings: readonly LiveCollectionSafetyWarning[];
  readonly unsupported_reason: LiveCollectionUnsupportedReason | null;
  readonly safety_checklist: readonly string[];
  readonly honesty_note: string;
}
