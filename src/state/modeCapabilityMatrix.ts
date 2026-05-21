/**
 * V1CE — Mode Capability Matrix.
 *
 * Pure deterministic per-mode/per-tool capability projection across all
 * Anthracite modes. Honest about what is currently available, partial,
 * deferred, or blocked.
 *
 * Hard discipline:
 *   - Inputs are safe projections + V1CD environment profile + V1BX
 *     registry + V1BY router + V1BZ preflight + V1CA report draft +
 *     V1CB build workspace + V1CC topology construct only.
 *   - Output is labels/ids/short-tokens/counts only — no raw configs,
 *     no raw evidence, no markdown bodies, no command output, no
 *     credentials, no secrets, no evidence_set_id, no raw error messages.
 *   - Backing command_id (when present) MUST resolve in the registry.
 *     Integrity test guards this.
 *   - Deterministic: same inputs → same matrix.
 *   - No I/O, no fetch, no mutation, no execution.
 *   - Future surfaces stay HONESTLY deferred — never `available`.
 *   - Limitations always declare: derived from local context; no
 *     execution implied; no command palette UI.
 */

import type { WorkbenchContextSummary } from "./workbenchContextSummary";
import type { AssessmentReadiness } from "./assessmentReadiness";
import type {
  CortexCommandRegistry,
} from "./cortexCommandRegistry";
import { findCortexCommand } from "./cortexCommandRegistry";
import type { WorkbenchActionRouter } from "./workbenchActionRouter";
import type { DiagnoseTriage } from "../modes/diagnose/diagnoseTriage";
import type { AssessmentPreflightSnapshot } from "../modes/assess/assessmentPreflightSnapshot";
import type { AssessmentReportDraft } from "../modes/assess/assessmentReportDraft";
import type { BuildIntentWorkspace } from "../modes/build/buildIntentWorkspace";
import type { TopologyConstruct } from "../modes/topology/topologyConstructModel";
import type { EnvironmentProfile } from "./environmentProfile";

export type ModeCapabilityMode =
  | "discovery"
  | "topology"
  | "intake"
  | "operate"
  | "assess"
  | "diagnose"
  | "build"
  | "hierarchy";

export type CapabilityState =
  | "available"
  | "partial"
  | "deferred"
  | "blocked";

export interface ToolCapabilityCounts {
  readonly node_count?: number;
  readonly edge_count?: number;
  readonly seed_count?: number;
  readonly frontier_count?: number;
  readonly accepted_evidence_total?: number;
  readonly parsed_device_count?: number;
  readonly finding_count?: number;
  readonly ledger_event_count?: number;
  readonly triage_total_count?: number;
  readonly intent_count?: number;
  readonly construct_node_count?: number;
}

export interface ToolCapability {
  readonly tool_id: string;
  readonly label: string;
  readonly state: CapabilityState;
  readonly reason_code: string | null;
  readonly backing_command_id: string | null;
  readonly supporting_counts: ToolCapabilityCounts;
}

export interface ModeCapability {
  readonly mode: ModeCapabilityMode;
  readonly label: string;
  readonly state: CapabilityState;
  readonly tools: readonly ToolCapability[];
  readonly summary_label: string;
  readonly primary_next_action_id: string | null;
}

export interface ModeCapabilityMatrix {
  readonly modes: readonly ModeCapability[];
  readonly total_modes: number;
  readonly available_count: number;
  readonly deferred_count: number;
  readonly blocked_count: number;
  readonly primary_blocker_count: number;
  readonly limitations: readonly string[];
}

export const MATRIX_LIMITATIONS: readonly string[] = [
  "Matrix is derived from local workbench context.",
  "No behavior execution is implied by an available state.",
  "No command palette UI is bundled here.",
];

export const EMPTY_MODE_CAPABILITY_MATRIX: ModeCapabilityMatrix = {
  modes: [],
  total_modes: 0,
  available_count: 0,
  deferred_count: 0,
  blocked_count: 0,
  primary_blocker_count: 0,
  limitations: MATRIX_LIMITATIONS,
};

export interface BuildModeCapabilityMatrixInputs {
  readonly profile: EnvironmentProfile;
  readonly summary: WorkbenchContextSummary;
  readonly readiness: AssessmentReadiness;
  readonly registry: CortexCommandRegistry;
  readonly router: WorkbenchActionRouter;
  readonly triage: DiagnoseTriage;
  readonly preflight: AssessmentPreflightSnapshot;
  readonly draft: AssessmentReportDraft;
  readonly build: BuildIntentWorkspace;
  readonly construct: TopologyConstruct;
}

function stateFromCommand(
  registry: CortexCommandRegistry,
  command_id: string | null,
  fallback: CapabilityState,
): CapabilityState {
  if (command_id === null) return fallback;
  const cmd = findCortexCommand(registry, command_id);
  if (cmd === null) return "deferred";
  if (cmd.status === "available") return "available";
  if (cmd.status === "deferred") return "deferred";
  return "blocked";
}

function tool(
  tool_id: string,
  label: string,
  state: CapabilityState,
  reason_code: string | null,
  backing_command_id: string | null,
  supporting_counts: ToolCapabilityCounts,
): ToolCapability {
  return { tool_id, label, state, reason_code, backing_command_id, supporting_counts };
}

function aggregateModeState(
  tools: readonly ToolCapability[],
): CapabilityState {
  if (tools.length === 0) return "deferred";
  const states = tools.map((t) => t.state);
  if (states.every((s) => s === "deferred")) return "deferred";
  const liveTools = tools.filter((t) => t.state !== "deferred");
  if (liveTools.length > 0 && liveTools.every((t) => t.state === "blocked")) {
    return "blocked";
  }
  if (states.includes("available")) {
    const mixed =
      states.includes("partial") ||
      states.includes("deferred") ||
      states.includes("blocked");
    return mixed ? "partial" : "available";
  }
  if (states.includes("partial")) return "partial";
  return "blocked";
}

function primaryActionForMode(
  router: WorkbenchActionRouter,
  mode: ModeCapabilityMode,
): string | null {
  const a = router.actions.find((x) => x.target_mode === mode);
  return a?.id ?? null;
}

export function buildModeCapabilityMatrix(
  inputs: BuildModeCapabilityMatrixInputs,
): ModeCapabilityMatrix {
  const {
    summary,
    readiness,
    registry,
    router,
    triage,
    preflight,
    draft,
    build,
    construct,
  } = inputs;
  void inputs.profile;

  const seed_count = summary.discovery.seed_count;
  const frontier_count = summary.crawl_preview.frontier_count;
  const node_count = summary.topology.node_count;
  const edge_count = summary.topology.edge_count;
  const accepted_evidence_total =
    summary.evidence_import.accepted_evidence_total;
  const parsed_device_count = summary.intake.parsed_device_count;
  const finding_count = summary.intake.finding_count;
  const ledger_event_count = router.actions.length;

  // ---- Discovery ----
  const discoveryTools: ToolCapability[] = [
    tool(
      "target_capture",
      "Target Capture",
      "available",
      null,
      null,
      {},
    ),
    tool(
      "seed_planner",
      "Seed Planner",
      stateFromCommand(registry, "open_discovery_seed_planner", "available"),
      null,
      "open_discovery_seed_planner",
      { seed_count },
    ),
    (() => {
      const cmdState = stateFromCommand(registry, "open_crawl_preview", "blocked");
      return tool(
        "crawl_preview",
        "Crawl Preview",
        cmdState,
        cmdState === "blocked" ? "no_discovery_seeds" : null,
        "open_crawl_preview",
        { seed_count, frontier_count },
      );
    })(),
    tool(
      "recursive_crawler",
      "Recursive Crawler",
      "deferred",
      "recursive_crawler_deferred",
      null,
      {},
    ),
  ];

  // ---- Topology ----
  const topologyTools: ToolCapability[] = [
    (() => {
      const cmdState = stateFromCommand(registry, "open_topology_graph", "partial");
      return tool(
        "graph_map",
        "Graph / Map",
        node_count > 0 ? cmdState : "partial",
        node_count > 0 ? null : "no_topology_view",
        "open_topology_graph",
        { node_count, edge_count },
      );
    })(),
    (() => {
      const cmdState = stateFromCommand(
        registry,
        "open_topology_evidence_import",
        "blocked",
      );
      return tool(
        "evidence_import",
        "Evidence Import",
        cmdState,
        cmdState === "blocked" ? "no_topology_environment" : null,
        "open_topology_evidence_import",
        { accepted_evidence_total },
      );
    })(),
    (() => {
      const cmdState = stateFromCommand(
        registry,
        "open_topology_collection_plan",
        "blocked",
      );
      return tool(
        "collection_plan",
        "Collection Plan",
        cmdState,
        cmdState === "blocked" ? "no_topology_environment" : null,
        "open_topology_collection_plan",
        {},
      );
    })(),
    tool(
      "topology_construct",
      "Topology Construct",
      construct.node_count > 0 ? "available" : "partial",
      construct.node_count > 0 ? null : "no_topology_view",
      null,
      { construct_node_count: construct.node_count },
    ),
    tool(
      "topology_3d_renderer",
      "Topology 3D Renderer",
      "deferred",
      "visual_construct_deferred",
      "open_topology_3d_construct_deferred",
      {},
    ),
  ];

  // ---- Intake ----
  const intakeTools: ToolCapability[] = [
    tool(
      "parser",
      "Parser",
      stateFromCommand(registry, "open_intake_parser", "available"),
      null,
      "open_intake_parser",
      { parsed_device_count },
    ),
    tool(
      "findings",
      "Findings",
      finding_count > 0 ? "available" : "partial",
      finding_count > 0 ? null : "no_findings_yet",
      "open_intake_findings",
      { finding_count },
    ),
  ];

  // ---- Operate ----
  const operateTools: ToolCapability[] = [
    tool(
      "live_overview",
      "Live Overview",
      stateFromCommand(registry, "open_operate_live_overview", "available"),
      null,
      "open_operate_live_overview",
      {},
    ),
    tool(
      "readiness_context",
      "Readiness Context",
      readiness.overall_state !== "empty" ? "available" : "partial",
      readiness.overall_state !== "empty" ? null : "no_assessment_context",
      "open_operate_readiness_context",
      {},
    ),
    tool(
      "activity_ledger",
      "Activity Ledger",
      ledger_event_count > 0 ? "available" : "partial",
      ledger_event_count > 0 ? null : "no_ledger_events",
      null,
      { ledger_event_count },
    ),
  ];

  // ---- Assess ----
  const assessTools: ToolCapability[] = [
    tool(
      "pipeline_planner",
      "Pipeline Planner",
      stateFromCommand(registry, "open_assess_pipeline_planner", "available"),
      null,
      "open_assess_pipeline_planner",
      {},
    ),
    tool(
      "preflight_snapshot",
      "Preflight Snapshot",
      preflight.can_start
        ? "available"
        : preflight.overall_state === "empty"
          ? "partial"
          : "available",
      preflight.overall_state === "empty" ? "no_assessment_context" : null,
      "open_assess_preflight",
      {},
    ),
    tool(
      "report_draft",
      "Report Draft",
      draft.sections.length > 0 ? "available" : "partial",
      draft.sections.length > 0 ? null : "no_draft_sections",
      null,
      {},
    ),
    tool(
      "assessment_execution",
      "Assessment Execution",
      "deferred",
      "assessment_execution_deferred",
      null,
      {},
    ),
    tool(
      "pdf_report",
      "PDF Report",
      "deferred",
      "pdf_report_deferred",
      null,
      {},
    ),
  ];

  // ---- Diagnose ----
  const diagnoseTools: ToolCapability[] = [
    tool(
      "triage",
      "Triage",
      triage.total_count > 0
        ? stateFromCommand(registry, "open_diagnose_triage", "available")
        : "partial",
      triage.total_count > 0 ? null : "no_triage_input",
      "open_diagnose_triage",
      { triage_total_count: triage.total_count },
    ),
    tool(
      "findings",
      "Findings",
      "available",
      null,
      null,
      {},
    ),
    tool("terminal", "Terminal", "deferred", "terminal_deferred", null, {}),
    tool(
      "path_trace",
      "Path Trace",
      "deferred",
      "path_trace_deferred",
      null,
      {},
    ),
    tool(
      "drift_analysis",
      "Drift Analysis",
      "deferred",
      "drift_analysis_deferred",
      null,
      {},
    ),
  ];

  // ---- Build ----
  const buildTools: ToolCapability[] = [
    tool(
      "intent_workspace",
      "Intent Workspace",
      build.total_count > 0 ? "available" : "partial",
      build.total_count > 0 ? null : "no_intent_drafts",
      "open_build_workspace",
      { intent_count: build.total_count },
    ),
    tool(
      "config_generation",
      "Config Generation",
      "deferred",
      "config_generation_deferred",
      null,
      {},
    ),
    tool(
      "deploy",
      "Deploy",
      "deferred",
      "deploy_deferred",
      null,
      {},
    ),
    tool(
      "rollback",
      "Rollback",
      "deferred",
      "rollback_deferred",
      null,
      {},
    ),
  ];

  // ---- Hierarchy ----
  const hierarchyTools: ToolCapability[] = [
    tool(
      "inventory_browser",
      "Inventory Browser",
      stateFromCommand(registry, "open_hierarchy_inventory", "available"),
      null,
      "open_hierarchy_inventory",
      {},
    ),
    tool(
      "coverage_map",
      "Coverage Map",
      stateFromCommand(registry, "open_hierarchy_coverage_map", "available"),
      null,
      "open_hierarchy_coverage_map",
      {},
    ),
    tool(
      "inventory_diff",
      "Inventory Diff",
      "deferred",
      "inventory_diff_deferred",
      null,
      {},
    ),
  ];

  const modeSpecs: ReadonlyArray<{
    mode: ModeCapabilityMode;
    label: string;
    tools: readonly ToolCapability[];
    summary_label: string;
  }> = [
    {
      mode: "discovery",
      label: "Discovery",
      tools: discoveryTools,
      summary_label: "Seed and crawl-preview workbench",
    },
    {
      mode: "topology",
      label: "Topology",
      tools: topologyTools,
      summary_label: "Topology graph, evidence, and construct",
    },
    {
      mode: "intake",
      label: "Intake",
      tools: intakeTools,
      summary_label: "Config parse and findings",
    },
    {
      mode: "operate",
      label: "Operate",
      tools: operateTools,
      summary_label: "Live overview, readiness, and activity",
    },
    {
      mode: "assess",
      label: "Assess",
      tools: assessTools,
      summary_label: "Preflight, planner, and report draft",
    },
    {
      mode: "diagnose",
      label: "Diagnose",
      tools: diagnoseTools,
      summary_label: "Triage and findings",
    },
    {
      mode: "build",
      label: "Build",
      tools: buildTools,
      summary_label: "Intent workspace and future config generation",
    },
    {
      mode: "hierarchy",
      label: "Hierarchy",
      tools: hierarchyTools,
      summary_label: "Inventory browser and coverage map",
    },
  ];

  const modes: ModeCapability[] = modeSpecs.map((spec) => ({
    mode: spec.mode,
    label: spec.label,
    state: aggregateModeState(spec.tools),
    tools: spec.tools,
    summary_label: spec.summary_label,
    primary_next_action_id: primaryActionForMode(router, spec.mode),
  }));

  let available_count = 0;
  let deferred_count = 0;
  let blocked_count = 0;
  for (const m of modes) {
    if (m.state === "available") available_count += 1;
    else if (m.state === "deferred") deferred_count += 1;
    else if (m.state === "blocked") blocked_count += 1;
  }

  return {
    modes,
    total_modes: modes.length,
    available_count,
    deferred_count,
    blocked_count,
    primary_blocker_count: blocked_count,
    limitations: MATRIX_LIMITATIONS,
  };
}
