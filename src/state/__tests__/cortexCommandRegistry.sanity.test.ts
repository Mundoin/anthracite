/**
 * V1BX — Opus sanity check for CortexCommandRegistry contract.
 */

import { describe, expect, it } from "vitest";
import {
  EMPTY_CORTEX_COMMAND_REGISTRY,
  buildCortexCommandRegistry,
  findCortexCommand,
} from "../cortexCommandRegistry";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../operatorActivityLedger";
import { EMPTY_DIAGNOSE_TRIAGE } from "../../modes/diagnose/diagnoseTriage";

describe("CortexCommandRegistry — sanity", () => {
  it("EMPTY constant matches type shape", () => {
    expect(EMPTY_CORTEX_COMMAND_REGISTRY.commands).toEqual([]);
    expect(EMPTY_CORTEX_COMMAND_REGISTRY.total_count).toBe(0);
    expect(EMPTY_CORTEX_COMMAND_REGISTRY.available_count).toBe(0);
    expect(EMPTY_CORTEX_COMMAND_REGISTRY.deferred_count).toBe(0);
    expect(EMPTY_CORTEX_COMMAND_REGISTRY.blocked_count).toBe(0);
  });

  it("EMPTY inputs build a full registry with honest statuses", () => {
    const r = buildCortexCommandRegistry({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      triage: EMPTY_DIAGNOSE_TRIAGE,
    });
    expect(r.total_count).toBeGreaterThan(0);
    expect(r.total_count).toBe(
      r.available_count + r.deferred_count + r.blocked_count,
    );
    expect(r.deferred_count).toBeGreaterThan(0);
    expect(r.blocked_count).toBeGreaterThan(0);
  });

  it("findCortexCommand returns null for unknown id", () => {
    const r = buildCortexCommandRegistry({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      triage: EMPTY_DIAGNOSE_TRIAGE,
    });
    expect(findCortexCommand(r, "does_not_exist")).toBeNull();
    expect(findCortexCommand(r, "open_discovery_seed_planner")?.id).toBe(
      "open_discovery_seed_planner",
    );
  });
});
