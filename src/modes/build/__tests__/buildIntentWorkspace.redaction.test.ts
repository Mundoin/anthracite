/**
 * V1CB — BuildIntentWorkspace redaction proof.
 *
 * Proves forbidden tokens never appear in JSON.stringify(workspace) NOR
 * in any preview_lines for populated inputs.
 */

import { describe, expect, it } from "vitest";
import {
  buildBuildIntentWorkspace,
  type BuildIntentDraft,
} from "../buildIntentWorkspace";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../../../state/workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../../../state/assessmentReadiness";
import { EMPTY_WORKBENCH_ACTION_ROUTER } from "../../../state/workbenchActionRouter";
import { EMPTY_CORTEX_COMMAND_REGISTRY } from "../../../state/cortexCommandRegistry";

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

describe("BuildIntentWorkspace — redaction", () => {
  it("serialized workspace contains zero forbidden tokens", () => {
    const w = buildBuildIntentWorkspace({
      summary: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 6,
          edge_count: 5,
          environment_id: "prod",
          has_view: true,
        },
        intake: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
          parsed_device_count: 4,
          current_platform_id: "cisco-ios",
        },
      },
      readiness: EMPTY_ASSESSMENT_READINESS,
      router: EMPTY_WORKBENCH_ACTION_ROUTER,
      registry: EMPTY_CORTEX_COMMAND_REGISTRY,
      now: () => "2026-05-21T00:00:00.000Z",
    });
    const json = JSON.stringify(w);
    for (const token of FORBIDDEN_TOKENS) {
      expect(json.includes(token)).toBe(false);
    }
  });

  it("no preview line contains forbidden tokens", () => {
    const w = buildBuildIntentWorkspace({
      summary: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 3,
          edge_count: 2,
        },
        intake: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
          parsed_device_count: 2,
        },
      },
      readiness: EMPTY_ASSESSMENT_READINESS,
      router: EMPTY_WORKBENCH_ACTION_ROUTER,
      registry: EMPTY_CORTEX_COMMAND_REGISTRY,
      now: () => "2026-05-21T00:00:00.000Z",
    });
    for (const d of w.drafts) {
      for (const line of d.generated_preview_lines) {
        for (const token of FORBIDDEN_TOKENS) {
          expect(line.includes(token)).toBe(false);
        }
      }
    }
  });

  it("draft exposes only documented fields", () => {
    const w = buildBuildIntentWorkspace({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      router: EMPTY_WORKBENCH_ACTION_ROUTER,
      registry: EMPTY_CORTEX_COMMAND_REGISTRY,
      now: () => "2026-05-21T00:00:00.000Z",
    });
    const allowed: ReadonlyArray<keyof BuildIntentDraft> = [
      "draft_id",
      "created_at",
      "intent_type",
      "status",
      "target_vendor",
      "target_platform",
      "source_context",
      "intent_summary",
      "missing_inputs",
      "available_inputs",
      "generated_preview_lines",
      "limitations",
    ];
    for (const d of w.drafts) {
      expect(Object.keys(d).sort()).toEqual([...allowed].sort());
    }
  });
});
