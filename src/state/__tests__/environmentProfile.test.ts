/**
 * V1CD — EnvironmentProfile comprehensive cases.
 */

import { describe, expect, it } from "vitest";
import {
  buildEnvironmentProfile,
  type BuildEnvironmentProfileInputs,
} from "../environmentProfile";
import {
  EMPTY_WORKBENCH_CONTEXT_SUMMARY,
  type WorkbenchContextSummary,
} from "../workbenchContextSummary";
import {
  EMPTY_ASSESSMENT_READINESS,
  type AssessmentReadiness,
} from "../assessmentReadiness";
import {
  EMPTY_OPERATOR_ACTIVITY_LEDGER,
  type OperatorActivityLedger,
} from "../operatorActivityLedger";
import {
  EMPTY_DIAGNOSE_TRIAGE,
  buildDiagnoseTriage,
  type DiagnoseTriage,
} from "../../modes/diagnose/diagnoseTriage";
import {
  EMPTY_WORKBENCH_ACTION_ROUTER,
  buildWorkbenchActionRouter,
  type WorkbenchActionRouter,
} from "../workbenchActionRouter";
import {
  EMPTY_TOPOLOGY_CONSTRUCT,
  type TopologyConstruct,
} from "../../modes/topology/topologyConstructModel";
import { EMPTY_BUILD_INTENT_WORKSPACE } from "../../modes/build/buildIntentWorkspace";
import { EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT } from "../../modes/assess/assessmentPreflightSnapshot";
import { buildCortexCommandRegistry } from "../cortexCommandRegistry";

function inputs(
  o: Partial<{
    summary: WorkbenchContextSummary;
    readiness: AssessmentReadiness;
    ledger: OperatorActivityLedger;
    triage: DiagnoseTriage;
    router: WorkbenchActionRouter;
    construct: TopologyConstruct;
    environmentIdOverride: string | null;
  }>,
): BuildEnvironmentProfileInputs {
  return {
    summary: o.summary ?? EMPTY_WORKBENCH_CONTEXT_SUMMARY,
    readiness: o.readiness ?? EMPTY_ASSESSMENT_READINESS,
    ledger: o.ledger ?? EMPTY_OPERATOR_ACTIVITY_LEDGER,
    triage: o.triage ?? EMPTY_DIAGNOSE_TRIAGE,
    router: o.router ?? EMPTY_WORKBENCH_ACTION_ROUTER,
    construct: o.construct ?? EMPTY_TOPOLOGY_CONSTRUCT,
    build: EMPTY_BUILD_INTENT_WORKSPACE,
    preflight: EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT,
    environmentIdOverride: o.environmentIdOverride,
  };
}

describe("EnvironmentProfile — behavior", () => {
  it("topology env id produces stable environment_id/display_label", () => {
    const p = buildEnvironmentProfile(
      inputs({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          topology: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
            environment_id: "prod-core",
          },
        },
      }),
    );
    expect(p.environment_id).toBe("prod-core");
    expect(p.display_label).toBe("Environment: prod-core");
  });

  it("environmentIdOverride takes precedence", () => {
    const p = buildEnvironmentProfile(
      inputs({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          topology: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
            environment_id: "prod",
          },
        },
        environmentIdOverride: "explicit-env",
      }),
    );
    expect(p.environment_id).toBe("explicit-env");
  });

  it("ready readiness produces active profile", () => {
    const p = buildEnvironmentProfile(
      inputs({
        readiness: { ...EMPTY_ASSESSMENT_READINESS, overall_state: "ready" },
      }),
    );
    expect(p.profile_state).toBe("active");
  });

  it("topology nodes alone push profile to active", () => {
    const p = buildEnvironmentProfile(
      inputs({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          topology: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
            node_count: 3,
          },
        },
      }),
    );
    expect(p.profile_state).toBe("active");
  });

  it("blocked readiness produces blocked profile", () => {
    const p = buildEnvironmentProfile(
      inputs({
        readiness: { ...EMPTY_ASSESSMENT_READINESS, overall_state: "blocked" },
      }),
    );
    expect(p.profile_state).toBe("blocked");
  });

  it("critical triage produces blocked profile (overrides active signal)", () => {
    const summary: WorkbenchContextSummary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      evidence_import: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
        accepted_evidence_total: 3,
      },
    };
    const triage = buildDiagnoseTriage({
      summary,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    });
    expect(triage.critical_count).toBeGreaterThan(0);
    const p = buildEnvironmentProfile(inputs({ summary, triage }));
    expect(p.profile_state).toBe("blocked");
  });

  it("seed-only context produces partial profile", () => {
    const p = buildEnvironmentProfile(
      inputs({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          discovery: { seed_count: 2, total_seed_count: 2, history_entry_count: 0 },
        },
      }),
    );
    expect(p.profile_state).toBe("partial");
  });

  it("ledger last_event fields surface safely", () => {
    const ledger: OperatorActivityLedger = {
      ...EMPTY_OPERATOR_ACTIVITY_LEDGER,
      total_count: 3,
      last_event_kind: "evidence_import_accepted",
      last_event_at: "2026-05-21T00:00:05Z",
    };
    const p = buildEnvironmentProfile(inputs({ ledger }));
    expect(p.ledger_event_count).toBe(3);
    expect(p.last_activity_kind).toBe("evidence_import_accepted");
    expect(p.last_activity_at).toBe("2026-05-21T00:00:05Z");
  });

  it("top_action_id mirrors router", () => {
    const summary: WorkbenchContextSummary = EMPTY_WORKBENCH_CONTEXT_SUMMARY;
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
    const p = buildEnvironmentProfile(inputs({ router }));
    expect(p.top_action_id).toBe(router.top_action_id);
  });

  it("construct density mirrors topology construct", () => {
    const construct: TopologyConstruct = {
      ...EMPTY_TOPOLOGY_CONSTRUCT,
      layout_hints: {
        ...EMPTY_TOPOLOGY_CONSTRUCT.layout_hints,
        density: "medium",
      },
    };
    const p = buildEnvironmentProfile(inputs({ construct }));
    expect(p.construct_density).toBe("medium");
  });

  it("risk summary mirrors triage counts and primary reason_code", () => {
    const summary: WorkbenchContextSummary = {
      ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      evidence_import: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
        accepted_evidence_total: 3,
      },
    };
    const triage = buildDiagnoseTriage({
      summary,
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    });
    const p = buildEnvironmentProfile(inputs({ summary, triage }));
    expect(p.risk_summary.critical_count).toBe(triage.critical_count);
    expect(p.risk_summary.warning_count).toBe(triage.warning_count);
    expect(p.risk_summary.info_count).toBe(triage.info_count);
    expect(p.risk_summary.primary_reason_code).toBe(
      triage.findings.find((f) => f.severity === "critical")?.reason_code,
    );
  });

  it("identical inputs produce identical profiles (determinism)", () => {
    const i = inputs({
      summary: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 4,
        },
      },
    });
    const a = buildEnvironmentProfile(i);
    const b = buildEnvironmentProfile(i);
    expect(a).toEqual(b);
  });

  it("device_count is max(parsed_devices, topology_nodes)", () => {
    const p = buildEnvironmentProfile(
      inputs({
        summary: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
          topology: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
            node_count: 5,
          },
          intake: {
            ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
            parsed_device_count: 8,
          },
        },
      }),
    );
    expect(p.device_count).toBe(8);
  });
});
