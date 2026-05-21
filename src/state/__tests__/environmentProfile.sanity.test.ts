/**
 * V1CD — Opus sanity check for EnvironmentProfile contract.
 */

import { describe, expect, it } from "vitest";
import {
  ENVIRONMENT_PROFILE_LIMITATIONS,
  EMPTY_ENVIRONMENT_PROFILE,
  buildEnvironmentProfile,
} from "../environmentProfile";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../operatorActivityLedger";
import { EMPTY_DIAGNOSE_TRIAGE } from "../../modes/diagnose/diagnoseTriage";
import { EMPTY_WORKBENCH_ACTION_ROUTER } from "../workbenchActionRouter";
import { EMPTY_TOPOLOGY_CONSTRUCT } from "../../modes/topology/topologyConstructModel";
import { EMPTY_BUILD_INTENT_WORKSPACE } from "../../modes/build/buildIntentWorkspace";
import { EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT } from "../../modes/assess/assessmentPreflightSnapshot";

function emptyInputs() {
  return {
    summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
    readiness: EMPTY_ASSESSMENT_READINESS,
    ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    triage: EMPTY_DIAGNOSE_TRIAGE,
    router: EMPTY_WORKBENCH_ACTION_ROUTER,
    construct: EMPTY_TOPOLOGY_CONSTRUCT,
    build: EMPTY_BUILD_INTENT_WORKSPACE,
    preflight: EMPTY_ASSESSMENT_PREFLIGHT_SNAPSHOT,
  };
}

describe("EnvironmentProfile — sanity", () => {
  it("EMPTY constant carries honesty limitations", () => {
    expect(EMPTY_ENVIRONMENT_PROFILE.limitations).toEqual(
      ENVIRONMENT_PROFILE_LIMITATIONS,
    );
    expect(EMPTY_ENVIRONMENT_PROFILE.environment_id).toBe("local");
    expect(EMPTY_ENVIRONMENT_PROFILE.profile_state).toBe("empty");
  });

  it("empty inputs produce local empty profile", () => {
    const p = buildEnvironmentProfile(emptyInputs());
    expect(p.environment_id).toBe("local");
    expect(p.display_label).toBe("Environment: local");
    expect(p.profile_state).toBe("empty");
    expect(p.limitations).toEqual(ENVIRONMENT_PROFILE_LIMITATIONS);
  });

  it("limitations always include the local-context line", () => {
    const p = buildEnvironmentProfile(emptyInputs());
    expect(p.limitations).toContain(
      "Profile is derived from local workbench context.",
    );
  });
});
