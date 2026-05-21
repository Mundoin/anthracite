/**
 * D2 — Dashboard card metric resolver.
 *
 * Pure helper mapping a V1CG `DashboardCardContract.id` + the live App
 * spines into the display projection needed by DashboardCard:
 *   { metric, secondaryMetric, chip, summary, disabled, iconId }.
 *
 * Hard discipline:
 *   - Reads counts/states/labels only from safe spines.
 *   - Never echoes raw payloads/configs/credentials/secrets.
 *   - Deterministic: same spines → same output.
 *   - No I/O, no fetch, no mutation.
 */

import type { EnvironmentProfile } from "../../state/environmentProfile";
import type { AssessmentReadiness } from "../../state/assessmentReadiness";
import type { WorkbenchActionRouter } from "../../state/workbenchActionRouter";
import type { DiagnoseTriage } from "../../modes/diagnose/diagnoseTriage";
import type { OperatorActivityLedger } from "../../state/operatorActivityLedger";
import type { TopologyConstruct } from "../../modes/topology/topologyConstructModel";
import type { AssessmentPreflightSnapshot } from "../../modes/assess/assessmentPreflightSnapshot";
import type { AssessmentReportDraft } from "../../modes/assess/assessmentReportDraft";
import type { BuildIntentWorkspace } from "../../modes/build/buildIntentWorkspace";
import type { ModeCapabilityMatrix } from "../../state/modeCapabilityMatrix";
import type { ChipTone, ChipVariant } from "../shell/Chip";

export interface DashboardChipSpec {
  readonly variant: ChipVariant;
  readonly tone: ChipTone;
  readonly label: string;
}

export interface DashboardCardProjection {
  readonly metric: string;
  readonly secondaryMetric: string | null;
  readonly chip: DashboardChipSpec;
  readonly summary: string;
  readonly disabled: boolean;
  readonly iconId: string;
}

export interface DashboardSpineBundle {
  readonly profile: EnvironmentProfile;
  readonly readiness: AssessmentReadiness;
  readonly router: WorkbenchActionRouter;
  readonly triage: DiagnoseTriage;
  readonly ledger: OperatorActivityLedger;
  readonly construct: TopologyConstruct;
  readonly preflight: AssessmentPreflightSnapshot;
  readonly draft: AssessmentReportDraft;
  readonly build: BuildIntentWorkspace;
  readonly matrix: ModeCapabilityMatrix;
}

function profileChip(p: EnvironmentProfile): DashboardChipSpec {
  const map: Record<EnvironmentProfile["profile_state"], DashboardChipSpec> = {
    empty:   { variant: "status",    tone: "idle",    label: "Empty" },
    partial: { variant: "capability", tone: "partial", label: "Partial" },
    active:  { variant: "capability", tone: "available", label: "Active" },
    blocked: { variant: "capability", tone: "blocked", label: "Blocked" },
  };
  return map[p.profile_state];
}

function readinessChip(r: AssessmentReadiness): DashboardChipSpec {
  const tone =
    r.overall_state === "empty"
      ? "empty"
      : r.overall_state === "partial"
        ? "partial"
        : r.overall_state === "ready"
          ? "ready"
          : "blocked";
  return { variant: "readiness", tone, label: r.overall_state };
}

function riskChip(triage: DiagnoseTriage): DashboardChipSpec {
  if (triage.critical_count > 0) {
    return { variant: "risk", tone: "critical", label: "Critical" };
  }
  if (triage.warning_count > 0) {
    return { variant: "risk", tone: "warning", label: "Warning" };
  }
  return { variant: "risk", tone: "info", label: "Info" };
}

export function resolveDashboardCard(
  cardId: string,
  s: DashboardSpineBundle,
): DashboardCardProjection {
  switch (cardId) {
    case "environment_profile":
      return {
        metric: s.profile.profile_state,
        secondaryMetric: `${s.profile.device_count} devices · ${s.profile.topology_node_count} nodes`,
        chip: profileChip(s.profile),
        summary: s.profile.display_label,
        disabled: false,
        iconId: "cloud",
      };
    case "readiness":
      return {
        metric: s.readiness.overall_state,
        secondaryMetric: `${s.readiness.available_inputs.length}/${s.readiness.available_inputs.length + s.readiness.missing_inputs.length} inputs`,
        chip: readinessChip(s.readiness),
        summary: s.readiness.blocker_reason_codes.length > 0
          ? s.readiness.blocker_reason_codes.join(", ")
          : "Readiness derived from local context.",
        disabled: false,
        iconId: "assess-checklist",
      };
    case "top_action":
      return {
        metric: s.router.top_action_id ?? "none",
        secondaryMetric: `${s.router.available_count}/${s.router.total_count} available`,
        chip:
          s.router.top_action_id !== null
            ? { variant: "capability", tone: "available", label: "Ready" }
            : { variant: "capability", tone: "deferred", label: "None" },
        summary:
          s.router.actions.find((a) => a.id === s.router.top_action_id)?.label
          ?? "No next action recommended.",
        disabled: s.router.top_action_id === null,
        iconId: "workflow-step",
      };
    case "diagnose_triage":
      return {
        metric: String(s.triage.total_count),
        secondaryMetric: `${s.triage.critical_count} crit · ${s.triage.warning_count} warn`,
        chip: riskChip(s.triage),
        summary:
          s.triage.findings[0]?.title ?? "No triage findings.",
        disabled: s.triage.total_count === 0,
        iconId: "mode-diagnose",
      };
    case "operator_activity":
      return {
        metric: String(s.ledger.total_count),
        secondaryMetric: s.ledger.last_event_kind ?? "no events",
        chip:
          s.ledger.total_count > 0
            ? { variant: "capability", tone: "available", label: "Active" }
            : { variant: "capability", tone: "partial", label: "Idle" },
        summary: `${s.ledger.accepted_count} accepted · ${s.ledger.rejected_count} rejected · ${s.ledger.blocked_count} blocked`,
        disabled: false,
        iconId: "workflow-clock",
      };
    case "topology_construct":
      return {
        metric: String(s.construct.node_count),
        secondaryMetric: `${s.construct.link_count} links · ${s.construct.risk_flag_count} risks · ${s.construct.layout_hints.density}`,
        chip:
          s.construct.risk_flag_count > 0
            ? { variant: "risk", tone: "warning", label: "Risk" }
            : s.construct.node_count > 0
              ? { variant: "capability", tone: "available", label: "Live" }
              : { variant: "capability", tone: "partial", label: "Empty" },
        summary: `Density ${s.construct.layout_hints.density} · ${s.construct.layout_hints.supports_3d ? "3D-capable" : "2D-only"}`,
        disabled: s.construct.node_count === 0,
        iconId: "mode-topology",
      };
    case "assess_preflight":
      return {
        metric: s.preflight.can_start ? "ready" : s.preflight.overall_state,
        secondaryMetric: `${s.preflight.pipeline_steps.filter((p) => p.status === "ready").length}/${s.preflight.pipeline_steps.length} steps ready`,
        chip:
          s.preflight.can_start
            ? { variant: "capability", tone: "available", label: "Can start" }
            : s.preflight.overall_state === "blocked"
              ? { variant: "capability", tone: "blocked", label: "Blocked" }
              : { variant: "capability", tone: "partial", label: "Prep" },
        summary:
          s.preflight.blocked_reason_codes[0]
          ?? `Assess state: ${s.preflight.assess_state}`,
        disabled: s.preflight.overall_state === "empty",
        iconId: "assess-pipeline",
      };
    case "report_draft":
      return {
        metric: String(s.draft.sections.length),
        secondaryMetric: s.draft.limitations.length > 0
          ? `${s.draft.limitations.length} limitations`
          : "no limitations",
        chip:
          s.draft.sections.length > 0
            ? { variant: "capability", tone: "available", label: "Draft" }
            : { variant: "capability", tone: "partial", label: "Empty" },
        summary: s.draft.title,
        disabled: s.draft.sections.length === 0,
        iconId: "assess-report",
      };
    case "build_intent":
      return {
        metric: String(s.build.total_count),
        secondaryMetric: `${s.build.partial_count} partial · ${s.build.deferred_count} deferred · ${s.build.blocked_count} blocked`,
        chip:
          s.build.partial_count > 0
            ? { variant: "capability", tone: "partial", label: "Partial" }
            : s.build.total_count > 0
              ? { variant: "capability", tone: "deferred", label: "Deferred" }
              : { variant: "capability", tone: "partial", label: "Empty" },
        summary: "Local intent drafts only. No deploy.",
        disabled: s.build.total_count === 0,
        iconId: "build-intent",
      };
    case "capability_matrix":
      return {
        metric: String(s.matrix.available_count),
        secondaryMetric: `${s.matrix.deferred_count} deferred · ${s.matrix.blocked_count} blocked`,
        chip:
          s.matrix.blocked_count > 0
            ? { variant: "capability", tone: "blocked", label: "Blockers" }
            : s.matrix.available_count > 0
              ? { variant: "capability", tone: "available", label: "Active" }
              : { variant: "capability", tone: "partial", label: "Partial" },
        summary: `${s.matrix.total_modes} modes mapped.`,
        disabled: false,
        iconId: "mode-hierarchy",
      };
    default:
      return {
        metric: "—",
        secondaryMetric: null,
        chip: { variant: "status", tone: "idle", label: "Unknown" },
        summary: `Unknown dashboard card: ${cardId}`,
        disabled: true,
        iconId: "status-info",
      };
  }
}
