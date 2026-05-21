/**
 * V1BZ — AssessmentPreflightSnapshot redaction proof.
 */

import { describe, expect, it } from "vitest";
import {
  buildAssessmentPreflightSnapshot,
  type AssessmentPreflightSnapshot,
} from "../assessmentPreflightSnapshot";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../../../state/workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../../../state/assessmentReadiness";
import {
  EMPTY_DIAGNOSE_TRIAGE,
  buildDiagnoseTriage,
} from "../../diagnose/diagnoseTriage";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../../../state/operatorActivityLedger";
import {
  buildWorkbenchActionRouter,
} from "../../../state/workbenchActionRouter";
import {
  buildCortexCommandRegistry,
} from "../../../state/cortexCommandRegistry";

const FORBIDDEN_TOKENS: readonly string[] = [
  "BEGIN RSA PRIVATE KEY",
  "password=hunter2",
  "evidence_set_id",
  "raw_config:",
  "stderr:",
  "```",
  "AKIAIOSFODNN7EXAMPLE",
  "Bearer ey",
];

describe("AssessmentPreflightSnapshot — redaction", () => {
  it("serialized snapshot contains zero forbidden tokens for populated inputs", () => {
    const summary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      discovery: { seed_count: 3, total_seed_count: 3, history_entry_count: 1 },
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 6,
        edge_count: 4,
        environment_id: "prod",
        has_view: true,
      },
      evidence_import: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
        accepted_evidence_total: 5,
        rejected_evidence_total: 1,
        attempted_import_count: 3,
        accepted_import_count: 2,
        rejected_import_count: 1,
      },
      intake: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
        parsed_device_count: 8,
        finding_count: 2,
        parse_status: "parsed" as const,
      },
    };
    const readiness = {
      ...EMPTY_ASSESSMENT_READINESS,
      overall_state: "ready" as const,
      assess_state: "context_ready" as const,
    };
    const ledger = { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 7 };
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
    const s = buildAssessmentPreflightSnapshot({
      summary,
      readiness,
      triage,
      ledger,
      router,
      registry,
      now: () => "2026-05-21T00:00:00.000Z",
    });
    const json = JSON.stringify(s);
    for (const token of FORBIDDEN_TOKENS) {
      expect(json.includes(token)).toBe(false);
    }
  });

  it("snapshot exposes only documented fields", () => {
    const s = buildAssessmentPreflightSnapshot({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      router: buildWorkbenchActionRouter({
        summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        readiness: EMPTY_ASSESSMENT_READINESS,
        triage: EMPTY_DIAGNOSE_TRIAGE,
        ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
        registry: buildCortexCommandRegistry({
          summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          readiness: EMPTY_ASSESSMENT_READINESS,
          triage: EMPTY_DIAGNOSE_TRIAGE,
          ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
        }),
      }),
      registry: buildCortexCommandRegistry({
        summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        readiness: EMPTY_ASSESSMENT_READINESS,
        triage: EMPTY_DIAGNOSE_TRIAGE,
        ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      }),
      now: () => "2026-05-21T00:00:00.000Z",
    });
    const allowed: ReadonlyArray<keyof AssessmentPreflightSnapshot> = [
      "snapshot_id",
      "created_at",
      "overall_state",
      "can_start",
      "assess_state",
      "available_inputs",
      "missing_inputs",
      "blocked_reason_codes",
      "topology_node_count",
      "topology_edge_count",
      "accepted_evidence_total",
      "rejected_evidence_total",
      "parsed_device_count",
      "finding_count",
      "triage_total_count",
      "triage_critical_count",
      "triage_warning_count",
      "ledger_event_count",
      "command_available_count",
      "action_total_count",
      "top_action_id",
      "pipeline_steps",
      "limitations",
    ];
    expect(Object.keys(s).sort()).toEqual([...allowed].sort());
  });

  it("limitations always include the honesty line", () => {
    const s = buildAssessmentPreflightSnapshot({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      router: buildWorkbenchActionRouter({
        summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        readiness: EMPTY_ASSESSMENT_READINESS,
        triage: EMPTY_DIAGNOSE_TRIAGE,
        ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
        registry: buildCortexCommandRegistry({
          summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          readiness: EMPTY_ASSESSMENT_READINESS,
          triage: EMPTY_DIAGNOSE_TRIAGE,
          ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
        }),
      }),
      registry: buildCortexCommandRegistry({
        summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        readiness: EMPTY_ASSESSMENT_READINESS,
        triage: EMPTY_DIAGNOSE_TRIAGE,
        ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      }),
      reportDraftAvailable: true,
      now: () => "2026-05-21T00:00:00.000Z",
    });
    expect(s.limitations).toContain("No assessment execution has run yet.");
    expect(s.limitations).toContain("No compliance scan has run.");
    expect(s.limitations).toContain("No live polling or SNMP has run.");
  });
});
