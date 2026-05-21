/**
 * V1CG — DesignHandoffContract comprehensive cases.
 */

import { describe, expect, it } from "vitest";
import {
  buildDesignHandoffContract,
} from "../designHandoffContract";
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
import { buildOperatorSessionExport } from "../operatorSessionExport";

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

function buildAll(summary: WorkbenchContextSummary = EMPTY_WORKBENCH_CONTEXT_SUMMARY) {
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
  const sessionExport = buildOperatorSessionExport({
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
  const contract = buildDesignHandoffContract({
    matrix,
    registry,
    router,
    profile,
    preflight,
    draft,
    build,
    construct: EMPTY_TOPOLOGY_CONSTRUCT,
    triage,
    sessionExport,
    now: () => FIXED_NOW,
  });
  return { contract, matrix, registry, router };
}

describe("DesignHandoffContract — behavior", () => {
  it("contract exposes all tool ids from the matrix", () => {
    const { contract, matrix } = buildAll();
    const matrixToolIds = new Set<string>();
    for (const m of matrix.modes) {
      for (const t of m.tools) matrixToolIds.add(t.tool_id);
    }
    const contractToolIds = new Set(
      contract.tool_surfaces.map((t) => t.tool_id),
    );
    for (const id of matrixToolIds) {
      expect(contractToolIds.has(id)).toBe(true);
    }
  });

  it("contract includes command IDs from registry", () => {
    const { contract, registry } = buildAll();
    expect(contract.command_ids).toEqual(registry.commands.map((c) => c.id));
  });

  it("contract includes action IDs from router", () => {
    const { contract, router } = buildAll();
    expect(contract.action_ids).toEqual(router.actions.map((a) => a.id));
  });

  it("topology construct contract exposes expected field names + density/3d/minimap", () => {
    const { contract } = buildAll();
    expect(contract.topology_construct_contract.node_fields).toContain("id");
    expect(contract.topology_construct_contract.node_fields).toContain("risk_level");
    expect(contract.topology_construct_contract.link_fields).toContain("source_node_id");
    expect(contract.topology_construct_contract.cluster_fields).toContain("node_ids");
    expect(contract.topology_construct_contract.layer_fields).toContain("visible_by_default");
    expect(contract.topology_construct_contract.risk_flag_fields).toContain("severity");
    expect(contract.topology_construct_contract.layout_hint_fields).toContain("density");
    expect(contract.topology_construct_contract.density).toBe("empty");
    expect(contract.topology_construct_contract.supports_3d).toBe(false);
  });

  it("dashboard cards include all required card IDs", () => {
    const { contract } = buildAll();
    const required = [
      "environment_profile",
      "readiness",
      "top_action",
      "diagnose_triage",
      "operator_activity",
      "topology_construct",
      "assess_preflight",
      "report_draft",
      "build_intent",
      "capability_matrix",
    ];
    const cardIds = contract.dashboard_cards.map((c) => c.id);
    for (const id of required) {
      expect(cardIds).toContain(id);
    }
    expect(contract.dashboard_cards.length).toBe(required.length);
  });

  it("readiness/triage/activity/capability token sets are complete", () => {
    const { contract } = buildAll();
    expect(contract.readiness_tokens).toEqual([
      "empty",
      "partial",
      "ready",
      "blocked",
    ]);
    expect(contract.triage_tokens).toEqual(["info", "warning", "critical"]);
    expect(contract.capability_states).toEqual([
      "available",
      "partial",
      "deferred",
      "blocked",
    ]);
    expect(contract.activity_event_kinds).toContain("evidence_import_accepted");
    expect(contract.activity_event_kinds).toContain("assess_readiness_generated");
  });

  it("assess contract reports honesty_lines_present + can_start", () => {
    const { contract } = buildAll();
    expect(contract.assess_contract.honesty_lines_present).toBe(true);
    expect(typeof contract.assess_contract.can_start).toBe("boolean");
    expect(contract.assess_contract.report_draft_sections).toContain(
      "executive_summary",
    );
  });

  it("build contract reports 5 intent types and receipt_fields + limitations_present", () => {
    const { contract } = buildAll();
    expect(contract.build_contract.intent_types).toEqual([
      "interface_intent",
      "vlan_intent",
      "routing_intent",
      "acl_intent",
      "site_link_intent",
    ]);
    expect(contract.build_contract.receipt_fields).toContain("receipt_id");
    expect(contract.build_contract.limitations_present).toBe(true);
  });

  it("environment contract exposes profile + risk_summary fields + profile_state", () => {
    const { contract } = buildAll();
    expect(contract.environment_contract.profile_fields).toContain(
      "environment_id",
    );
    expect(contract.environment_contract.profile_fields).toContain("risk_summary");
    expect(contract.environment_contract.risk_summary_fields).toContain(
      "primary_reason_code",
    );
    expect(contract.environment_contract.profile_state).toBe("empty");
  });

  it("identical inputs produce identical contracts (determinism)", () => {
    const a = buildAll().contract;
    const b = buildAll().contract;
    expect(a).toEqual(b);
  });
});
