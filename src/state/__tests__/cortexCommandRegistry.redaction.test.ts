/**
 * V1BX — CortexCommandRegistry redaction proof.
 */

import { describe, expect, it } from "vitest";
import {
  buildCortexCommandRegistry,
  type CortexCommand,
} from "../cortexCommandRegistry";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../operatorActivityLedger";
import { EMPTY_DIAGNOSE_TRIAGE } from "../../modes/diagnose/diagnoseTriage";

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

describe("CortexCommandRegistry — redaction", () => {
  it("serialized registry contains zero forbidden tokens", () => {
    const r = buildCortexCommandRegistry({
      summary: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: { seed_count: 3, total_seed_count: 3, history_entry_count: 1 },
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          environment_id: "prod",
          has_view: true,
          node_count: 5,
          edge_count: 4,
        },
      },
      readiness: { ...EMPTY_ASSESSMENT_READINESS, overall_state: "ready" },
      ledger: { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 4 },
      triage: { ...EMPTY_DIAGNOSE_TRIAGE, total_count: 1 },
    });
    const json = JSON.stringify(r);
    for (const token of FORBIDDEN_TOKENS) {
      expect(json.includes(token)).toBe(false);
    }
  });

  it("each command exposes only documented fields", () => {
    const r = buildCortexCommandRegistry({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      triage: EMPTY_DIAGNOSE_TRIAGE,
    });
    const allowed: ReadonlyArray<keyof CortexCommand> = [
      "id",
      "label",
      "mode",
      "target_tool_id",
      "status",
      "reason_code",
      "required_signals",
      "summary_label",
      "priority",
    ];
    for (const c of r.commands) {
      expect(Object.keys(c).sort()).toEqual([...allowed].sort());
    }
  });
});
