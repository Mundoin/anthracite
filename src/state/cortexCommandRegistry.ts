/**
 * V1BX — Cortex Command Registry.
 *
 * Pure deterministic catalog of operator-addressable commands across
 * modes/tools, with per-command availability derived from safe context.
 *
 * Hard discipline:
 *   - Inputs are safe projections only (WorkbenchContextSummary,
 *     AssessmentReadiness, OperatorActivityLedger, DiagnoseTriage).
 *   - Output is labels/ids/reason-codes only — no raw configs, no raw
 *     evidence, no markdown bodies, no command output, no credentials,
 *     no secrets, no evidence_set_id, no raw error messages.
 *   - Deterministic: same inputs → same output (including order).
 *   - No I/O, no fetch, no mutation, no execution.
 *   - Reason codes are short tokens, not raw stderr.
 *   - Future commands are honestly `deferred` with a reason_code, never
 *     pretended `available`.
 */

import type { WorkbenchContextSummary } from "./workbenchContextSummary";
import type { AssessmentReadiness } from "./assessmentReadiness";
import type { OperatorActivityLedger } from "./operatorActivityLedger";
import type { DiagnoseTriage } from "../modes/diagnose/diagnoseTriage";

export type CortexCommandMode =
  | "discovery"
  | "topology"
  | "intake"
  | "operate"
  | "assess"
  | "diagnose"
  | "build"
  | "hierarchy";

export type CortexCommandStatus = "available" | "deferred" | "blocked";

export type CortexCommandReasonCode =
  | "no_discovery_seeds"
  | "no_crawl_preview"
  | "no_topology_environment"
  | "no_topology_view"
  | "no_assessment_context"
  | "no_triage_input"
  | "visual_construct_deferred"
  | "intent_workspace_deferred";

export interface CortexCommand {
  readonly id: string;
  readonly label: string;
  readonly mode: CortexCommandMode;
  readonly target_tool_id: string | null;
  readonly status: CortexCommandStatus;
  readonly reason_code: CortexCommandReasonCode | null;
  readonly required_signals: readonly string[];
  readonly summary_label: string;
  readonly priority: number;
}

export interface CortexCommandRegistry {
  readonly commands: readonly CortexCommand[];
  readonly total_count: number;
  readonly available_count: number;
  readonly deferred_count: number;
  readonly blocked_count: number;
}

export const EMPTY_CORTEX_COMMAND_REGISTRY: CortexCommandRegistry = {
  commands: [],
  total_count: 0,
  available_count: 0,
  deferred_count: 0,
  blocked_count: 0,
};

export interface BuildCortexCommandRegistryInputs {
  readonly summary: WorkbenchContextSummary;
  readonly readiness: AssessmentReadiness;
  readonly ledger: OperatorActivityLedger;
  readonly triage: DiagnoseTriage;
}

interface CommandDefinition {
  readonly id: string;
  readonly label: string;
  readonly mode: CortexCommandMode;
  readonly target_tool_id: string | null;
  readonly summary_label: string;
  readonly priority: number;
  readonly resolve: (
    inputs: BuildCortexCommandRegistryInputs,
  ) => {
    status: CortexCommandStatus;
    reason_code: CortexCommandReasonCode | null;
    required_signals: readonly string[];
  };
}

function ok(): {
  status: CortexCommandStatus;
  reason_code: CortexCommandReasonCode | null;
  required_signals: readonly string[];
} {
  return { status: "available", reason_code: null, required_signals: [] };
}

function blocked(
  reason_code: CortexCommandReasonCode,
  required_signals: readonly string[],
): {
  status: CortexCommandStatus;
  reason_code: CortexCommandReasonCode | null;
  required_signals: readonly string[];
} {
  return { status: "blocked", reason_code, required_signals };
}

function deferred(
  reason_code: CortexCommandReasonCode,
): {
  status: CortexCommandStatus;
  reason_code: CortexCommandReasonCode | null;
  required_signals: readonly string[];
} {
  return { status: "deferred", reason_code, required_signals: [] };
}

const DEFINITIONS: readonly CommandDefinition[] = [
  // Discovery
  {
    id: "open_discovery_seed_planner",
    label: "Open Discovery Seed Planner",
    mode: "discovery",
    target_tool_id: "seed_planner",
    summary_label: "Stage seeds for discovery",
    priority: 10,
    resolve: () => ok(),
  },
  {
    id: "open_crawl_preview",
    label: "Open Crawl Preview",
    mode: "discovery",
    target_tool_id: "crawl_preview",
    summary_label: "Build crawl preview from staged seeds",
    priority: 20,
    resolve: ({ summary }) =>
      summary.discovery.seed_count > 0
        ? ok()
        : blocked("no_discovery_seeds", ["discovery_seeds"]),
  },
  // Topology
  {
    id: "open_topology_graph",
    label: "Open Topology Graph",
    mode: "topology",
    target_tool_id: "graph",
    summary_label: "Inspect topology graph projection",
    priority: 30,
    resolve: ({ summary }) =>
      summary.topology.has_view
        ? ok()
        : blocked("no_topology_view", ["topology_view"]),
  },
  {
    id: "open_topology_evidence_import",
    label: "Open Topology Evidence Import",
    mode: "topology",
    target_tool_id: "evidence_import",
    summary_label: "Import LLDP/CDP or JSON evidence into topology",
    priority: 40,
    resolve: ({ summary }) =>
      summary.topology.environment_id !== null
        ? ok()
        : blocked("no_topology_environment", ["topology_environment"]),
  },
  {
    id: "open_topology_collection_plan",
    label: "Open Topology Collection Plan",
    mode: "topology",
    target_tool_id: "collection_plan",
    summary_label: "Plan a read-only live collection",
    priority: 50,
    resolve: ({ summary }) =>
      summary.topology.environment_id !== null
        ? ok()
        : blocked("no_topology_environment", ["topology_environment"]),
  },
  {
    id: "open_topology_3d_construct_deferred",
    label: "Open Topology 3D Construct",
    mode: "topology",
    target_tool_id: "3d_construct",
    summary_label: "3D topology construct (deferred)",
    priority: 60,
    resolve: () => deferred("visual_construct_deferred"),
  },
  // Intake
  {
    id: "open_intake_parser",
    label: "Open Intake Parser",
    mode: "intake",
    target_tool_id: "parser",
    summary_label: "Parse imported device configs",
    priority: 70,
    resolve: () => ok(),
  },
  {
    id: "open_intake_findings",
    label: "Open Intake Findings",
    mode: "intake",
    target_tool_id: "findings",
    summary_label: "Review intake parse findings",
    priority: 80,
    resolve: () => ok(),
  },
  // Operate
  {
    id: "open_operate_live_overview",
    label: "Open Operate Live Overview",
    mode: "operate",
    target_tool_id: "live_overview",
    summary_label: "View live operate overview",
    priority: 90,
    resolve: () => ok(),
  },
  {
    id: "open_operate_readiness_context",
    label: "Open Operate Readiness Context",
    mode: "operate",
    target_tool_id: "readiness_context",
    summary_label: "Inspect cross-workbench readiness context",
    priority: 100,
    resolve: ({ readiness }) =>
      readiness.overall_state !== "empty"
        ? ok()
        : blocked("no_assessment_context", ["assessment_context"]),
  },
  // Assess
  {
    id: "open_assess_preflight",
    label: "Open Assess Preflight",
    mode: "assess",
    target_tool_id: "preflight",
    summary_label: "Open Assess preflight surface",
    priority: 110,
    resolve: ({ readiness }) =>
      readiness.overall_state !== "empty"
        ? ok()
        : blocked("no_assessment_context", ["assessment_context"]),
  },
  {
    id: "open_assess_pipeline_planner",
    label: "Open Assess Pipeline Planner",
    mode: "assess",
    target_tool_id: "pipeline_planner",
    summary_label: "Configure assess pipeline profile",
    priority: 120,
    resolve: () => ok(),
  },
  // Diagnose
  {
    id: "open_diagnose_triage",
    label: "Open Diagnose Triage",
    mode: "diagnose",
    target_tool_id: "triage",
    summary_label: "Review deterministic triage findings",
    priority: 130,
    resolve: ({ triage, ledger, summary, readiness }) => {
      const anySignal =
        triage.total_count > 0 ||
        ledger.total_count > 0 ||
        readiness.overall_state !== "empty" ||
        summary.topology.has_view ||
        summary.evidence_import.attempted_import_count > 0;
      return anySignal ? ok() : blocked("no_triage_input", ["triage_input"]);
    },
  },
  // Build
  {
    id: "open_build_workspace",
    label: "Open Build Workspace",
    mode: "build",
    target_tool_id: "workspace",
    summary_label: "Open build workspace skeleton",
    priority: 140,
    resolve: () => ok(),
  },
  {
    id: "open_build_intent_workspace_deferred",
    label: "Open Build Intent Workspace",
    mode: "build",
    target_tool_id: "intent_workspace",
    summary_label: "Intent-driven build workspace (deferred)",
    priority: 150,
    resolve: () => deferred("intent_workspace_deferred"),
  },
  // Hierarchy
  {
    id: "open_hierarchy_inventory",
    label: "Open Hierarchy Inventory",
    mode: "hierarchy",
    target_tool_id: "inventory",
    summary_label: "Browse hierarchy device inventory",
    priority: 160,
    resolve: () => ok(),
  },
  {
    id: "open_hierarchy_coverage_map",
    label: "Open Hierarchy Coverage Map",
    mode: "hierarchy",
    target_tool_id: "coverage_map",
    summary_label: "View hierarchy coverage projection",
    priority: 170,
    resolve: () => ok(),
  },
];

export function buildCortexCommandRegistry(
  inputs: BuildCortexCommandRegistryInputs,
): CortexCommandRegistry {
  const commands: CortexCommand[] = DEFINITIONS.map((def) => {
    const resolved = def.resolve(inputs);
    return {
      id: def.id,
      label: def.label,
      mode: def.mode,
      target_tool_id: def.target_tool_id,
      status: resolved.status,
      reason_code: resolved.reason_code,
      required_signals: resolved.required_signals,
      summary_label: def.summary_label,
      priority: def.priority,
    };
  });

  // Deterministic sort: priority → id.
  commands.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.id.localeCompare(b.id);
  });

  let available_count = 0;
  let deferred_count = 0;
  let blocked_count = 0;
  for (const c of commands) {
    if (c.status === "available") available_count += 1;
    else if (c.status === "deferred") deferred_count += 1;
    else blocked_count += 1;
  }

  return {
    commands,
    total_count: commands.length,
    available_count,
    deferred_count,
    blocked_count,
  };
}

/** Helper for V1BY: lookup a command by id. */
export function findCortexCommand(
  registry: CortexCommandRegistry,
  id: string,
): CortexCommand | null {
  return registry.commands.find((c) => c.id === id) ?? null;
}
