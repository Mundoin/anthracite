/**
 * V1BL — Operate Live Overview Model.
 *
 * Pure deterministic model for local war room readiness. Reflects:
 * - Staged seeds from Discovery
 * - Crawl preview frontier
 * - Evidence imports
 * - Topology node/edge counts
 *
 * Emits readiness state, operational lanes, key metrics, and Markdown receipt.
 * No live polling, no SNMP, no fabricated metrics.
 */

export type OperateReadiness =
  | "no_sources"
  | "seeds_staged"
  | "crawl_preview_ready"
  | "evidence_available"
  | "live_pipeline_deferred";

export type LaneStatus = "available" | "preview" | "deferred" | "blocked";

export type LaneId =
  | "live_overview"
  | "topology_operations"
  | "polling_snmp"
  | "baselines_drift"
  | "sentinel"
  | "events";

export interface OperateLane {
  readonly id: LaneId;
  readonly label: string;
  readonly status: LaneStatus;
  readonly note: string;
}

export interface OperateMetric {
  readonly id: string;
  readonly label: string;
  readonly value: string; // mono — "3", "—", "deferred", "unavailable"
  readonly sub: string; // e.g. "staged" / "unavailable" / "preview only"
}

export type OperateNextAction =
  | "stage_discovery_seeds"
  | "build_crawl_preview"
  | "import_evidence"
  | "review_topology"
  | "connect_live_polling_future";

export interface OperateOverviewInputs {
  readonly staged_seed_count: number; // 0 if no seeds
  readonly crawl_frontier_count: number; // 0 if no preview
  readonly evidence_import_count: number; // 0 if no imports
  readonly topology_node_count: number; // 0 if no topology
  readonly topology_edge_count: number;
  // V1BP — local intake context (counts/label only; no engine, no live).
  readonly intake_parsed_device_count?: number;
  readonly intake_finding_count?: number;
  readonly intake_current_platform_id?: string | null;
}

export interface OperateOverviewSummary {
  readonly readiness: OperateReadiness;
  readonly metrics: ReadonlyArray<OperateMetric>;
  readonly lanes: ReadonlyArray<OperateLane>;
  readonly next_action: OperateNextAction;
  readonly generated_at: string;
}

export const OPERATE_NEXT_ACTION_DETAILS: Record<OperateNextAction, string> = {
  stage_discovery_seeds:
    "No discovery seeds staged. Go to Discovery mode to declare your first seed (device IP or CIDR range).",
  build_crawl_preview:
    "Crawl preview not yet built. Click 'Build Crawl Preview' in Discovery to generate the frontier.",
  import_evidence:
    "Preview frontier ready. Import evidence into Topology to create the initial node/edge graph.",
  review_topology:
    "Evidence imported. Review the Topology graph to validate node placement and link assertions.",
  connect_live_polling_future:
    "Topology complete. Live polling and Sentinel rules are deferred; future version will wire SNMP polling and alerting.",
};

/**
 * Compute operational readiness from input counts.
 *
 * Priority chain:
 * 1. all inputs zero → no_sources
 * 2. staged_seed_count > 0 && crawl_frontier_count === 0 → seeds_staged
 * 3. crawl_frontier_count > 0 && evidence_import_count === 0 && topology_node_count === 0 → crawl_preview_ready
 * 4. evidence_import_count > 0 && topology_node_count === 0 → evidence_available
 * 5. topology_node_count > 0 → live_pipeline_deferred
 */
export function resolveOperateReadiness(
  inputs: OperateOverviewInputs,
): OperateReadiness {
  if (
    inputs.staged_seed_count === 0 &&
    inputs.crawl_frontier_count === 0 &&
    inputs.evidence_import_count === 0 &&
    inputs.topology_node_count === 0
  ) {
    return "no_sources";
  }

  if (inputs.staged_seed_count > 0 && inputs.crawl_frontier_count === 0) {
    return "seeds_staged";
  }

  if (
    inputs.crawl_frontier_count > 0 &&
    inputs.evidence_import_count === 0 &&
    inputs.topology_node_count === 0
  ) {
    return "crawl_preview_ready";
  }

  if (inputs.evidence_import_count > 0 && inputs.topology_node_count === 0) {
    return "evidence_available";
  }

  return "live_pipeline_deferred";
}

/**
 * Resolve next action from readiness state.
 */
function resolveNextAction(readiness: OperateReadiness): OperateNextAction {
  switch (readiness) {
    case "no_sources":
      return "stage_discovery_seeds";
    case "seeds_staged":
      return "build_crawl_preview";
    case "crawl_preview_ready":
      return "import_evidence";
    case "evidence_available":
      return "review_topology";
    case "live_pipeline_deferred":
      return "connect_live_polling_future";
  }
}

/**
 * Build metrics array (always 6 entries).
 */
function buildMetrics(inputs: OperateOverviewInputs): ReadonlyArray<OperateMetric> {
  return [
    {
      id: "staged_seeds",
      label: "Staged seeds",
      value: inputs.staged_seed_count.toString(),
      sub: inputs.staged_seed_count > 0 ? "staged" : "no seeds",
    },
    {
      id: "preview_frontier",
      label: "Preview frontier",
      value: inputs.crawl_frontier_count.toString(),
      sub: inputs.crawl_frontier_count > 0 ? "preview" : "no preview",
    },
    {
      id: "evidence_imports",
      label: "Evidence imports",
      value: inputs.evidence_import_count.toString(),
      sub: inputs.evidence_import_count > 0 ? "imported" : "no imports",
    },
    {
      id: "topology_nodes",
      label: "Topology nodes",
      value: inputs.topology_node_count > 0 ? inputs.topology_node_count.toString() : "—",
      sub: inputs.topology_node_count > 0 ? "nodes" : "unavailable",
    },
    {
      id: "intake_parsed",
      label: "Parsed configs",
      value: ((inputs.intake_parsed_device_count ?? 0) > 0) ? (inputs.intake_parsed_device_count ?? 0).toString() : "0",
      sub: ((inputs.intake_parsed_device_count ?? 0) > 0) ? "local intake" : "no parses yet",
    },
    {
      id: "active_incidents",
      label: "Active incidents",
      value: "—",
      sub: "deferred",
    },
  ];
}

/**
 * Build lanes array (always 6 entries in fixed order).
 *
 * Lane status rules:
 * - live_overview: available when readiness >= seeds_staged, else preview
 * - topology_operations: preview if topology_node_count > 0, else deferred
 * - polling_snmp: always deferred
 * - baselines_drift: always deferred
 * - sentinel: always deferred
 * - events: always preview
 */
function buildLanes(inputs: OperateOverviewInputs, readiness: OperateReadiness): ReadonlyArray<OperateLane> {
  return [
    {
      id: "live_overview",
      label: "Live Overview",
      status:
        readiness === "no_sources" ? "preview" : "available",
      note:
        readiness === "no_sources"
          ? "Stage seeds in Discovery to enable readiness summary."
          : "Local War Room readiness — seeds, preview, evidence, topology.",
    },
    {
      id: "topology_operations",
      label: "Topology Operations",
      status: inputs.topology_node_count > 0 ? "preview" : "deferred",
      note:
        inputs.topology_node_count > 0
          ? "Overlays available once topology is built."
          : "Requires topology to be imported and validated.",
    },
    {
      id: "polling_snmp",
      label: "Polling / SNMP",
      status: "deferred",
      note: "Live SNMP polling engine deferred — no transport wired.",
    },
    {
      id: "baselines_drift",
      label: "Baselines / Drift",
      status: "deferred",
      note: "Baseline evaluation engine not yet implemented.",
    },
    {
      id: "sentinel",
      label: "Sentinel",
      status: "deferred",
      note: "Real-time alerting engine not yet implemented.",
    },
    {
      id: "events",
      label: "Events",
      status: "preview",
      note: "Event log placeholder — no event source wired yet.",
    },
  ];
}

/**
 * Build full readiness summary.
 */
export function buildOperateOverview(
  inputs: OperateOverviewInputs,
  generated_at: string,
): OperateOverviewSummary {
  const readiness = resolveOperateReadiness(inputs);
  const next_action = resolveNextAction(readiness);
  const metrics = buildMetrics(inputs);
  const lanes = buildLanes(inputs, readiness);

  return {
    readiness,
    metrics,
    lanes,
    next_action,
    generated_at,
  };
}

/**
 * Convert summary to Markdown receipt.
 *
 * Deterministic; SECRET_GUARD: never emit "password" / "private_key" / "passphrase" / "secret".
 */
export function toOperateOverviewMarkdown(summary: OperateOverviewSummary): string {
  const lines: string[] = [];

  lines.push("# Operate Live Overview");
  lines.push("");
  lines.push(`Generated: ${summary.generated_at}`);
  lines.push("");

  lines.push(`## Readiness: ${summary.readiness}`);
  lines.push("");

  const nextActionDetail = OPERATE_NEXT_ACTION_DETAILS[summary.next_action];
  lines.push(`### Next Action`);
  lines.push(`${summary.next_action}`);
  lines.push("");
  lines.push(nextActionDetail);
  lines.push("");

  lines.push("## Metrics");
  lines.push("");
  for (const metric of summary.metrics) {
    lines.push(`- ${metric.label} : ${metric.value} ${metric.sub}`);
  }
  lines.push("");

  lines.push("## Operational Lanes");
  lines.push("");
  lines.push("| Label | Status | Note |");
  lines.push("|-------|--------|------|");
  for (const lane of summary.lanes) {
    lines.push(`| ${lane.label} | ${lane.status} | ${lane.note} |`);
  }
  lines.push("");

  lines.push("> Local readiness summary only — no live polling, no SNMP, no fabricated metrics.");

  return lines.join("\n");
}
