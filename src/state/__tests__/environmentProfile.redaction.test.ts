/**
 * V1CD — EnvironmentProfile redaction proof.
 */

import { describe, expect, it } from "vitest";
import {
  buildEnvironmentProfile,
  type EnvironmentProfile,
} from "../environmentProfile";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../operatorActivityLedger";
import { buildDiagnoseTriage } from "../../modes/diagnose/diagnoseTriage";
import { buildWorkbenchActionRouter } from "../workbenchActionRouter";
import { buildCortexCommandRegistry } from "../cortexCommandRegistry";
import { EMPTY_TOPOLOGY_CONSTRUCT } from "../../modes/topology/topologyConstructModel";
import { EMPTY_BUILD_INTENT_WORKSPACE } from "../../modes/build/buildIntentWorkspace";
import { EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT } from "../../modes/assess/assessmentPreflightSnapshot";

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

describe("EnvironmentProfile — redaction", () => {
  it("serialized profile contains zero forbidden tokens for populated inputs", () => {
    const summary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      discovery: { seed_count: 3, total_seed_count: 3, history_entry_count: 1 },
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 4,
        edge_count: 2,
        environment_id: "prod",
        has_view: true,
      },
      evidence_import: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
        attempted_import_count: 3,
        accepted_import_count: 1,
        rejected_import_count: 2,
        accepted_evidence_total: 2,
        rejected_evidence_total: 5,
      },
      intake: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
        parsed_device_count: 5,
        finding_count: 1,
      },
    };
    const readiness = {
      ...EMPTY_ASSESSMENT_READINESS,
      overall_state: "ready" as const,
    };
    const ledger = {
      ...EMPTY_OPERATOR_ACTIVITY_LEDGER,
      total_count: 4,
      last_event_kind: "evidence_import_accepted" as const,
      last_event_at: "2026-05-21T00:00:00Z",
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
    const p = buildEnvironmentProfile({
      summary,
      readiness,
      ledger,
      triage,
      router,
      construct: EMPTY_TOPOLOGY_CONSTRUCT,
      build: EMPTY_BUILD_INTENT_WORKSPACE,
      preflight: EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT,
    });
    const json = JSON.stringify(p);
    for (const token of FORBIDDEN_TOKENS) {
      expect(json.includes(token)).toBe(false);
    }
  });

  it("profile exposes only documented fields", () => {
    const p = buildEnvironmentProfile({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      triage: buildDiagnoseTriage({
        summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        readiness: EMPTY_ASSESSMENT_READINESS,
        ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      }),
      router: buildWorkbenchActionRouter({
        summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        readiness: EMPTY_ASSESSMENT_READINESS,
        ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
        triage: buildDiagnoseTriage({
          summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          readiness: EMPTY_ASSESSMENT_READINESS,
          ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
        }),
        registry: buildCortexCommandRegistry({
          summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          readiness: EMPTY_ASSESSMENT_READINESS,
          ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
          triage: buildDiagnoseTriage({
            summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
            readiness: EMPTY_ASSESSMENT_READINESS,
            ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
          }),
        }),
      }),
      construct: EMPTY_TOPOLOGY_CONSTRUCT,
      build: EMPTY_BUILD_INTENT_WORKSPACE,
      preflight: EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT,
    });
    const allowed: ReadonlyArray<keyof EnvironmentProfile> = [
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
    expect(Object.keys(p).sort()).toEqual([...allowed].sort());
  });
});
