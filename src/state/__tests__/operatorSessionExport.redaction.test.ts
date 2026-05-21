/**
 * V1CF — OperatorSessionExport redaction proof (JSON + markdown).
 */

import { describe, expect, it } from "vitest";
import {
  buildOperatorSessionExport,
  type OperatorSessionExport,
} from "../operatorSessionExport";
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

function buildPopulatedExport() {
  const summary = {
    ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
    discovery: { seed_count: 4, total_seed_count: 4, history_entry_count: 2 },
    crawl_preview: {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.crawl_preview,
      frontier_count: 3,
    },
    topology: {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
      node_count: 5,
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
      parsed_device_count: 6,
      finding_count: 2,
      parse_status: "parsed" as const,
    },
  };
  const readiness = {
    ...EMPTY_ASSESSMENT_READINESS,
    overall_state: "ready" as const,
  };
  const ledger = {
    ...EMPTY_OPERATOR_ACTIVITY_LEDGER,
    total_count: 5,
    last_event_kind: "evidence_import_accepted" as const,
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
  return buildOperatorSessionExport({
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
}

describe("OperatorSessionExport — redaction", () => {
  it("serialized export contains zero forbidden tokens", () => {
    const e = buildPopulatedExport();
    const json = JSON.stringify(e);
    for (const token of FORBIDDEN_TOKENS) {
      expect(json.includes(token)).toBe(false);
    }
  });

  it("rendered markdown contains zero forbidden tokens", () => {
    const e = buildPopulatedExport();
    for (const token of FORBIDDEN_TOKENS) {
      expect(e.markdown.includes(token)).toBe(false);
    }
  });

  it("export exposes only documented top-level fields", () => {
    const e = buildPopulatedExport();
    const allowed: ReadonlyArray<keyof OperatorSessionExport> = [
      "export_id",
      "created_at",
      "title",
      "environment",
      "readiness",
      "activity",
      "triage",
      "cortex",
      "actions",
      "assess",
      "build",
      "topology",
      "capabilities",
      "json_summary",
      "markdown",
      "limitations",
    ];
    expect(Object.keys(e).sort()).toEqual([...allowed].sort());
  });
});
