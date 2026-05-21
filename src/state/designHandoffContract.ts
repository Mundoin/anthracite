/**
 * V1CG — Skeleton Freeze / Design Handoff Contract.
 *
 * Pure deterministic contract that freezes the semantic skeleton
 * available to the next design rail (UI/UX/icons/topology/3D). This is
 * NOT visual redesign, NOT CSS, NOT icons, NOT 3D, NOT navigation.
 * It is the stable data contract the design rail can safely consume.
 *
 * Hard discipline:
 *   - Inputs are the V1CD/V1CE/V1CF-era App-owned spines only.
 *   - Output is enum values + ids + field names + counts only — no raw
 *     configs, no raw evidence, no markdown bodies from external sources,
 *     no command output, no credentials, no secrets, no evidence_set_id,
 *     no raw error messages.
 *   - Every tool/command/action/mode/dashboard reference resolves to a
 *     concrete id from the live spines. Integrity test guards this.
 *   - Deterministic: same inputs → same contract.
 *   - No I/O, no fetch, no mutation, no execution.
 *   - Limitations always declare: contract is semantic only; no visual
 *     redesign / CSS / 3D / canvas / navigation / command execution
 *     is implied.
 */

import type { ModeCapabilityMatrix } from "./modeCapabilityMatrix";
import type { CortexCommandRegistry } from "./cortexCommandRegistry";
import type { WorkbenchActionRouter } from "./workbenchActionRouter";
import type { EnvironmentProfile } from "./environmentProfile";
import type { AssessmentPreflightSnapshot } from "../modes/assess/assessmentPreflightSnapshot";
import type { AssessmentReportDraft } from "../modes/assess/assessmentReportDraft";
import type { BuildIntentWorkspace } from "../modes/build/buildIntentWorkspace";
import type { TopologyConstruct } from "../modes/topology/topologyConstructModel";
import type { DiagnoseTriage } from "../modes/diagnose/diagnoseTriage";
import type { OperatorSessionExport } from "./operatorSessionExport";
import { HONESTY_LINES as ASSESS_HONESTY_LINES } from "../modes/assess/assessmentReportDraft";

export const DESIGN_HANDOFF_VERSION = "v1cg-design-handoff" as const;

export interface ModeSurfaceContract {
  readonly mode: string;
  readonly label: string;
  readonly capability_state: string;
  readonly tool_ids: readonly string[];
  readonly primary_next_action_id: string | null;
}

export interface ToolSurfaceContract {
  readonly mode: string;
  readonly tool_id: string;
  readonly label: string;
  readonly state: string;
  readonly backing_command_id: string | null;
  readonly reason_code: string | null;
}

export interface DashboardCardContract {
  readonly id: string;
  readonly title: string;
  readonly source_spine: string;
  readonly primary_metric: string;
  readonly secondary_metrics: readonly string[];
  readonly status_token: string;
  readonly target_mode: string;
  readonly target_tool_id: string | null;
}

export interface TopologyConstructContract {
  readonly supports_3d: boolean;
  readonly supports_minimap: boolean;
  readonly density: string;
  readonly node_fields: readonly string[];
  readonly link_fields: readonly string[];
  readonly cluster_fields: readonly string[];
  readonly layer_fields: readonly string[];
  readonly risk_flag_fields: readonly string[];
  readonly layout_hint_fields: readonly string[];
}

export interface AssessContract {
  readonly preflight_fields: readonly string[];
  readonly report_draft_sections: readonly string[];
  readonly honesty_lines_present: boolean;
  readonly can_start: boolean;
}

export interface BuildContract {
  readonly intent_types: readonly string[];
  readonly receipt_fields: readonly string[];
  readonly limitations_present: boolean;
}

export interface EnvironmentContract {
  readonly profile_fields: readonly string[];
  readonly risk_summary_fields: readonly string[];
  readonly profile_state: string;
}

export interface DesignHandoffContract {
  readonly contract_id: string;
  readonly created_at: string;
  readonly version: typeof DESIGN_HANDOFF_VERSION;
  readonly mode_surfaces: readonly ModeSurfaceContract[];
  readonly tool_surfaces: readonly ToolSurfaceContract[];
  readonly command_ids: readonly string[];
  readonly action_ids: readonly string[];
  readonly readiness_tokens: readonly string[];
  readonly triage_tokens: readonly string[];
  readonly activity_event_kinds: readonly string[];
  readonly capability_states: readonly string[];
  readonly topology_construct_contract: TopologyConstructContract;
  readonly assess_contract: AssessContract;
  readonly build_contract: BuildContract;
  readonly environment_contract: EnvironmentContract;
  readonly dashboard_cards: readonly DashboardCardContract[];
  readonly limitations: readonly string[];
}

export const DESIGN_HANDOFF_LIMITATIONS: readonly string[] = [
  "Contract is semantic only; no visual redesign is implied.",
  "No CSS, icon, 3D, or canvas implementation is bundled.",
  "No navigation behavior or command execution is implied.",
  "No file export writing or persistence is implied.",
];

const READINESS_TOKENS: readonly string[] = [
  "empty",
  "partial",
  "ready",
  "blocked",
];

const TRIAGE_SEVERITIES: readonly string[] = ["info", "warning", "critical"];

const ACTIVITY_EVENT_KINDS: readonly string[] = [
  "seed_plan_generated",
  "crawl_preview_generated",
  "evidence_import_accepted",
  "evidence_import_no_mutation",
  "evidence_import_rejected",
  "evidence_cleared",
  "intake_parse_completed",
  "assess_readiness_generated",
];

const CAPABILITY_STATES: readonly string[] = [
  "available",
  "partial",
  "deferred",
  "blocked",
];

const TOPOLOGY_NODE_FIELDS: readonly string[] = [
  "id",
  "label",
  "role",
  "vendor",
  "platform",
  "layer",
  "evidence_state",
  "risk_level",
];

const TOPOLOGY_LINK_FIELDS: readonly string[] = [
  "id",
  "source_node_id",
  "target_node_id",
  "kind",
  "evidence_state",
  "risk_level",
];

const TOPOLOGY_CLUSTER_FIELDS: readonly string[] = [
  "id",
  "label",
  "node_ids",
  "reason_code",
];

const TOPOLOGY_LAYER_FIELDS: readonly string[] = [
  "id",
  "label",
  "kind",
  "visible_by_default",
];

const TOPOLOGY_RISK_FLAG_FIELDS: readonly string[] = [
  "id",
  "severity",
  "reason_code",
  "target_kind",
  "target_id",
  "supporting_counts",
];

const TOPOLOGY_LAYOUT_HINT_FIELDS: readonly string[] = [
  "preferred_projection",
  "supports_3d",
  "supports_minimap",
  "density",
  "recommended_focus",
];

const PREFLIGHT_FIELDS: readonly string[] = [
  "snapshot_id",
  "created_at",
  "overall_state",
  "can_start",
  "assess_state",
  "available_inputs",
  "missing_inputs",
  "blocked_reason_codes",
  "pipeline_steps",
  "limitations",
];

const REPORT_DRAFT_SECTIONS: readonly string[] = [
  "executive_summary",
  "input_coverage",
  "topology_summary",
  "evidence_summary",
  "intake_summary",
  "readiness",
  "diagnose_triage",
  "operator_activity",
  "recommended_next_actions",
  "limitations",
];

const BUILD_INTENT_TYPES: readonly string[] = [
  "interface_intent",
  "vlan_intent",
  "routing_intent",
  "acl_intent",
  "site_link_intent",
];

const BUILD_RECEIPT_FIELDS: readonly string[] = [
  "receipt_id",
  "draft_id",
  "status",
  "can_generate_preview",
  "preview_line_count",
  "missing_input_count",
  "limitation_count",
  "reason_code",
];

const ENVIRONMENT_PROFILE_FIELDS: readonly string[] = [
  "environment_id",
  "display_label",
  "profile_state",
  "known_platform_count",
  "device_count",
  "topology_node_count",
  "topology_edge_count",
  "accepted_evidence_total",
  "parsed_device_count",
  "readiness_state",
  "assess_state",
  "triage_total_count",
  "triage_critical_count",
  "ledger_event_count",
  "last_activity_kind",
  "last_activity_at",
  "top_action_id",
  "build_intent_count",
  "construct_density",
  "risk_summary",
  "limitations",
];

const RISK_SUMMARY_FIELDS: readonly string[] = [
  "critical_count",
  "warning_count",
  "info_count",
  "primary_reason_code",
];

export interface BuildDesignHandoffContractInputs {
  readonly matrix: ModeCapabilityMatrix;
  readonly registry: CortexCommandRegistry;
  readonly router: WorkbenchActionRouter;
  readonly profile: EnvironmentProfile;
  readonly preflight: AssessmentPreflightSnapshot;
  readonly draft: AssessmentReportDraft;
  readonly build: BuildIntentWorkspace;
  readonly construct: TopologyConstruct;
  readonly triage: DiagnoseTriage;
  readonly sessionExport: OperatorSessionExport;
  readonly now?: () => string;
  readonly idFactory?: (profile: EnvironmentProfile) => string;
}

function defaultNow(): string {
  return new Date().toISOString();
}

function defaultIdFactory(profile: EnvironmentProfile): string {
  return `handoff-${profile.environment_id}-${profile.profile_state}`;
}

function buildDashboardCards(
  router: WorkbenchActionRouter,
): readonly DashboardCardContract[] {
  // 10 required cards. target_tool_id is intentionally null for "summary"
  // cards that do not deep-link a specific tool.
  const top = router.top_action_id;
  return [
    {
      id: "environment_profile",
      title: "Environment Profile",
      source_spine: "environmentProfile",
      primary_metric: "profile_state",
      secondary_metrics: ["device_count", "topology_node_count"],
      status_token: "profile_state",
      target_mode: "operate",
      target_tool_id: "live_overview",
    },
    {
      id: "readiness",
      title: "Readiness",
      source_spine: "assessmentReadiness",
      primary_metric: "overall_state",
      secondary_metrics: ["available_inputs", "missing_inputs"],
      status_token: "overall_state",
      target_mode: "operate",
      target_tool_id: "readiness_context",
    },
    {
      id: "top_action",
      title: "Top Action",
      source_spine: "workbenchActionRouter",
      primary_metric: top ?? "none",
      secondary_metrics: ["total_count", "available_count"],
      status_token: "available",
      target_mode: "operate",
      target_tool_id: null,
    },
    {
      id: "diagnose_triage",
      title: "Diagnose Triage",
      source_spine: "diagnoseTriage",
      primary_metric: "total_count",
      secondary_metrics: ["critical_count", "warning_count"],
      status_token: "critical_count",
      target_mode: "diagnose",
      target_tool_id: "triage",
    },
    {
      id: "operator_activity",
      title: "Operator Activity",
      source_spine: "operatorActivityLedger",
      primary_metric: "total_count",
      secondary_metrics: ["last_event_kind", "accepted_count"],
      status_token: "last_event_kind",
      target_mode: "operate",
      target_tool_id: "activity_ledger",
    },
    {
      id: "topology_construct",
      title: "Topology Construct",
      source_spine: "topologyConstruct",
      primary_metric: "node_count",
      secondary_metrics: ["link_count", "risk_flag_count", "density"],
      status_token: "density",
      target_mode: "topology",
      target_tool_id: "topology_construct",
    },
    {
      id: "assess_preflight",
      title: "Assess Preflight",
      source_spine: "assessmentPreflightSnapshot",
      primary_metric: "can_start",
      secondary_metrics: ["overall_state", "pipeline_steps"],
      status_token: "can_start",
      target_mode: "assess",
      target_tool_id: "preflight_snapshot",
    },
    {
      id: "report_draft",
      title: "Report Draft",
      source_spine: "assessmentReportDraft",
      primary_metric: "section_count",
      secondary_metrics: ["limitations_present"],
      status_token: "section_count",
      target_mode: "assess",
      target_tool_id: "report_draft",
    },
    {
      id: "build_intent",
      title: "Build Intent",
      source_spine: "buildIntentWorkspace",
      primary_metric: "intent_count",
      secondary_metrics: ["partial_count", "deferred_count"],
      status_token: "intent_count",
      target_mode: "build",
      target_tool_id: "intent_workspace",
    },
    {
      id: "capability_matrix",
      title: "Capability Matrix",
      source_spine: "modeCapabilityMatrix",
      primary_metric: "available_count",
      secondary_metrics: ["deferred_count", "blocked_count"],
      status_token: "available_count",
      target_mode: "operate",
      target_tool_id: null,
    },
  ];
}

function buildToolSurfaces(
  matrix: ModeCapabilityMatrix,
): readonly ToolSurfaceContract[] {
  const out: ToolSurfaceContract[] = [];
  for (const m of matrix.modes) {
    for (const t of m.tools) {
      out.push({
        mode: m.mode,
        tool_id: t.tool_id,
        label: t.label,
        state: t.state,
        backing_command_id: t.backing_command_id,
        reason_code: t.reason_code,
      });
    }
  }
  return out;
}

function buildModeSurfaces(
  matrix: ModeCapabilityMatrix,
): readonly ModeSurfaceContract[] {
  return matrix.modes.map((m) => ({
    mode: m.mode,
    label: m.label,
    capability_state: m.state,
    tool_ids: m.tools.map((t) => t.tool_id),
    primary_next_action_id: m.primary_next_action_id,
  }));
}

export function buildDesignHandoffContract(
  inputs: BuildDesignHandoffContractInputs,
): DesignHandoffContract {
  const {
    matrix,
    registry,
    router,
    profile,
    preflight,
    draft,
    build,
    construct,
    now = defaultNow,
    idFactory = defaultIdFactory,
  } = inputs;
  void inputs.triage;
  void inputs.sessionExport;

  const command_ids = registry.commands.map((c) => c.id);
  const action_ids = router.actions.map((a) => a.id);

  const honesty_lines_present = ASSESS_HONESTY_LINES.every((l) =>
    draft.limitations.includes(l),
  );

  return {
    contract_id: idFactory(profile),
    created_at: now(),
    version: DESIGN_HANDOFF_VERSION,
    mode_surfaces: buildModeSurfaces(matrix),
    tool_surfaces: buildToolSurfaces(matrix),
    command_ids,
    action_ids,
    readiness_tokens: READINESS_TOKENS,
    triage_tokens: TRIAGE_SEVERITIES,
    activity_event_kinds: ACTIVITY_EVENT_KINDS,
    capability_states: CAPABILITY_STATES,
    topology_construct_contract: {
      supports_3d: construct.layout_hints.supports_3d,
      supports_minimap: construct.layout_hints.supports_minimap,
      density: construct.layout_hints.density,
      node_fields: TOPOLOGY_NODE_FIELDS,
      link_fields: TOPOLOGY_LINK_FIELDS,
      cluster_fields: TOPOLOGY_CLUSTER_FIELDS,
      layer_fields: TOPOLOGY_LAYER_FIELDS,
      risk_flag_fields: TOPOLOGY_RISK_FLAG_FIELDS,
      layout_hint_fields: TOPOLOGY_LAYOUT_HINT_FIELDS,
    },
    assess_contract: {
      preflight_fields: PREFLIGHT_FIELDS,
      report_draft_sections: REPORT_DRAFT_SECTIONS,
      honesty_lines_present,
      can_start: preflight.can_start,
    },
    build_contract: {
      intent_types: BUILD_INTENT_TYPES,
      receipt_fields: BUILD_RECEIPT_FIELDS,
      limitations_present: build.limitations.length > 0,
    },
    environment_contract: {
      profile_fields: ENVIRONMENT_PROFILE_FIELDS,
      risk_summary_fields: RISK_SUMMARY_FIELDS,
      profile_state: profile.profile_state,
    },
    dashboard_cards: buildDashboardCards(router),
    limitations: DESIGN_HANDOFF_LIMITATIONS,
  };
}
