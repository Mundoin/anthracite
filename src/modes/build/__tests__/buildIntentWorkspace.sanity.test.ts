/**
 * V1CB — Opus sanity check for BuildIntentWorkspace contract.
 */

import { describe, expect, it } from "vitest";
import {
  BUILD_HONESTY_LIMITATIONS,
  EMPTY_BUILD_INTENT_WORKSPACE,
  buildBuildIntentWorkspace,
} from "../buildIntentWorkspace";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../../../state/workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../../../state/assessmentReadiness";
import { EMPTY_WORKBENCH_ACTION_ROUTER } from "../../../state/workbenchActionRouter";
import { EMPTY_CORTEX_COMMAND_REGISTRY } from "../../../state/cortexCommandRegistry";

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

describe("BuildIntentWorkspace — sanity", () => {
  it("EMPTY constant carries honesty limitations", () => {
    expect(EMPTY_BUILD_INTENT_WORKSPACE.limitations).toEqual(
      BUILD_HONESTY_LIMITATIONS,
    );
  });

  it("empty inputs produce 5 drafts with blocked/deferred statuses + matching receipts", () => {
    const w = buildBuildIntentWorkspace({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      router: EMPTY_WORKBENCH_ACTION_ROUTER,
      registry: EMPTY_CORTEX_COMMAND_REGISTRY,
      now: () => FIXED_NOW,
    });
    expect(w.total_count).toBe(5);
    expect(w.drafts.length).toBe(5);
    expect(w.receipts.length).toBe(5);
    expect(w.partial_count).toBe(0);
    expect(w.blocked_count + w.deferred_count).toBe(5);
    for (const d of w.drafts) {
      expect(d.limitations).toEqual(BUILD_HONESTY_LIMITATIONS);
      expect(d.created_at).toBe(FIXED_NOW);
    }
  });

  it("limitations always include the no-deploy line", () => {
    const w = buildBuildIntentWorkspace({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      router: EMPTY_WORKBENCH_ACTION_ROUTER,
      registry: EMPTY_CORTEX_COMMAND_REGISTRY,
      now: () => FIXED_NOW,
    });
    expect(w.limitations).toContain("No deploy has run.");
  });
});
