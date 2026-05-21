/**
 * V1BY — WorkbenchActionRouter integrity.
 *
 * Proves every emitted action.command_id is present in the
 * CortexCommandRegistry (no dangling refs).
 */

import { describe, expect, it } from "vitest";
import { buildWorkbenchActionRouter } from "../workbenchActionRouter";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../operatorActivityLedger";
import {
  EMPTY_DIAGNOSE_TRIAGE,
  buildDiagnoseTriage,
} from "../../modes/diagnose/diagnoseTriage";
import {
  buildCortexCommandRegistry,
  findCortexCommand,
} from "../cortexCommandRegistry";

describe("WorkbenchActionRouter — integrity", () => {
  it("every action.command_id exists in the CortexCommandRegistry (empty)", () => {
    const registry = buildCortexCommandRegistry({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      triage: EMPTY_DIAGNOSE_TRIAGE,
    });
    const router = buildWorkbenchActionRouter({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      registry,
    });
    for (const a of router.actions) {
      if (a.command_id !== null) {
        expect(findCortexCommand(registry, a.command_id)).not.toBeNull();
      }
    }
  });

  it("every action.command_id exists in the registry (populated)", () => {
    const summary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      discovery: { seed_count: 2, total_seed_count: 2, history_entry_count: 1 },
      crawl_preview: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.crawl_preview,
        frontier_count: 3,
      },
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 4,
        edge_count: 0,
        environment_id: "prod",
        has_view: true,
      },
      evidence_import: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
        accepted_evidence_total: 1,
        attempted_import_count: 2,
        accepted_import_count: 1,
        rejected_import_count: 1,
      },
      intake: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
        parsed_device_count: 2,
        parse_status: "parsed" as const,
      },
    };
    const readiness = {
      ...EMPTY_ASSESSMENT_READINESS,
      overall_state: "partial" as const,
    };
    const ledger = { ...EMPTY_OPERATOR_ACTIVITY_LEDGER, total_count: 3 };
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
    for (const a of router.actions) {
      if (a.command_id !== null) {
        expect(
          findCortexCommand(registry, a.command_id),
          `dangling command_id: ${a.command_id}`,
        ).not.toBeNull();
      }
    }
  });

  it("action status follows registry command status", () => {
    // Empty summary → open_crawl_preview command is blocked.
    // If the router emits an action with that command_id, action.status
    // must inherit blocked from the registry.
    const summary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      discovery: { seed_count: 1, total_seed_count: 1, history_entry_count: 0 },
    };
    // Force blocked open_crawl_preview by emptying seeds in the registry
    // build but keeping the action emit. Use a registry built from EMPTY
    // (no seeds) while router sees seeds (so build_crawl_preview emits).
    const emptyRegistry = buildCortexCommandRegistry({
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      triage: EMPTY_DIAGNOSE_TRIAGE,
    });
    const router = buildWorkbenchActionRouter({
      summary,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      registry: emptyRegistry,
    });
    const action = router.actions.find(
      (a) => a.command_id === "open_crawl_preview",
    );
    expect(action).toBeDefined();
    expect(action?.status).toBe("blocked");
  });
});
