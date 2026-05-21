/**
 * V1CE — ModeCapabilityMatrix redaction proof.
 */

import { describe, expect, it } from "vitest";
import {
  buildModeCapabilityMatrix,
  type ModeCapability,
  type ToolCapability,
} from "../modeCapabilityMatrix";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../operatorActivityLedger";
import { buildDiagnoseTriage } from "../../modes/diagnose/diagnoseTriage";
import { buildWorkbenchActionRouter } from "../workbenchActionRouter";
import { buildCortexCommandRegistry } from "../cortexCommandRegistry";
import { buildAssessmentPreflightSnapshot } from "../../modes/assess/assessmentPreflightSnapshot";
import { buildAssessmentReportDraft } from "../../modes/assess/assessmentReportDraft";
import { buildBuildIntentWorkspace } from "../../modes/build/buildIntentWorkspace";
import { EMPTY_TOPOLOGY_CONSTRUCT } from "../../modes/topology/topologyConstructModel";
import { EMPTY_ENVIRONMENT_PROFILE } from "../environmentProfile";

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

function populated() {
  const summary = {
    ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
    discovery: { seed_count: 4, total_seed_count: 4, history_entry_count: 2 },
    crawl_preview: {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.crawl_preview,
      frontier_count: 3,
    },
    topology: {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
      node_count: 6,
      edge_count: 0,
      environment_id: "prod",
      has_view: true,
    },
    evidence_import: {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
      attempted_import_count: 5,
      accepted_import_count: 1,
      rejected_import_count: 4,
      accepted_evidence_total: 2,
      rejected_evidence_total: 9,
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
  };
  const ledger = { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 6 };
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
  return buildModeCapabilityMatrix({
    profile: EMPTY_ENVIRONMENT_PROFILE,
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
}

describe("ModeCapabilityMatrix — redaction", () => {
  it("serialized matrix contains zero forbidden tokens for populated context", () => {
    const m = populated();
    const json = JSON.stringify(m);
    for (const token of FORBIDDEN_TOKENS) {
      expect(json.includes(token)).toBe(false);
    }
  });

  it("each ModeCapability exposes only documented fields", () => {
    const m = populated();
    const allowed: ReadonlyArray<keyof ModeCapability> = [
      "mode",
      "label",
      "state",
      "tools",
      "summary_label",
      "primary_next_action_id",
    ];
    for (const mode of m.modes) {
      expect(Object.keys(mode).sort()).toEqual([...allowed].sort());
    }
  });

  it("each ToolCapability exposes only documented fields", () => {
    const m = populated();
    const allowed: ReadonlyArray<keyof ToolCapability> = [
      "tool_id",
      "label",
      "state",
      "reason_code",
      "backing_command_id",
      "supporting_counts",
    ];
    for (const mode of m.modes) {
      for (const t of mode.tools) {
        expect(Object.keys(t).sort()).toEqual([...allowed].sort());
      }
    }
  });
});
