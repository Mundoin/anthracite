/**
 * V1BY — Cross-Workbench Action Router.
 *
 * Pure deterministic projection of safe context + V1BX Cortex Command
 * Registry into a prioritized list of operator next-actions.
 *
 * Hard discipline:
 *   - Inputs are safe projections + the V1BX CortexCommandRegistry only.
 *   - Output is labels/ids/reason-codes/counts only — no raw configs,
 *     no raw evidence, no markdown bodies, no command output, no
 *     credentials, no secrets, no evidence_set_id, no raw error messages.
 *   - Deterministic: same inputs → same output (including order).
 *   - No I/O, no fetch, no mutation, no execution.
 *   - Every emitted action.command_id MUST be present in the registry.
 *     Integrity test guards this.
 */

import type { WorkbenchContextSummary } from "./workbenchContextSummary";
import type { AssessmentReadiness } from "./assessmentReadiness";
import type { OperatorActivityLedger } from "./operatorActivityLedger";
import type { DiagnoseTriage } from "../modes/diagnose/diagnoseTriage";
import {
  findCortexCommand,
  type CortexCommandMode,
  type CortexCommandRegistry,
} from "./cortexCommandRegistry";

export type WorkbenchActionSource =
  | "readiness"
  | "triage"
  | "ledger"
  | "command_registry";

export type WorkbenchActionStatus = "available" | "blocked" | "deferred";

export type WorkbenchActionReasonCode =
  | "no_discovery_seeds"
  | "no_crawl_preview"
  | "no_evidence_imported"
  | "topology_without_edges"
  | "no_parsed_configs"
  | "readiness_blocked"
  | "readiness_ready"
  | "critical_triage_finding"
  | "ledger_activity_present";

export interface WorkbenchActionCounts {
  readonly seed_count?: number;
  readonly frontier_count?: number;
  readonly node_count?: number;
  readonly edge_count?: number;
  readonly accepted_evidence_total?: number;
  readonly parsed_device_count?: number;
  readonly ledger_event_count?: number;
  readonly critical_finding_count?: number;
}

export interface WorkbenchAction {
  readonly id: string;
  readonly label: string;
  readonly source: WorkbenchActionSource;
  readonly target_mode: CortexCommandMode;
  readonly target_tool_id: string | null;
  readonly command_id: string | null;
  readonly priority: number;
  readonly status: WorkbenchActionStatus;
  readonly reason_code: WorkbenchActionReasonCode | null;
  readonly supporting_counts: WorkbenchActionCounts;
}

export interface WorkbenchActionRouter {
  readonly actions: readonly WorkbenchAction[];
  readonly total_count: number;
  readonly available_count: number;
  readonly blocked_count: number;
  readonly top_action_id: string | null;
}

export const EMPTY_WORKBENCH_ACTION_ROUTER: WorkbenchActionRouter = {
  actions: [],
  total_count: 0,
  available_count: 0,
  blocked_count: 0,
  top_action_id: null,
};

export interface BuildWorkbenchActionRouterInputs {
  readonly summary: WorkbenchContextSummary;
  readonly readiness: AssessmentReadiness;
  readonly ledger: OperatorActivityLedger;
  readonly triage: DiagnoseTriage;
  readonly registry: CortexCommandRegistry;
}

/**
 * Resolve action.status from the backing command's status. If the registry
 * lacks the command, action becomes deferred — honest about the gap.
 */
function statusFromCommand(
  registry: CortexCommandRegistry,
  command_id: string | null,
  fallbackStatus: WorkbenchActionStatus,
): WorkbenchActionStatus {
  if (command_id === null) return fallbackStatus;
  const cmd = findCortexCommand(registry, command_id);
  if (cmd === null) return "deferred";
  if (cmd.status === "available") return "available";
  if (cmd.status === "deferred") return "deferred";
  return "blocked";
}

export function buildWorkbenchActionRouter(
  inputs: BuildWorkbenchActionRouterInputs,
): WorkbenchActionRouter {
  const { summary, readiness, ledger, triage, registry } = inputs;
  const out: WorkbenchAction[] = [];

  const seed_count = summary.discovery.seed_count;
  const frontier_count = summary.crawl_preview.frontier_count;
  const accepted_evidence_total = summary.evidence_import.accepted_evidence_total;
  const node_count = summary.topology.node_count;
  const edge_count = summary.topology.edge_count;
  const parsed_device_count = summary.intake.parsed_device_count;
  const critical_findings = triage.critical_count;

  // Priority 1: critical diagnose findings.
  if (critical_findings > 0) {
    const command_id = "open_diagnose_triage";
    out.push({
      id: "review_diagnose_triage_critical",
      label: "Review critical triage findings",
      source: "triage",
      target_mode: "diagnose",
      target_tool_id: "triage",
      command_id,
      priority: 10,
      status: statusFromCommand(registry, command_id, "available"),
      reason_code: "critical_triage_finding",
      supporting_counts: { critical_finding_count: critical_findings },
    });
  }

  // Priority 2: blocked readiness.
  if (readiness.overall_state === "blocked") {
    const command_id = "open_diagnose_triage";
    out.push({
      id: "review_diagnose_triage_blocked",
      label: "Resolve assess blockers via Diagnose triage",
      source: "readiness",
      target_mode: "diagnose",
      target_tool_id: "triage",
      command_id,
      priority: 20,
      status: statusFromCommand(registry, command_id, "available"),
      reason_code: "readiness_blocked",
      supporting_counts: {},
    });
  }

  // Priority 3: missing discovery seeds.
  if (seed_count === 0) {
    const command_id = "open_discovery_seed_planner";
    out.push({
      id: "stage_discovery_seeds",
      label: "Stage discovery seeds",
      source: "command_registry",
      target_mode: "discovery",
      target_tool_id: "seed_planner",
      command_id,
      priority: 30,
      status: statusFromCommand(registry, command_id, "available"),
      reason_code: "no_discovery_seeds",
      supporting_counts: { seed_count },
    });
  }

  // Priority 4: missing crawl preview (have seeds but no frontier).
  if (seed_count > 0 && frontier_count === 0) {
    const command_id = "open_crawl_preview";
    out.push({
      id: "build_crawl_preview",
      label: "Build crawl preview from staged seeds",
      source: "command_registry",
      target_mode: "discovery",
      target_tool_id: "crawl_preview",
      command_id,
      priority: 40,
      status: statusFromCommand(registry, command_id, "available"),
      reason_code: "no_crawl_preview",
      supporting_counts: { seed_count, frontier_count },
    });
  }

  // Priority 5: missing evidence import (have crawl preview but no evidence).
  if (frontier_count > 0 && accepted_evidence_total === 0) {
    const command_id = "open_topology_evidence_import";
    out.push({
      id: "import_topology_evidence",
      label: "Import topology evidence",
      source: "command_registry",
      target_mode: "topology",
      target_tool_id: "evidence_import",
      command_id,
      priority: 50,
      status: statusFromCommand(registry, command_id, "available"),
      reason_code: "no_evidence_imported",
      supporting_counts: { frontier_count, accepted_evidence_total },
    });
  }

  // Priority 6: topology evidence gaps (nodes but no edges).
  if (node_count > 1 && edge_count === 0) {
    const command_id = "open_topology_evidence_import";
    out.push({
      id: "review_topology_evidence",
      label: "Review topology evidence to materialize edges",
      source: "triage",
      target_mode: "topology",
      target_tool_id: "evidence_import",
      command_id,
      priority: 60,
      status: statusFromCommand(registry, command_id, "available"),
      reason_code: "topology_without_edges",
      supporting_counts: { node_count, edge_count },
    });
  }

  // Priority 7: intake parse needed.
  if (
    parsed_device_count === 0 &&
    (summary.intake.parse_status === "idle" ||
      summary.intake.parse_status === "detected")
  ) {
    const command_id = "open_intake_parser";
    out.push({
      id: "parse_configs",
      label: "Parse imported device configs",
      source: "command_registry",
      target_mode: "intake",
      target_tool_id: "parser",
      command_id,
      priority: 70,
      status: statusFromCommand(registry, command_id, "available"),
      reason_code: "no_parsed_configs",
      supporting_counts: { parsed_device_count },
    });
  }

  // Priority 8: assess preflight ready.
  if (readiness.overall_state === "ready") {
    const command_id = "open_assess_preflight";
    out.push({
      id: "open_assess_preflight",
      label: "Open Assess preflight — context is ready",
      source: "readiness",
      target_mode: "assess",
      target_tool_id: "preflight",
      command_id,
      priority: 80,
      status: statusFromCommand(registry, command_id, "available"),
      reason_code: "readiness_ready",
      supporting_counts: {},
    });
  }

  // Priority 9: review activity ledger.
  if (ledger.total_count > 0) {
    const command_id = "open_operate_live_overview";
    out.push({
      id: "review_activity_ledger",
      label: "Review operator activity ledger",
      source: "ledger",
      target_mode: "operate",
      target_tool_id: "live_overview",
      command_id,
      priority: 90,
      status: statusFromCommand(registry, command_id, "available"),
      reason_code: "ledger_activity_present",
      supporting_counts: { ledger_event_count: ledger.total_count },
    });
  }

  // Deterministic sort: priority → id.
  const actions = [...out].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.id.localeCompare(b.id);
  });

  let available_count = 0;
  let blocked_count = 0;
  for (const a of actions) {
    if (a.status === "available") available_count += 1;
    else if (a.status === "blocked") blocked_count += 1;
  }

  return {
    actions,
    total_count: actions.length,
    available_count,
    blocked_count,
    top_action_id: actions.length > 0 ? actions[0].id : null,
  };
}
