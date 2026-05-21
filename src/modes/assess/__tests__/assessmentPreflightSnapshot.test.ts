/**
 * V1BZ — AssessmentPreflightSnapshot comprehensive cases.
 */

import { describe, expect, it } from "vitest";
import {
  buildAssessmentPreflightSnapshot,
  type BuildAssessmentPreflightSnapshotInputs,
  type PreflightPipelineStepId,
} from "../assessmentPreflightSnapshot";
import {
  EMPTY_WORKBENCH_CONTEXT_SUMMARY,
  type WorkbenchContextSummary,
} from "../../../state/workbenchContextSummary";
import {
  EMPTY_ASSESSMENT_READINESS,
  type AssessmentReadiness,
} from "../../../state/assessmentReadiness";
import {
  EMPTY_DIAGNOSE_TRIAGE,
  buildDiagnoseTriage,
  type DiagnoseTriage,
} from "../../diagnose/diagnoseTriage";
import {
  EMPTY_OPERATOR_ACTIVITY_LEDGER,
  type OperatorActivityLedger,
} from "../../../state/operatorActivityLedger";
import {
  EMPTY_WORKBENCH_ACTION_ROUTER,
  buildWorkbenchActionRouter,
  type WorkbenchActionRouter,
} from "../../../state/workbenchActionRouter";
import {
  EMPTY_CORTEX_COMMAND_REGISTRY,
  buildCortexCommandRegistry,
  type CortexCommandRegistry,
} from "../../../state/cortexCommandRegistry";

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

function inputs(
  override: Partial<{
    summary: WorkbenchContextSummary;
    readiness: AssessmentReadiness;
    triage: DiagnoseTriage;
    ledger: OperatorActivityLedger;
    router: WorkbenchActionRouter;
    registry: CortexCommandRegistry;
    reportDraftAvailable: boolean;
  }>,
): BuildAssessmentPreflightSnapshotInputs {
  return {
    summary: override.summary ?? EMPTY_WORKBENCH_CONTEXT_SUMMARY,
    readiness: override.readiness ?? EMPTY_ASSESSMENT_READINESS,
    triage: override.triage ?? EMPTY_DIAGNOSE_TRIAGE,
    ledger: override.ledger ?? EMPTY_OPERATOR_ACTIVITY_LEDGER,
    router: override.router ?? EMPTY_WORKBENCH_ACTION_ROUTER,
    registry: override.registry ?? EMPTY_CORTEX_COMMAND_REGISTRY,
    now: () => FIXED_NOW,
    reportDraftAvailable: override.reportDraftAvailable,
  };
}

function pipelineStep(
  steps: readonly { id: PreflightPipelineStepId; status: string }[],
  id: PreflightPipelineStepId,
) {
  return steps.find((s) => s.id === id);
}

describe("AssessmentPreflightSnapshot — behavior", () => {
  it("counts mirror WorkbenchContextSummary safely", () => {
    const summary: WorkbenchContextSummary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 4,
        edge_count: 3,
      },
      evidence_import: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
        accepted_evidence_total: 7,
        rejected_evidence_total: 2,
      },
      intake: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
        parsed_device_count: 5,
        finding_count: 1,
      },
    };
    const s = buildAssessmentPreflightSnapshot(inputs({ summary }));
    expect(s.topology_node_count).toBe(4);
    expect(s.topology_edge_count).toBe(3);
    expect(s.accepted_evidence_total).toBe(7);
    expect(s.rejected_evidence_total).toBe(2);
    expect(s.parsed_device_count).toBe(5);
    expect(s.finding_count).toBe(1);
  });

  it("critical triage adds limitation and blocks diagnose_triage step", () => {
    const summary: WorkbenchContextSummary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      evidence_import: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
        accepted_evidence_total: 3,
      },
    };
    const triage = buildDiagnoseTriage({
      summary,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    });
    expect(triage.critical_count).toBeGreaterThan(0);
    const s = buildAssessmentPreflightSnapshot(inputs({ summary, triage }));
    expect(
      s.limitations.some((l) => l.includes("Critical triage findings")),
    ).toBe(true);
    expect(pipelineStep(s.pipeline_steps, "diagnose_triage")?.status).toBe(
      "blocked",
    );
  });

  it("readiness blocked propagates blocked_reason_codes and blocks readiness_review", () => {
    const readiness: AssessmentReadiness = {
      ...EMPTY_ASSESSMENT_READINESS,
      overall_state: "blocked",
      assess_state: "blocked",
      blocker_reason_codes: ["no_signals"],
    };
    const s = buildAssessmentPreflightSnapshot(inputs({ readiness }));
    expect(s.blocked_reason_codes).toEqual(["no_signals"]);
    expect(pipelineStep(s.pipeline_steps, "readiness_review")?.status).toBe(
      "blocked",
    );
  });

  it("pipeline step statuses derive from summary signals", () => {
    const summary: WorkbenchContextSummary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      discovery: { seed_count: 2, total_seed_count: 2, history_entry_count: 0 },
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 1,
      },
      evidence_import: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
        accepted_evidence_total: 1,
      },
      intake: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
        parsed_device_count: 1,
      },
    };
    const s = buildAssessmentPreflightSnapshot(inputs({ summary }));
    expect(pipelineStep(s.pipeline_steps, "discovery_context")?.status).toBe("ready");
    expect(pipelineStep(s.pipeline_steps, "topology_context")?.status).toBe("ready");
    expect(pipelineStep(s.pipeline_steps, "evidence_context")?.status).toBe("ready");
    expect(pipelineStep(s.pipeline_steps, "intake_context")?.status).toBe("ready");
  });

  it("report_draft step defaults to deferred and toggles via reportDraftAvailable", () => {
    const deferred = buildAssessmentPreflightSnapshot(inputs({}));
    expect(pipelineStep(deferred.pipeline_steps, "report_draft")?.status).toBe(
      "deferred",
    );
    expect(
      deferred.limitations.some((l) => l.includes("Report draft generation")),
    ).toBe(true);

    const ready = buildAssessmentPreflightSnapshot(
      inputs({ reportDraftAvailable: true }),
    );
    expect(pipelineStep(ready.pipeline_steps, "report_draft")?.status).toBe(
      "ready",
    );
    expect(
      ready.limitations.some((l) => l.includes("Report draft generation")),
    ).toBe(false);
  });

  it("snapshot_id is deterministic for identical inputs", () => {
    const i = inputs({
      summary: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 2,
          edge_count: 1,
        },
      },
    });
    const a = buildAssessmentPreflightSnapshot(i);
    const b = buildAssessmentPreflightSnapshot(i);
    expect(a.snapshot_id).toBe(b.snapshot_id);
    expect(a).toEqual(b);
  });

  it("idFactory and now are honored", () => {
    const s = buildAssessmentPreflightSnapshot({
      ...inputs({}),
      now: () => "2099-01-01T00:00:00.000Z",
      idFactory: () => "custom-snapshot-id",
    });
    expect(s.snapshot_id).toBe("custom-snapshot-id");
    expect(s.created_at).toBe("2099-01-01T00:00:00.000Z");
  });

  it("derived counts include router/registry/ledger/triage facts", () => {
    const summary: WorkbenchContextSummary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      discovery: { seed_count: 1, total_seed_count: 1, history_entry_count: 0 },
    };
    const readiness = EMPTY_ASSESSMENT_READINESS;
    const ledger: OperatorActivityLedger = {
      ...EMPTY_OPERATOR_ACTIVITY_LEDGER,
      total_count: 4,
    };
    const triage = buildDiagnoseTriage({ summary, readiness, ledger });
    const registry = buildCortexCommandRegistry({
      summary,
      readiness,
      ledger,
      triage,
    });
    const router = buildWorkbenchActionRouter({
      summary,
      readiness,
      ledger,
      triage,
      registry,
    });
    const s = buildAssessmentPreflightSnapshot(
      inputs({ summary, ledger, triage, registry, router }),
    );
    expect(s.ledger_event_count).toBe(4);
    expect(s.triage_total_count).toBe(triage.total_count);
    expect(s.command_available_count).toBe(registry.available_count);
    expect(s.action_total_count).toBe(router.total_count);
    expect(s.top_action_id).toBe(router.top_action_id);
  });
});
