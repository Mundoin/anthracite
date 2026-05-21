/**
 * V1CF — OperatorSessionExport comprehensive cases.
 */

import { describe, expect, it } from "vitest";
import { buildOperatorSessionExport } from "../operatorSessionExport";
import {
  EMPTY_WORKBENCH_CONTEXT_SUMMARY,
  type WorkbenchContextSummary,
} from "../workbenchContextSummary";
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

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

function buildAllFromSummary(summary: WorkbenchContextSummary) {
  const readiness = EMPTY_ASSESSMENT_READINESS;
  const ledger = EMPTY_OPERATOR_ACTIVITY_LEDGER;
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

describe("OperatorSessionExport — behavior", () => {
  it("populated context surfaces environment + readiness + triage + activity summaries", () => {
    const summary: WorkbenchContextSummary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      discovery: { seed_count: 3, total_seed_count: 3, history_entry_count: 0 },
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
        attempted_import_count: 1,
        accepted_import_count: 1,
      },
    };
    const e = buildAllFromSummary(summary);
    expect(e.environment.environment_id).toBe("prod");
    expect(e.cortex.command_total_count).toBeGreaterThan(0);
    expect(e.capabilities.total_modes).toBe(8);
    expect(e.actions.total_count).toBeGreaterThan(0);
  });

  it("markdown is deterministic for identical inputs", () => {
    const a = buildAllFromSummary(EMPTY_WORKBENCH_CONTEXT_SUMMARY);
    const b = buildAllFromSummary(EMPTY_WORKBENCH_CONTEXT_SUMMARY);
    expect(a.markdown).toBe(b.markdown);
    expect(a.json_summary).toEqual(b.json_summary);
  });

  it("json_summary mirrors key counts and states", () => {
    const summary: WorkbenchContextSummary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        environment_id: "lab",
        node_count: 2,
      },
    };
    const e = buildAllFromSummary(summary);
    expect(e.json_summary.environment_id).toBe("lab");
    expect(e.json_summary.command_available_count).toBe(
      e.cortex.command_available_count,
    );
    expect(e.json_summary.capability_available_count).toBe(
      e.capabilities.available_count,
    );
  });

  it("build block exposes counts only (no preview leakage in block fields)", () => {
    const summary: WorkbenchContextSummary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      topology: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
        node_count: 3,
        edge_count: 2,
      },
    };
    const e = buildAllFromSummary(summary);
    for (const d of e.build.drafts) {
      const keys = Object.keys(d);
      expect(keys).toContain("preview_line_count");
      // Block must not carry generated_preview_lines directly
      expect(keys.includes("generated_preview_lines")).toBe(false);
    }
  });

  it("triage findings expose severity/title/reason_code only", () => {
    const summary: WorkbenchContextSummary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      evidence_import: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
        accepted_evidence_total: 3,
      },
    };
    const e = buildAllFromSummary(summary);
    for (const f of e.triage.findings) {
      expect(Object.keys(f).sort()).toEqual(
        ["reason_code", "severity", "title"].sort(),
      );
    }
  });

  it("export_id derives from profile by default and accepts override", () => {
    const e = buildAllFromSummary(EMPTY_WORKBENCH_CONTEXT_SUMMARY);
    expect(e.export_id.startsWith("session-")).toBe(true);

    const summary = EMPTY_WORKBENCH_CONTEXT_SUMMARY;
    const readiness = EMPTY_ASSESSMENT_READINESS;
    const ledger = EMPTY_OPERATOR_ACTIVITY_LEDGER;
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
    const custom = buildOperatorSessionExport({
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
      now: () => "2099-01-01T00:00:00.000Z",
      idFactory: () => "custom-export-id",
    });
    expect(custom.export_id).toBe("custom-export-id");
    expect(custom.created_at).toBe("2099-01-01T00:00:00.000Z");
  });

  it("capabilities block mode summary includes per-state counts", () => {
    const e = buildAllFromSummary(EMPTY_WORKBENCH_CONTEXT_SUMMARY);
    for (const m of e.capabilities.modes) {
      expect(typeof m.available_tool_count).toBe("number");
      expect(typeof m.deferred_tool_count).toBe("number");
      expect(typeof m.blocked_tool_count).toBe("number");
    }
  });
});
