/**
 * V1CB — BUILD Intent Workspace.
 *
 * Pure deterministic local intent draft + receipt artifact spine. Each
 * intent type produces a safe BuildIntentDraft from cross-workbench
 * context; each draft has a corresponding BuildIntentReceipt projection.
 *
 * Hard discipline:
 *   - Inputs are safe projections only (WorkbenchContextSummary,
 *     AssessmentReadiness, WorkbenchActionRouter, CortexCommandRegistry,
 *     and optionally AssessmentPreflightSnapshot).
 *   - Output is labels/short-tokens/counts only — no raw configs, no raw
 *     evidence, no real vendor config, no command output, no credentials,
 *     no secrets, no evidence_set_id, no raw error messages.
 *   - Generated preview lines are GENERIC, SAFE placeholders only.
 *     Never real vendor syntax that could be mistaken for deployable
 *     config. Lines describe intent at a high level.
 *   - Deterministic: same inputs + same clock/id factory → same drafts.
 *   - No I/O, no fetch, no mutation, no device contact, no deploy.
 *   - Limitations always declare: no deploy, no device push, no rollback,
 *     preview is local intent only.
 */

import type { WorkbenchContextSummary } from "../../state/workbenchContextSummary";
import type { AssessmentReadiness } from "../../state/assessmentReadiness";
import type { WorkbenchActionRouter } from "../../state/workbenchActionRouter";
import type { CortexCommandRegistry } from "../../state/cortexCommandRegistry";
import type { AssessmentPreflightSnapshot } from "../assess/assessmentPreflightSnapshot";

export type BuildIntentType =
  | "interface_intent"
  | "vlan_intent"
  | "routing_intent"
  | "acl_intent"
  | "site_link_intent";

export type BuildIntentStatus = "draft" | "partial" | "blocked" | "deferred";

export type BuildIntentReasonCode =
  | "no_topology_signal"
  | "no_parsed_devices"
  | "no_topology_edges"
  | "no_known_platform"
  | "context_insufficient"
  | "ready_for_intent";

export interface BuildIntentSourceContext {
  readonly known_platform_count: number;
  readonly topology_node_count: number;
  readonly topology_edge_count: number;
  readonly parsed_device_count: number;
  readonly accepted_evidence_total: number;
}

export interface BuildIntentDraft {
  readonly draft_id: string;
  readonly created_at: string;
  readonly intent_type: BuildIntentType;
  readonly status: BuildIntentStatus;
  readonly target_vendor: string | null;
  readonly target_platform: string | null;
  readonly source_context: BuildIntentSourceContext;
  readonly intent_summary: string;
  readonly missing_inputs: readonly string[];
  readonly available_inputs: readonly string[];
  readonly generated_preview_lines: readonly string[];
  readonly limitations: readonly string[];
}

export interface BuildIntentReceipt {
  readonly receipt_id: string;
  readonly draft_id: string;
  readonly status: BuildIntentStatus;
  readonly can_generate_preview: boolean;
  readonly preview_line_count: number;
  readonly missing_input_count: number;
  readonly limitation_count: number;
  readonly reason_code: BuildIntentReasonCode | null;
}

export interface BuildIntentWorkspace {
  readonly workspace_id: string;
  readonly created_at: string;
  readonly drafts: readonly BuildIntentDraft[];
  readonly receipts: readonly BuildIntentReceipt[];
  readonly total_count: number;
  readonly partial_count: number;
  readonly deferred_count: number;
  readonly blocked_count: number;
  readonly limitations: readonly string[];
}

export const BUILD_HONESTY_LIMITATIONS: readonly string[] = [
  "No deploy has run.",
  "No device configuration has been pushed.",
  "No rollback state exists in this draft.",
  "Generated preview is local intent only.",
];

export const EMPTY_BUILD_INTENT_WORKSPACE: BuildIntentWorkspace = {
  workspace_id: "build-empty",
  created_at: "1970-01-01T00:00:00.000Z",
  drafts: [],
  receipts: [],
  total_count: 0,
  partial_count: 0,
  deferred_count: 0,
  blocked_count: 0,
  limitations: BUILD_HONESTY_LIMITATIONS,
};

export interface BuildIntentWorkspaceInputs {
  readonly summary: WorkbenchContextSummary;
  readonly readiness: AssessmentReadiness;
  readonly router: WorkbenchActionRouter;
  readonly registry: CortexCommandRegistry;
  readonly preflight?: AssessmentPreflightSnapshot;
  readonly now?: () => string;
  readonly idFactory?: (intent_type: BuildIntentType, seq: number) => string;
}

function defaultNow(): string {
  return new Date().toISOString();
}

function defaultIdFactory(intent_type: BuildIntentType, seq: number): string {
  return `build-${seq}-${intent_type}`;
}

interface ResolveResult {
  readonly status: BuildIntentStatus;
  readonly reason_code: BuildIntentReasonCode | null;
  readonly intent_summary: string;
  readonly missing_inputs: readonly string[];
  readonly available_inputs: readonly string[];
  readonly preview_lines: readonly string[];
}

function ctx(summary: WorkbenchContextSummary): BuildIntentSourceContext {
  return {
    known_platform_count:
      summary.intake.current_platform_id !== null ? 1 : 0,
    topology_node_count: summary.topology.node_count,
    topology_edge_count: summary.topology.edge_count,
    parsed_device_count: summary.intake.parsed_device_count,
    accepted_evidence_total: summary.evidence_import.accepted_evidence_total,
  };
}

function resolve(
  intent_type: BuildIntentType,
  c: BuildIntentSourceContext,
): ResolveResult {
  const available: string[] = [];
  if (c.topology_node_count > 0) available.push("topology_nodes");
  if (c.topology_edge_count > 0) available.push("topology_edges");
  if (c.parsed_device_count > 0) available.push("parsed_devices");
  if (c.known_platform_count > 0) available.push("known_platform");
  if (c.accepted_evidence_total > 0) available.push("accepted_evidence");

  switch (intent_type) {
    case "interface_intent": {
      if (c.topology_node_count === 0) {
        return {
          status: "blocked",
          reason_code: "no_topology_signal",
          intent_summary: "Interface intent requires at least one topology node.",
          missing_inputs: ["topology_nodes"],
          available_inputs: available,
          preview_lines: [],
        };
      }
      return {
        status: "partial",
        reason_code: "ready_for_intent",
        intent_summary: `Interface intent shape for ${c.topology_node_count} topology node(s).`,
        missing_inputs: c.known_platform_count > 0 ? [] : ["known_platform"],
        available_inputs: available,
        preview_lines: [
          `# interface-intent draft (local-only, ${c.topology_node_count} nodes)`,
          `# target_platform: ${c.known_platform_count > 0 ? "known" : "unknown"}`,
          `# action: declare desired interface state per node`,
          `# note: this is intent description, not vendor config`,
        ],
      };
    }
    case "vlan_intent": {
      if (c.parsed_device_count === 0 && c.known_platform_count === 0) {
        return {
          status: "blocked",
          reason_code: "context_insufficient",
          intent_summary:
            "VLAN intent requires parsed devices or a known platform.",
          missing_inputs: ["parsed_devices", "known_platform"],
          available_inputs: available,
          preview_lines: [],
        };
      }
      return {
        status: "partial",
        reason_code: "ready_for_intent",
        intent_summary: `VLAN intent shape for ${c.parsed_device_count} parsed device(s).`,
        missing_inputs: [],
        available_inputs: available,
        preview_lines: [
          `# vlan-intent draft (local-only)`,
          `# parsed_devices: ${c.parsed_device_count}`,
          `# action: declare desired VLAN membership per device`,
          `# note: this is intent description, not vendor config`,
        ],
      };
    }
    case "routing_intent": {
      if (c.topology_edge_count === 0) {
        return {
          status: "deferred",
          reason_code: "no_topology_edges",
          intent_summary:
            "Routing intent deferred until topology edges are materialized.",
          missing_inputs: ["topology_edges"],
          available_inputs: available,
          preview_lines: [],
        };
      }
      return {
        status: "partial",
        reason_code: "ready_for_intent",
        intent_summary: `Routing intent shape across ${c.topology_edge_count} topology edge(s).`,
        missing_inputs: [],
        available_inputs: available,
        preview_lines: [
          `# routing-intent draft (local-only)`,
          `# topology_edges: ${c.topology_edge_count}`,
          `# action: declare desired routing relationships`,
          `# note: this is intent description, not vendor config`,
        ],
      };
    }
    case "acl_intent": {
      if (c.parsed_device_count === 0) {
        return {
          status: "deferred",
          reason_code: "no_parsed_devices",
          intent_summary:
            "ACL intent deferred until devices are parsed.",
          missing_inputs: ["parsed_devices"],
          available_inputs: available,
          preview_lines: [],
        };
      }
      return {
        status: "partial",
        reason_code: "ready_for_intent",
        intent_summary: `ACL intent shape for ${c.parsed_device_count} parsed device(s).`,
        missing_inputs: [],
        available_inputs: available,
        preview_lines: [
          `# acl-intent draft (local-only)`,
          `# parsed_devices: ${c.parsed_device_count}`,
          `# action: declare desired access control posture`,
          `# note: this is intent description, not vendor config`,
        ],
      };
    }
    case "site_link_intent": {
      if (c.topology_edge_count === 0) {
        return {
          status: "blocked",
          reason_code: "no_topology_edges",
          intent_summary: "Site-link intent requires topology edges.",
          missing_inputs: ["topology_edges"],
          available_inputs: available,
          preview_lines: [],
        };
      }
      return {
        status: "partial",
        reason_code: "ready_for_intent",
        intent_summary: `Site-link intent shape for ${c.topology_edge_count} topology edge(s).`,
        missing_inputs: [],
        available_inputs: available,
        preview_lines: [
          `# site-link-intent draft (local-only)`,
          `# topology_edges: ${c.topology_edge_count}`,
          `# action: declare desired site-link adjacencies`,
          `# note: this is intent description, not vendor config`,
        ],
      };
    }
  }
}

function receiptFromDraft(d: BuildIntentDraft): BuildIntentReceipt {
  return {
    receipt_id: `receipt-${d.draft_id}`,
    draft_id: d.draft_id,
    status: d.status,
    can_generate_preview: d.generated_preview_lines.length > 0,
    preview_line_count: d.generated_preview_lines.length,
    missing_input_count: d.missing_inputs.length,
    limitation_count: d.limitations.length,
    reason_code:
      d.status === "blocked"
        ? "context_insufficient"
        : d.status === "deferred"
          ? d.intent_type === "routing_intent"
            ? "no_topology_edges"
            : d.intent_type === "acl_intent"
              ? "no_parsed_devices"
              : "context_insufficient"
          : "ready_for_intent",
  };
}

const INTENT_TYPES: readonly BuildIntentType[] = [
  "interface_intent",
  "vlan_intent",
  "routing_intent",
  "acl_intent",
  "site_link_intent",
];

export function buildBuildIntentWorkspace(
  inputs: BuildIntentWorkspaceInputs,
): BuildIntentWorkspace {
  const {
    summary,
    now = defaultNow,
    idFactory = defaultIdFactory,
  } = inputs;
  // readiness/router/registry/preflight reserved for future intent rules.
  void inputs.readiness;
  void inputs.router;
  void inputs.registry;
  void inputs.preflight;

  const createdAt = now();
  const sourceContext = ctx(summary);

  const drafts: BuildIntentDraft[] = INTENT_TYPES.map((intent_type, idx) => {
    const r = resolve(intent_type, sourceContext);
    return {
      draft_id: idFactory(intent_type, idx + 1),
      created_at: createdAt,
      intent_type,
      status: r.status,
      target_vendor: null,
      target_platform: summary.intake.current_platform_id,
      source_context: sourceContext,
      intent_summary: r.intent_summary,
      missing_inputs: r.missing_inputs,
      available_inputs: r.available_inputs,
      generated_preview_lines: r.preview_lines,
      limitations: BUILD_HONESTY_LIMITATIONS,
    };
  });

  const receipts = drafts.map(receiptFromDraft);

  let partial_count = 0;
  let deferred_count = 0;
  let blocked_count = 0;
  for (const d of drafts) {
    if (d.status === "partial") partial_count += 1;
    else if (d.status === "deferred") deferred_count += 1;
    else if (d.status === "blocked") blocked_count += 1;
  }

  return {
    workspace_id: `build-ws-${createdAt}-${sourceContext.topology_node_count}-${sourceContext.parsed_device_count}`,
    created_at: createdAt,
    drafts,
    receipts,
    total_count: drafts.length,
    partial_count,
    deferred_count,
    blocked_count,
    limitations: BUILD_HONESTY_LIMITATIONS,
  };
}
