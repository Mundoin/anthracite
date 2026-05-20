import { describe, expect, it } from "vitest";
import {
  buildAssessPipelinePlan,
  toAssessPipelinePlanMarkdown,
  type AssessProfile,
  type AssessProfileCounts,
} from "../assessPipelinePlanner";

function emptyProfile(): AssessProfile {
  return {
    label: "test-profile",
    seed_source: "manual",
    include_snmp_poll: false,
    include_config_pull: false,
    include_compliance_scan: false,
    include_topology_map: false,
    include_anomaly_flag: false,
    include_report_export: false,
    credential_profile_label: "",
    snmp_profile_label: "",
    rule_pack_label: "",
    report_profile_label: "",
  };
}

function emptyCounts(): AssessProfileCounts {
  return {
    seed_count: 0,
    expected_devices: 0,
    known_platforms: 0,
  };
}

describe("assessPipelinePlanner — model", () => {
  it("empty profile (no includes, no seeds) → next_action add_seeds", () => {
    const plan = buildAssessPipelinePlan(emptyProfile(), emptyCounts(), "2026-05-20T00:00:00Z");
    expect(plan.next_action).toBe("add_seeds");
  });

  it("seeds present, no includes → all optional steps skipped, next_action ready_for_future_assessment_run", () => {
    const profile = emptyProfile();
    const counts = { seed_count: 3, expected_devices: 0, known_platforms: 0 };
    const plan = buildAssessPipelinePlan(profile, counts, "2026-05-20T00:00:00Z");

    expect(plan.next_action).toBe("ready_for_future_assessment_run");

    // optional steps should be skipped
    const snmpStep = plan.steps.find((s) => s.id === "snmp_poll");
    expect(snmpStep?.readiness).toBe("skipped");

    const configStep = plan.steps.find((s) => s.id === "config_pull");
    expect(configStep?.readiness).toBe("skipped");

    const complianceStep = plan.steps.find((s) => s.id === "compliance_scan");
    expect(complianceStep?.readiness).toBe("skipped");
  });

  it("include_config_pull true, no creds → attach_credentials + step missing_input", () => {
    const profile = emptyProfile();
    profile.include_config_pull = true;
    const counts = { seed_count: 3, expected_devices: 0, known_platforms: 0 };
    const plan = buildAssessPipelinePlan(profile, counts, "2026-05-20T00:00:00Z");

    expect(plan.next_action).toBe("attach_credentials");

    const configStep = plan.steps.find((s) => s.id === "config_pull");
    expect(configStep?.readiness).toBe("missing_input");
    expect(configStep?.missing_inputs).toContain("Credential profile label");
  });

  it("include_snmp_poll true, no snmp profile → attach_snmp_profile", () => {
    const profile = emptyProfile();
    profile.include_snmp_poll = true;
    const counts = { seed_count: 3, expected_devices: 0, known_platforms: 0 };
    const plan = buildAssessPipelinePlan(profile, counts, "2026-05-20T00:00:00Z");

    expect(plan.next_action).toBe("attach_snmp_profile");

    const snmpStep = plan.steps.find((s) => s.id === "snmp_poll");
    expect(snmpStep?.readiness).toBe("missing_input");
    expect(snmpStep?.missing_inputs).toContain("SNMP profile label");
  });

  it("include_compliance_scan true, no rule pack → choose_rule_pack", () => {
    const profile = emptyProfile();
    profile.include_compliance_scan = true;
    const counts = { seed_count: 3, expected_devices: 0, known_platforms: 0 };
    const plan = buildAssessPipelinePlan(profile, counts, "2026-05-20T00:00:00Z");

    expect(plan.next_action).toBe("choose_rule_pack");

    const complianceStep = plan.steps.find((s) => s.id === "compliance_scan");
    expect(complianceStep?.readiness).toBe("missing_input");
    expect(complianceStep?.missing_inputs).toContain("Rule pack label");
  });

  it("include_report_export true, no report profile → choose_report_profile", () => {
    const profile = emptyProfile();
    profile.include_report_export = true;
    const counts = { seed_count: 3, expected_devices: 0, known_platforms: 0 };
    const plan = buildAssessPipelinePlan(profile, counts, "2026-05-20T00:00:00Z");

    expect(plan.next_action).toBe("choose_report_profile");
  });

  it("all includes + all labels set + seeds present → ready_for_future_assessment_run; all enabled steps deferred_engine", () => {
    const profile: AssessProfile = {
      label: "full-profile",
      seed_source: "discovery_seed_plan",
      include_snmp_poll: true,
      include_config_pull: true,
      include_compliance_scan: true,
      include_topology_map: true,
      include_anomaly_flag: true,
      include_report_export: true,
      credential_profile_label: "prod-creds",
      snmp_profile_label: "snmp-v2c",
      rule_pack_label: "nist-sp800-53",
      report_profile_label: "executive",
    };
    const counts = { seed_count: 10, expected_devices: 25, known_platforms: 5 };
    const plan = buildAssessPipelinePlan(profile, counts, "2026-05-20T00:00:00Z");

    expect(plan.next_action).toBe("ready_for_future_assessment_run");

    // All enabled steps should be deferred_engine
    const enabledSteps = plan.steps.filter((s) => s.id !== "discovery");
    enabledSteps.forEach((step) => {
      expect(step.readiness).toBe("deferred_engine");
    });
  });

  it("steps array always has 7 entries in fixed order", () => {
    const plan = buildAssessPipelinePlan(emptyProfile(), emptyCounts(), "2026-05-20T00:00:00Z");
    expect(plan.steps).toHaveLength(7);
    expect(plan.steps[0].id).toBe("discovery");
    expect(plan.steps[1].id).toBe("snmp_poll");
    expect(plan.steps[2].id).toBe("config_pull");
    expect(plan.steps[3].id).toBe("compliance_scan");
    expect(plan.steps[4].id).toBe("topology_map");
    expect(plan.steps[5].id).toBe("anomaly_flag");
    expect(plan.steps[6].id).toBe("report_export");
  });

  it("Markdown is deterministic", () => {
    const profile = emptyProfile();
    const counts = { seed_count: 1, expected_devices: 1, known_platforms: 1 };
    const md1 = toAssessPipelinePlanMarkdown(
      buildAssessPipelinePlan(profile, counts, "2026-05-20T00:00:00Z"),
    );
    const md2 = toAssessPipelinePlanMarkdown(
      buildAssessPipelinePlan(profile, counts, "2026-05-20T00:00:00Z"),
    );
    expect(md1).toBe(md2);
  });

  it("Markdown contains honesty footer", () => {
    const plan = buildAssessPipelinePlan(emptyProfile(), emptyCounts(), "2026-05-20T00:00:00Z");
    const md = toAssessPipelinePlanMarkdown(plan);
    expect(md).toContain("Local pipeline plan only — no live discovery, no config pull");
    expect(md).toContain("no SNMP polling, no compliance execution, no PDF generated");
  });

  it("Markdown redacts password/private_key/passphrase/secret in labels", () => {
    const profile: AssessProfile = {
      label: "my-password-vault",
      seed_source: "manual",
      include_snmp_poll: false,
      include_config_pull: true,
      include_compliance_scan: false,
      include_topology_map: false,
      include_anomaly_flag: false,
      include_report_export: false,
      credential_profile_label: "secret-key-store",
      snmp_profile_label: "",
      rule_pack_label: "",
      report_profile_label: "",
    };
    const counts = { seed_count: 1, expected_devices: 0, known_platforms: 0 };
    const plan = buildAssessPipelinePlan(profile, counts, "2026-05-20T00:00:00Z");
    const md = toAssessPipelinePlanMarkdown(plan);

    expect(md).toContain("[REDACTED]");
    expect(md).not.toContain("password");
    expect(md).not.toContain("secret-key");
  });

  it("step labels match exact spec", () => {
    const plan = buildAssessPipelinePlan(emptyProfile(), emptyCounts(), "2026-05-20T00:00:00Z");
    const labels = plan.steps.map((s) => s.label);
    expect(labels).toEqual([
      "Discovery",
      "SNMP Poll",
      "Config Pull",
      "Compliance Scan",
      "Topology Map",
      "Anomaly Flag",
      "Report",
    ]);
  });

  it("discovery with no seeds → missing_input with Seeds planned input", () => {
    const plan = buildAssessPipelinePlan(emptyProfile(), emptyCounts(), "2026-05-20T00:00:00Z");
    const discoveryStep = plan.steps.find((s) => s.id === "discovery");
    expect(discoveryStep?.readiness).toBe("missing_input");
    expect(discoveryStep?.missing_inputs).toContain(
      "Seeds (via Discovery seed plan / crawl preview)",
    );
  });

  it("report_export with no profile label → deferred_engine with warning (not missing_input)", () => {
    const profile: AssessProfile = {
      label: "test",
      seed_source: "manual",
      include_snmp_poll: false,
      include_config_pull: false,
      include_compliance_scan: false,
      include_topology_map: false,
      include_anomaly_flag: false,
      include_report_export: true,
      credential_profile_label: "",
      snmp_profile_label: "",
      rule_pack_label: "",
      report_profile_label: "", // empty
    };
    const counts = { seed_count: 1, expected_devices: 0, known_platforms: 0 };
    const plan = buildAssessPipelinePlan(profile, counts, "2026-05-20T00:00:00Z");

    const reportStep = plan.steps.find((s) => s.id === "report_export");
    expect(reportStep?.readiness).toBe("deferred_engine");
    expect(reportStep?.notes).toContain(
      "Report profile label not set — defaulting to summary report",
    );
    expect(plan.warnings).toContain(
      "Report profile label not set — defaulting to summary report",
    );
  });
});
