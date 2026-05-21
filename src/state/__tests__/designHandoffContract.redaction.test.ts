/**
 * V1CG — DesignHandoffContract redaction proof.
 */

import { describe, expect, it } from "vitest";
import {
  buildDesignHandoffContract,
  type DesignHandoffContract,
} from "../designHandoffContract";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../operatorActivityLedger";
import { buildDiagnoseTriage } from "../../modes/diagnose/diagnoseTriage";
import { buildCortexCommandRegistry } from "../cortexCommandRegistry";
import { buildWorkbenchActionRouter } from "../workbenchActionRouter";
import { buildAssessmentPreflightSnapshot } from "../../modes/assess/assessmentPreflightSnapshot";
import { buildAssessmentReportDraft } from "../../modes/assess/assessmentReportDraft";
import { buildBuildIntentWorkspace } from "../../modes/build/buildIntentWorkspace";
import { EMPTY_TOPOLOGY_CONSTRUCT } from "../../modes/topology/topologyConstructModel";
import { buildEnvironmentProfile } from "../environmentProfile";
import { buildModeCapabilityMatrix } from "../modeCapabilityMatrix";
import { buildOperatorSessionExport } from "../operatorSessionExport";

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

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

function buildPopulatedContract() {
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
      accepted_evidence_total: 5,
      attempted_import_count: 2,
      accepted_import_count: 2,
    },
  };
  const readiness = { ...EMPTY_ASSESSMENT_READINESS, overall_state: "ready" as const };
  const ledger = { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 5 };
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
  const preflight = buildAssessmentPreflightSnapshot({
    summary,
    readiness,
    triage,
    ledger,
    router,
    registry,
    now: () => FIXED_NOW,
    reportDraftAvailable: true,
  });
  const draft = buildAssessmentReportDraft({
    preflight,
    summary,
    readiness,
    triage,
    ledger,
    router,
    registry,
    now: () => FIXED_NOW,
  });
  const build = buildBuildIntentWorkspace({
    summary,
    readiness,
    router,
    registry,
    preflight,
    now: () => FIXED_NOW,
  });
  const profile = buildEnvironmentProfile({
    summary,
    readiness,
    ledger,
    triage,
    router,
    construct: EMPTY_TOPOLOGY_CONSTRUCT,
    build,
    preflight,
  });
  const matrix = buildModeCapabilityMatrix({
    profile,
    summary,
    readiness,
    registry,
    router,
    triage,
    preflight,
    draft,
    build,
    construct: EMPTY_TOPOLOGY_CONSTRUCT,
  });
  const sessionExport = buildOperatorSessionExport({
    profile,
    summary,
    readiness,
    ledger,
    triage,
    registry,
    router,
    preflight,
    draft,
    build,
    construct: EMPTY_TOPOLOGY_CONSTRUCT,
    matrix,
    now: () => FIXED_NOW,
  });
  return buildDesignHandoffContract({
    matrix,
    registry,
    router,
    profile,
    preflight,
    draft,
    build,
    construct: EMPTY_TOPOLOGY_CONSTRUCT,
    triage,
    sessionExport,
    now: () => FIXED_NOW,
  });
}

describe("DesignHandoffContract — redaction", () => {
  it("serialized contract contains zero forbidden tokens", () => {
    const c = buildPopulatedContract();
    const json = JSON.stringify(c);
    for (const token of FORBIDDEN_TOKENS) {
      expect(json.includes(token)).toBe(false);
    }
  });

  it("contract exposes only documented top-level fields", () => {
    const c = buildPopulatedContract();
    const allowed: ReadonlyArray<keyof DesignHandoffContract> = [
      "contract_id",
      "created_at",
      "version",
      "mode_surfaces",
      "tool_surfaces",
      "command_ids",
      "action_ids",
      "readiness_tokens",
      "triage_tokens",
      "activity_event_kinds",
      "capability_states",
      "topology_construct_contract",
      "assess_contract",
      "build_contract",
      "environment_contract",
      "dashboard_cards",
      "limitations",
    ];
    expect(Object.keys(c).sort()).toEqual([...allowed].sort());
  });
});
