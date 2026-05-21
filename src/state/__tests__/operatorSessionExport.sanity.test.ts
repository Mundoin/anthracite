/**
 * V1CF — Opus sanity check for OperatorSessionExport contract.
 */

import { describe, expect, it } from "vitest";
import {
  SESSION_EXPORT_LIMITATIONS,
  buildOperatorSessionExport,
} from "../operatorSessionExport";
import { EMPTY_ENVIRONMENT_PROFILE } from "../environmentProfile";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../operatorActivityLedger";
import { EMPTY_DIAGNOSE_TRIAGE } from "../../modes/diagnose/diagnoseTriage";
import { EMPTY_CORTEX_COMMAND_REGISTRY } from "../cortexCommandRegistry";
import { EMPTY_WORKBENCH_ACTION_ROUTER } from "../workbenchActionRouter";
import { EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT } from "../../modes/assess/assessmentPreflightSnapshot";
import { EMPTY_ASSESSMENT_REPORT_DRAFT } from "../../modes/assess/assessmentReportDraft";
import { EMPTY_BUILD_INTENT_WORKSPACE } from "../../modes/build/buildIntentWorkspace";
import { EMPTY_TOPOLOGY_CONSTRUCT } from "../../modes/topology/topologyConstructModel";
import { EMPTY_MODE_CAPABILITY_MATRIX } from "../modeCapabilityMatrix";

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

function emptyInputs() {
  return {
    profile: EMPTY_ENVIRONMENT_PROFILE,
    summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
    readiness: EMPTY_ASSESSMENT_READINESS,
    ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    triage: EMPTY_DIAGNOSE_TRIAGE,
    registry: EMPTY_CORTEX_COMMAND_REGISTRY,
    router: EMPTY_WORKBENCH_ACTION_ROUTER,
    preflight: EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT,
    draft: EMPTY_ASSESSMENT_REPORT_DRAFT,
    build: EMPTY_BUILD_INTENT_WORKSPACE,
    construct: EMPTY_TOPOLOGY_CONSTRUCT,
    matrix: EMPTY_MODE_CAPABILITY_MATRIX,
    now: () => FIXED_NOW,
  };
}

describe("OperatorSessionExport — sanity", () => {
  it("empty inputs produce export with all blocks and limitations", () => {
    const e = buildOperatorSessionExport(emptyInputs());
    expect(e.title).toBe("Operator Session Export");
    expect(e.environment.environment_id).toBe("local");
    expect(e.readiness.overall_state).toBe("empty");
    expect(e.activity.total_count).toBe(0);
    expect(e.triage.total_count).toBe(0);
    expect(e.cortex.command_total_count).toBe(0);
    expect(e.actions.total_count).toBe(0);
    expect(e.topology.node_count).toBe(0);
    expect(e.capabilities.total_modes).toBe(0);
    expect(e.limitations).toEqual(SESSION_EXPORT_LIMITATIONS);
    expect(e.created_at).toBe(FIXED_NOW);
  });

  it("markdown begins with title and contains every section heading", () => {
    const e = buildOperatorSessionExport(emptyInputs());
    expect(e.markdown.startsWith("# Operator Session Export")).toBe(true);
    const headings = [
      "## Environment",
      "## Readiness",
      "## Activity",
      "## Triage",
      "## Cortex Commands",
      "## Actions",
      "## Assess",
      "## Build",
      "## Topology Construct",
      "## Capabilities",
      "## Limitations",
    ];
    let lastIdx = -1;
    for (const h of headings) {
      const idx = e.markdown.indexOf(h);
      expect(idx).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });

  it("limitations always include the local-projections honesty line", () => {
    const e = buildOperatorSessionExport(emptyInputs());
    expect(e.limitations).toContain(
      "Export is generated from local App-owned workbench projections.",
    );
  });
});
