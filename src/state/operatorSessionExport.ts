/**
 * V1CF — Operator Session Export.
 *
 * Pure deterministic packaging of every App-owned spine into a safe
 * session-export artifact: structured blocks + JSON summary + Markdown
 * rendering. NO file writing, NO save dialog, NO persistence, NO PDF.
 *
 * Hard discipline:
 *   - Inputs are safe projections only (13 spines).
 *   - Output is labels/counts/short-tokens only — no raw configs, no raw
 *     evidence payloads, no markdown bodies from external sources, no
 *     command output, no credentials, no secrets, no evidence_set_id,
 *     no raw error messages.
 *   - Deterministic: same inputs + same clock/id factory → same export.
 *   - No I/O, no fetch, no mutation, no execution.
 *   - Limitations always declare: local projections only, no raw
 *     payloads, no execution/persistence, no file writing.
 */

import type { EnvironmentProfile } from "./environmentProfile";
import type { WorkbenchContextSummary } from "./workbenchContextSummary";
import type { AssessmentReadiness } from "./assessmentReadiness";
import type { OperatorActivityLedger } from "./operatorActivityLedger";
import type { DiagnoseTriage } from "../modes/diagnose/diagnoseTriage";
import type { CortexCommandRegistry } from "./cortexCommandRegistry";
import type { WorkbenchActionRouter } from "./workbenchActionRouter";
import type { AssessmentPreflightSnapshot } from "../modes/assess/assessmentPreflightSnapshot";
import type { AssessmentReportDraft } from "../modes/assess/assessmentReportDraft";
import type { BuildIntentWorkspace } from "../modes/build/buildIntentWorkspace";
import type {
  TopologyConstruct,
  TopologyConstructLayoutHints,
} from "../modes/topology/topologyConstructModel";
import type { ModeCapabilityMatrix } from "./modeCapabilityMatrix";

export interface OperatorSessionEnvironmentBlock {
  readonly environment_id: string;
  readonly display_label: string;
  readonly profile_state: EnvironmentProfile["profile_state"];
  readonly risk_summary: EnvironmentProfile["risk_summary"];
  readonly construct_density: EnvironmentProfile["construct_density"];
}

export interface OperatorSessionReadinessBlock {
  readonly overall_state: AssessmentReadiness["overall_state"];
  readonly assess_state: AssessmentReadiness["assess_state"];
  readonly available_inputs: readonly string[];
  readonly missing_inputs: readonly string[];
  readonly blocker_reason_codes: readonly string[];
}

export interface OperatorSessionActivityBlock {
  readonly total_count: number;
  readonly last_event_kind: string | null;
  readonly last_event_at: string | null;
  readonly accepted_count: number;
  readonly rejected_count: number;
  readonly blocked_count: number;
}

export interface OperatorSessionTriageFindingEntry {
  readonly severity: "critical" | "warning" | "info";
  readonly title: string;
  readonly reason_code: string;
}

export interface OperatorSessionTriageBlock {
  readonly total_count: number;
  readonly critical_count: number;
  readonly warning_count: number;
  readonly info_count: number;
  readonly findings: readonly OperatorSessionTriageFindingEntry[];
}

export interface OperatorSessionCortexBlock {
  readonly command_total_count: number;
  readonly command_available_count: number;
  readonly command_deferred_count: number;
  readonly command_blocked_count: number;
}

export interface OperatorSessionActionEntry {
  readonly id: string;
  readonly label: string;
  readonly status: string;
  readonly reason_code: string | null;
  readonly target_mode: string;
}

export interface OperatorSessionActionsBlock {
  readonly total_count: number;
  readonly top_action_id: string | null;
  readonly actions: readonly OperatorSessionActionEntry[];
}

export interface OperatorSessionAssessBlock {
  readonly preflight_snapshot_id: string;
  readonly can_start: boolean;
  readonly report_draft_id: string;
  readonly report_section_count: number;
  readonly report_limitations: readonly string[];
}

export interface OperatorSessionBuildDraftEntry {
  readonly draft_id: string;
  readonly intent_type: string;
  readonly status: string;
  readonly missing_input_count: number;
  readonly preview_line_count: number;
}

export interface OperatorSessionBuildReceiptEntry {
  readonly receipt_id: string;
  readonly draft_id: string;
  readonly status: string;
  readonly can_generate_preview: boolean;
  readonly reason_code: string | null;
}

export interface OperatorSessionBuildBlock {
  readonly intent_count: number;
  readonly drafts: readonly OperatorSessionBuildDraftEntry[];
  readonly receipts: readonly OperatorSessionBuildReceiptEntry[];
}

export interface OperatorSessionTopologyBlock {
  readonly construct_id: string;
  readonly node_count: number;
  readonly link_count: number;
  readonly cluster_count: number;
  readonly layer_count: number;
  readonly risk_flag_count: number;
  readonly layout_hints: TopologyConstructLayoutHints;
}

export interface OperatorSessionCapabilityModeSummary {
  readonly mode: string;
  readonly state: string;
  readonly available_tool_count: number;
  readonly deferred_tool_count: number;
  readonly blocked_tool_count: number;
}

export interface OperatorSessionCapabilitiesBlock {
  readonly total_modes: number;
  readonly available_count: number;
  readonly deferred_count: number;
  readonly blocked_count: number;
  readonly primary_blocker_count: number;
  readonly modes: readonly OperatorSessionCapabilityModeSummary[];
}

export interface OperatorSessionJsonSummary {
  readonly environment_id: string;
  readonly profile_state: EnvironmentProfile["profile_state"];
  readonly readiness_state: AssessmentReadiness["overall_state"];
  readonly triage_total_count: number;
  readonly triage_critical_count: number;
  readonly activity_event_count: number;
  readonly top_action_id: string | null;
  readonly command_available_count: number;
  readonly capability_available_count: number;
  readonly topology_node_count: number;
  readonly topology_link_count: number;
  readonly build_intent_count: number;
  readonly assess_can_start: boolean;
}

export interface OperatorSessionExport {
  readonly export_id: string;
  readonly created_at: string;
  readonly title: string;
  readonly environment: OperatorSessionEnvironmentBlock;
  readonly readiness: OperatorSessionReadinessBlock;
  readonly activity: OperatorSessionActivityBlock;
  readonly triage: OperatorSessionTriageBlock;
  readonly cortex: OperatorSessionCortexBlock;
  readonly actions: OperatorSessionActionsBlock;
  readonly assess: OperatorSessionAssessBlock;
  readonly build: OperatorSessionBuildBlock;
  readonly topology: OperatorSessionTopologyBlock;
  readonly capabilities: OperatorSessionCapabilitiesBlock;
  readonly json_summary: OperatorSessionJsonSummary;
  readonly markdown: string;
  readonly limitations: readonly string[];
}

export const SESSION_EXPORT_LIMITATIONS: readonly string[] = [
  "Export is generated from local App-owned workbench projections.",
  "No raw configs or raw evidence are included.",
  "No assessment execution, compliance scan, PDF generation, live polling, SNMP assessment, deploy, or rollback has run as part of this export.",
  "Export builder does not persist data or write files.",
];

export interface BuildOperatorSessionExportInputs {
  readonly profile: EnvironmentProfile;
  readonly summary: WorkbenchContextSummary;
  readonly readiness: AssessmentReadiness;
  readonly ledger: OperatorActivityLedger;
  readonly triage: DiagnoseTriage;
  readonly registry: CortexCommandRegistry;
  readonly router: WorkbenchActionRouter;
  readonly preflight: AssessmentPreflightSnapshot;
  readonly draft: AssessmentReportDraft;
  readonly build: BuildIntentWorkspace;
  readonly construct: TopologyConstruct;
  readonly matrix: ModeCapabilityMatrix;
  readonly now?: () => string;
  readonly idFactory?: (profile: EnvironmentProfile) => string;
}

function defaultNow(): string {
  return new Date().toISOString();
}

function defaultIdFactory(profile: EnvironmentProfile): string {
  return `session-${profile.environment_id}-${profile.profile_state}`;
}

function buildEnvironment(
  profile: EnvironmentProfile,
): OperatorSessionEnvironmentBlock {
  return {
    environment_id: profile.environment_id,
    display_label: profile.display_label,
    profile_state: profile.profile_state,
    risk_summary: profile.risk_summary,
    construct_density: profile.construct_density,
  };
}

function buildReadiness(
  readiness: AssessmentReadiness,
): OperatorSessionReadinessBlock {
  return {
    overall_state: readiness.overall_state,
    assess_state: readiness.assess_state,
    available_inputs: readiness.available_inputs,
    missing_inputs: readiness.missing_inputs,
    blocker_reason_codes: readiness.blocker_reason_codes,
  };
}

function buildActivity(
  ledger: OperatorActivityLedger,
): OperatorSessionActivityBlock {
  return {
    total_count: ledger.total_count,
    last_event_kind: ledger.last_event_kind,
    last_event_at: ledger.last_event_at,
    accepted_count: ledger.accepted_count,
    rejected_count: ledger.rejected_count,
    blocked_count: ledger.blocked_count,
  };
}

function buildTriage(triage: DiagnoseTriage): OperatorSessionTriageBlock {
  return {
    total_count: triage.total_count,
    critical_count: triage.critical_count,
    warning_count: triage.warning_count,
    info_count: triage.info_count,
    findings: triage.findings.map((f) => ({
      severity: f.severity,
      title: f.title,
      reason_code: f.reason_code,
    })),
  };
}

function buildCortex(
  registry: CortexCommandRegistry,
): OperatorSessionCortexBlock {
  return {
    command_total_count: registry.total_count,
    command_available_count: registry.available_count,
    command_deferred_count: registry.deferred_count,
    command_blocked_count: registry.blocked_count,
  };
}

function buildActions(
  router: WorkbenchActionRouter,
): OperatorSessionActionsBlock {
  return {
    total_count: router.total_count,
    top_action_id: router.top_action_id,
    actions: router.actions.map((a) => ({
      id: a.id,
      label: a.label,
      status: a.status,
      reason_code: a.reason_code,
      target_mode: a.target_mode,
    })),
  };
}

function buildAssess(
  preflight: AssessmentPreflightSnapshot,
  draft: AssessmentReportDraft,
): OperatorSessionAssessBlock {
  return {
    preflight_snapshot_id: preflight.snapshot_id,
    can_start: preflight.can_start,
    report_draft_id: draft.draft_id,
    report_section_count: draft.sections.length,
    report_limitations: draft.limitations,
  };
}

function buildBuild(
  build: BuildIntentWorkspace,
): OperatorSessionBuildBlock {
  return {
    intent_count: build.total_count,
    drafts: build.drafts.map((d) => ({
      draft_id: d.draft_id,
      intent_type: d.intent_type,
      status: d.status,
      missing_input_count: d.missing_inputs.length,
      preview_line_count: d.generated_preview_lines.length,
    })),
    receipts: build.receipts.map((r) => ({
      receipt_id: r.receipt_id,
      draft_id: r.draft_id,
      status: r.status,
      can_generate_preview: r.can_generate_preview,
      reason_code: r.reason_code,
    })),
  };
}

function buildTopology(
  construct: TopologyConstruct,
): OperatorSessionTopologyBlock {
  return {
    construct_id: construct.construct_id,
    node_count: construct.node_count,
    link_count: construct.link_count,
    cluster_count: construct.cluster_count,
    layer_count: construct.layer_count,
    risk_flag_count: construct.risk_flag_count,
    layout_hints: construct.layout_hints,
  };
}

function buildCapabilities(
  matrix: ModeCapabilityMatrix,
): OperatorSessionCapabilitiesBlock {
  return {
    total_modes: matrix.total_modes,
    available_count: matrix.available_count,
    deferred_count: matrix.deferred_count,
    blocked_count: matrix.blocked_count,
    primary_blocker_count: matrix.primary_blocker_count,
    modes: matrix.modes.map((m) => ({
      mode: m.mode,
      state: m.state,
      available_tool_count: m.tools.filter((t) => t.state === "available").length,
      deferred_tool_count: m.tools.filter((t) => t.state === "deferred").length,
      blocked_tool_count: m.tools.filter((t) => t.state === "blocked").length,
    })),
  };
}

function buildJsonSummary(
  profile: EnvironmentProfile,
  readiness: AssessmentReadiness,
  triage: DiagnoseTriage,
  ledger: OperatorActivityLedger,
  router: WorkbenchActionRouter,
  registry: CortexCommandRegistry,
  matrix: ModeCapabilityMatrix,
  construct: TopologyConstruct,
  build: BuildIntentWorkspace,
  preflight: AssessmentPreflightSnapshot,
): OperatorSessionJsonSummary {
  return {
    environment_id: profile.environment_id,
    profile_state: profile.profile_state,
    readiness_state: readiness.overall_state,
    triage_total_count: triage.total_count,
    triage_critical_count: triage.critical_count,
    activity_event_count: ledger.total_count,
    top_action_id: router.top_action_id,
    command_available_count: registry.available_count,
    capability_available_count: matrix.available_count,
    topology_node_count: construct.node_count,
    topology_link_count: construct.link_count,
    build_intent_count: build.total_count,
    assess_can_start: preflight.can_start,
  };
}

function renderMarkdown(
  title: string,
  blocks: OperatorSessionExport,
): string {
  const out: string[] = [`# ${title}`, ""];
  out.push("## Environment");
  out.push(`- ${blocks.environment.display_label}`);
  out.push(`- Profile state: ${blocks.environment.profile_state}`);
  out.push(`- Construct density: ${blocks.environment.construct_density}`);
  out.push("");
  out.push("## Readiness");
  out.push(`- Overall: ${blocks.readiness.overall_state}`);
  out.push(`- Assess: ${blocks.readiness.assess_state}`);
  out.push(
    `- Available inputs: ${blocks.readiness.available_inputs.length === 0 ? "none" : blocks.readiness.available_inputs.join(", ")}`,
  );
  out.push(
    `- Missing inputs: ${blocks.readiness.missing_inputs.length === 0 ? "none" : blocks.readiness.missing_inputs.join(", ")}`,
  );
  out.push("");
  out.push("## Activity");
  out.push(`- Total events: ${blocks.activity.total_count}`);
  out.push(`- Last event kind: ${blocks.activity.last_event_kind ?? "none"}`);
  out.push(
    `- Accepted/Rejected/Blocked: ${blocks.activity.accepted_count}/${blocks.activity.rejected_count}/${blocks.activity.blocked_count}`,
  );
  out.push("");
  out.push("## Triage");
  out.push(
    `- Total ${blocks.triage.total_count} (critical=${blocks.triage.critical_count}, warning=${blocks.triage.warning_count}, info=${blocks.triage.info_count})`,
  );
  for (const f of blocks.triage.findings) {
    out.push(`- [${f.severity}] ${f.reason_code} — ${f.title}`);
  }
  out.push("");
  out.push("## Cortex Commands");
  out.push(
    `- Total ${blocks.cortex.command_total_count} (available=${blocks.cortex.command_available_count}, deferred=${blocks.cortex.command_deferred_count}, blocked=${blocks.cortex.command_blocked_count})`,
  );
  out.push("");
  out.push("## Actions");
  out.push(
    `- Total ${blocks.actions.total_count}, top=${blocks.actions.top_action_id ?? "none"}`,
  );
  for (const a of blocks.actions.actions) {
    out.push(`- ${a.id} → ${a.target_mode} (${a.status}) — ${a.label}`);
  }
  out.push("");
  out.push("## Assess");
  out.push(`- Preflight snapshot: ${blocks.assess.preflight_snapshot_id}`);
  out.push(`- Can start: ${blocks.assess.can_start ? "yes" : "no"}`);
  out.push(`- Report draft: ${blocks.assess.report_draft_id}`);
  out.push(`- Report sections: ${blocks.assess.report_section_count}`);
  out.push("");
  out.push("## Build");
  out.push(`- Intent drafts: ${blocks.build.intent_count}`);
  for (const d of blocks.build.drafts) {
    out.push(`- ${d.intent_type} (${d.status})`);
  }
  out.push("");
  out.push("## Topology Construct");
  out.push(`- Nodes: ${blocks.topology.node_count}`);
  out.push(`- Links: ${blocks.topology.link_count}`);
  out.push(`- Density: ${blocks.topology.layout_hints.density}`);
  out.push(`- Supports 3D: ${blocks.topology.layout_hints.supports_3d ? "yes" : "no"}`);
  out.push("");
  out.push("## Capabilities");
  out.push(
    `- Total ${blocks.capabilities.total_modes} (available=${blocks.capabilities.available_count}, deferred=${blocks.capabilities.deferred_count}, blocked=${blocks.capabilities.blocked_count})`,
  );
  for (const m of blocks.capabilities.modes) {
    out.push(
      `- ${m.mode} (${m.state}) — avail=${m.available_tool_count}, deferred=${m.deferred_tool_count}, blocked=${m.blocked_tool_count}`,
    );
  }
  out.push("");
  out.push("## Limitations");
  for (const l of blocks.limitations) {
    out.push(`- ${l}`);
  }
  out.push("");
  return out.join("\n");
}

export function buildOperatorSessionExport(
  inputs: BuildOperatorSessionExportInputs,
): OperatorSessionExport {
  const {
    profile,
    readiness,
    ledger,
    triage,
    registry,
    router,
    preflight,
    draft,
    build,
    construct,
    matrix,
    now = defaultNow,
    idFactory = defaultIdFactory,
  } = inputs;
  void inputs.summary;

  const title = "Operator Session Export";
  const environment = buildEnvironment(profile);
  const readinessBlock = buildReadiness(readiness);
  const activity = buildActivity(ledger);
  const triageBlock = buildTriage(triage);
  const cortex = buildCortex(registry);
  const actions = buildActions(router);
  const assess = buildAssess(preflight, draft);
  const buildBlock = buildBuild(build);
  const topology = buildTopology(construct);
  const capabilities = buildCapabilities(matrix);
  const json_summary = buildJsonSummary(
    profile,
    readiness,
    triage,
    ledger,
    router,
    registry,
    matrix,
    construct,
    build,
    preflight,
  );

  const partial: OperatorSessionExport = {
    export_id: idFactory(profile),
    created_at: now(),
    title,
    environment,
    readiness: readinessBlock,
    activity,
    triage: triageBlock,
    cortex,
    actions,
    assess,
    build: buildBlock,
    topology,
    capabilities,
    json_summary,
    markdown: "",
    limitations: SESSION_EXPORT_LIMITATIONS,
  };
  return { ...partial, markdown: renderMarkdown(title, partial) };
}
