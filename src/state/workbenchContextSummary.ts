/**
 * V1BO — Shared Workbench Context Summary.
 *
 * First cross-workbench data spine. Derives a label/count-only summary
 * from Discovery planning state, Topology source view, and (optional)
 * Intake summary so downstream workbenches (Operate, Assess, Hierarchy)
 * can read honest local context without engines, persistence, or
 * device contact.
 *
 * Hard discipline:
 *   - Counts and labels only. No raw configs, no credentials, no raw
 *     command output, no markdown bodies.
 *   - Deterministic: same inputs → same output.
 *   - No I/O, no fetch, no mutation.
 *   - intake summary is optional: if not provided, an EMPTY default is
 *     used so consumers can treat the field as always-present.
 */

import type { DataSourceState } from "../types/dataSource";
import type { DiscoveryPlanningSummary } from "../modes/discovery/discoveryPlanningSummary";
import type { TopologySourceView } from "../data/topologySource";

export type IntakeParseStatus =
  | "idle"
  | "detected"
  | "parsing"
  | "parsed"
  | "failed";

export interface WorkbenchDiscoverySummary {
  readonly seed_count: number;        // staged (enabled) seeds
  readonly total_seed_count: number;  // all seeds in plan
  readonly history_entry_count: number;
}

export interface WorkbenchTopologySummary {
  readonly node_count: number;
  readonly edge_count: number;
  readonly source_record_count: number;
  readonly environment_id: string | null;
  readonly source_state: DataSourceState;
  readonly has_view: boolean;
}

export interface WorkbenchIntakeSummary {
  readonly current_platform_id: string | null;
  readonly parse_status: IntakeParseStatus;
  readonly parsed_device_count: number;
  readonly finding_count: number;
}

export interface WorkbenchContextSummary {
  readonly discovery: WorkbenchDiscoverySummary;
  readonly topology: WorkbenchTopologySummary;
  readonly intake: WorkbenchIntakeSummary;
}

export const EMPTY_WORKBENCH_INTAKE_SUMMARY: WorkbenchIntakeSummary = {
  current_platform_id: null,
  parse_status: "idle",
  parsed_device_count: 0,
  finding_count: 0,
};

export const EMPTY_WORKBENCH_CONTEXT_SUMMARY: WorkbenchContextSummary = {
  discovery: {
    seed_count: 0,
    total_seed_count: 0,
    history_entry_count: 0,
  },
  topology: {
    node_count: 0,
    edge_count: 0,
    source_record_count: 0,
    environment_id: null,
    source_state: "not_connected",
    has_view: false,
  },
  intake: EMPTY_WORKBENCH_INTAKE_SUMMARY,
};

export interface BuildWorkbenchContextSummaryInputs {
  readonly discoveryPlanning: DiscoveryPlanningSummary;
  readonly topology: TopologySourceView;
  readonly intake?: WorkbenchIntakeSummary;
}

export function buildWorkbenchContextSummary(
  inputs: BuildWorkbenchContextSummaryInputs,
): WorkbenchContextSummary {
  return {
    discovery: {
      seed_count: inputs.discoveryPlanning.staged_seed_count,
      total_seed_count: inputs.discoveryPlanning.total_seed_count,
      history_entry_count: inputs.discoveryPlanning.history_entry_count,
    },
    topology: {
      node_count: inputs.topology.nodeCount,
      edge_count: inputs.topology.edgeCount,
      source_record_count: inputs.topology.sourceRecordCount,
      environment_id: inputs.topology.environmentId,
      source_state: inputs.topology.sourceState,
      has_view: inputs.topology.view !== null,
    },
    intake: inputs.intake ?? EMPTY_WORKBENCH_INTAKE_SUMMARY,
  };
}
