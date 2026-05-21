/**
 * V1BY — WorkbenchActionRouter redaction proof.
 */

import { describe, expect, it } from "vitest";
import {
  buildWorkbenchActionRouter,
  type WorkbenchAction,
} from "../workbenchActionRouter";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../operatorActivityLedger";
import {
  EMPTY_DIAGNOSE_TRIAGE,
  buildDiagnoseTriage,
} from "../../modes/diagnose/diagnoseTriage";
import { buildCortexCommandRegistry } from "../cortexCommandRegistry";

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

describe("WorkbenchActionRouter — redaction", () => {
  it("serialized router contains zero forbidden tokens", () => {
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
      overall_state: "blocked" as const,
    };
    const ledger = { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 6 };
    const triage = buildDiagnoseTriage({ summary, readiness, ledger });
    const registry = buildCortexCommandRegistry({
      summary,
      readiness,
      ledger,
      triage,
    });
    const r = buildWorkbenchActionRouter({
      summary,
      readiness,
      ledger,
      triage,
      registry,
    });
    const json = JSON.stringify(r);
    for (const token of FORBIDDEN_TOKENS) {
      expect(json.includes(token)).toBe(false);
    }
    expect(r.actions.length).toBeGreaterThan(0);
  });

  it("each action exposes only documented fields", () => {
    const registry = buildCortexCommandRegistry({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      triage: EMPTY_DIAGNOSE_TRIAGE,
    });
    const r = buildWorkbenchActionRouter({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      registry,
    });
    const allowed: ReadonlyArray<keyof WorkbenchAction> = [
      "id",
      "label",
      "source",
      "target_mode",
      "target_tool_id",
      "command_id",
      "priority",
      "status",
      "reason_code",
      "supporting_counts",
    ];
    for (const a of r.actions) {
      expect(Object.keys(a).sort()).toEqual([...allowed].sort());
    }
  });

  it("supporting_counts values are all numeric", () => {
    const summary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      crawl_preview: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.crawl_preview,
        frontier_count: 2,
      },
    };
    const registry = buildCortexCommandRegistry({
      summary,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      triage: EMPTY_DIAGNOSE_TRIAGE,
    });
    const r = buildWorkbenchActionRouter({
      summary,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      registry,
    });
    for (const a of r.actions) {
      for (const v of Object.values(a.supporting_counts)) {
        expect(typeof v).toBe("number");
      }
    }
  });
});
