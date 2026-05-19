import { describe, expect, it } from "vitest";
import {
  buildEvidenceHandoff,
  buildImportRequest,
} from "../sshEvidenceHandoff";
import type {
  CommandExecutionResult,
  DiscoveryRunReport,
  DiscoveryTarget,
} from "../../../types/discoveryRunner";

const TARGET: DiscoveryTarget = {
  host: "10.0.0.1",
  port: 22,
  username: "admin",
  platform_hint: "iosxe",
  transport: "ssh",
  data_source_label: "lab-spine-01",
};

function result(
  command: string,
  stdout: string,
  exit_code: number | null = 0,
  output_truncated = false,
): CommandExecutionResult {
  return {
    command,
    exit_code,
    duration_ms: 5,
    stdout,
    stderr: "",
    output_truncated,
  };
}

function captured(results: CommandExecutionResult[]): DiscoveryRunReport {
  return {
    target_label: TARGET.data_source_label,
    platform_hint: TARGET.platform_hint,
    planned_command_count: results.length,
    outcome: { kind: "captured", command_results: results },
  };
}

describe("buildEvidenceHandoff", () => {
  it("classifies `show lldp neighbors detail` as lldp + importable", () => {
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([result("show lldp neighbors detail", "Local Intf: Gi0/1\n")]),
    );
    expect(plan.candidates).toHaveLength(1);
    expect(plan.candidates[0]?.source_kind).toBe("lldp");
    expect(plan.candidates[0]?.importable).toBe(true);
    expect(plan.importable_count).toBe(1);
  });

  it("classifies `show cdp neighbors detail` as cdp + importable", () => {
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([result("show cdp neighbors detail", "Device ID: foo\n")]),
    );
    expect(plan.candidates[0]?.source_kind).toBe("cdp");
    expect(plan.candidates[0]?.importable).toBe(true);
  });

  it("classifies `display lldp neighbor` (Huawei) as lldp + importable", () => {
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([result("display lldp neighbor", "system-name\n")]),
    );
    expect(plan.candidates[0]?.source_kind).toBe("lldp");
    expect(plan.candidates[0]?.importable).toBe(true);
  });

  it("marks `show version` as not importable with non_neighbour_command reason", () => {
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([result("show version", "Cisco IOS XE Software\n")]),
    );
    expect(plan.candidates[0]?.source_kind).toBe("unknown");
    expect(plan.candidates[0]?.importable).toBe(false);
    expect(plan.candidates[0]?.reason).toBe("non_neighbour_command");
    expect(plan.candidates[0]?.raw_text).toBe("");
  });

  it("marks `show interfaces` as not importable with non_neighbour_command", () => {
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([result("show interfaces", "Ethernet1/1 ...\n")]),
    );
    expect(plan.candidates[0]?.reason).toBe("non_neighbour_command");
  });

  it("marks an unrecognised command as unrecognised_command", () => {
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([result("show frobnicate gizmo", "x\n")]),
    );
    expect(plan.candidates[0]?.reason).toBe("unrecognised_command");
  });

  it("rejects an LLDP command whose stdout is empty as empty_output", () => {
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([result("show lldp neighbors detail", "  \n  ")]),
    );
    expect(plan.candidates[0]?.source_kind).toBe("lldp");
    expect(plan.candidates[0]?.importable).toBe(false);
    expect(plan.candidates[0]?.reason).toBe("empty_output");
  });

  it("rejects a non-zero exit-code command as command_failed_exit", () => {
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([result("show lldp neighbors detail", "x", 1)]),
    );
    expect(plan.candidates[0]?.importable).toBe(false);
    expect(plan.candidates[0]?.reason).toBe("command_failed_exit");
  });

  it("preserves provenance in source_label", () => {
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([result("show lldp neighbors", "x")]),
    );
    expect(plan.candidates[0]?.source_label).toBe(
      "live_ssh_captured:lab-spine-01:show lldp neighbors",
    );
  });

  it("preserves output_truncated flag", () => {
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([result("show lldp neighbors", "x", 0, true)]),
    );
    expect(plan.candidates[0]?.output_truncated).toBe(true);
  });

  it("returns an empty plan when outcome is not captured", () => {
    const report: DiscoveryRunReport = {
      target_label: TARGET.data_source_label,
      platform_hint: TARGET.platform_hint,
      planned_command_count: 1,
      outcome: { kind: "auth_failed", reason_redacted: "rejected" },
    };
    const plan = buildEvidenceHandoff(TARGET, report);
    expect(plan.candidates).toHaveLength(0);
    expect(plan.importable_count).toBe(0);
  });

  it("handles a mixed batch — LLDP + CDP + show version + unrecognised", () => {
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([
        result("show lldp neighbors detail", "a"),
        result("show cdp neighbors detail", "b"),
        result("show version", "c"),
        result("show flux capacitor", "d"),
      ]),
    );
    expect(plan.candidates.map((c) => c.source_kind)).toEqual([
      "lldp",
      "cdp",
      "unknown",
      "unknown",
    ]);
    expect(plan.importable_count).toBe(2);
    expect(plan.not_importable_count).toBe(2);
  });

  it("does not include any credential material in any candidate field", () => {
    // V1AZ captured outcomes never carry credentials, but defense in depth:
    // the handoff payload must not reference operator credentials in any way.
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([result("show lldp neighbors", "raw output")]),
    );
    const json = JSON.stringify(plan);
    expect(json).not.toMatch(/password/i);
    expect(json).not.toMatch(/private[_-]?key/i);
    expect(json).not.toMatch(/passphrase/i);
  });
});

describe("buildImportRequest", () => {
  it("returns a complete RawNeighborEvidenceImportRequest for an importable candidate", () => {
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([result("show lldp neighbors detail", "stdout body")]),
    );
    const req = buildImportRequest(
      plan.candidates[0]!,
      "apex-prod-emea",
      null,
      null,
    );
    expect(req).not.toBeNull();
    expect(req?.environment_id).toBe("apex-prod-emea");
    expect(req?.local_node).toBe("lab-spine-01");
    expect(req?.source_kind).toBe("lldp");
    expect(req?.platform_hint).toBe("iosxe");
    expect(req?.raw_text).toBe("stdout body");
    expect(req?.source_label).toContain("live_ssh_captured:lab-spine-01:show lldp");
    expect(req?.mode).toBeNull();
  });

  it("honours a local_node override", () => {
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([result("show lldp neighbors", "x")]),
    );
    const req = buildImportRequest(
      plan.candidates[0]!,
      "apex-prod-emea",
      "leaf-7",
      "append",
    );
    expect(req?.local_node).toBe("leaf-7");
    expect(req?.mode).toBe("append");
  });

  it("returns null for a non-importable candidate", () => {
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([result("show version", "x")]),
    );
    const req = buildImportRequest(
      plan.candidates[0]!,
      "apex-prod-emea",
      null,
      null,
    );
    expect(req).toBeNull();
  });

  it("returns null when environment_id is empty", () => {
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([result("show lldp neighbors", "x")]),
    );
    const req = buildImportRequest(plan.candidates[0]!, "   ", null, null);
    expect(req).toBeNull();
  });

  it("returns null when local_node override is empty", () => {
    const plan = buildEvidenceHandoff(
      TARGET,
      captured([result("show lldp neighbors", "x")]),
    );
    const req = buildImportRequest(
      plan.candidates[0]!,
      "apex-prod-emea",
      "   ",
      null,
    );
    expect(req).toBeNull();
  });
});
