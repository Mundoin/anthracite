import { describe, expect, it } from "vitest";
import type {
  DiscoveryTarget,
  DiscoveryTargetValidation,
  DiscoveryRunPlan,
  DiscoveryRunReport,
  DiscoveryRunOutcome,
  DiscoveryTransport,
  DiscoveryTargetIssue,
} from "../../../types/discoveryRunner";

describe("Discovery Runner Types", () => {
  it("DiscoveryTransport literals compile", () => {
    const transport: DiscoveryTransport = "ssh";
    expect(transport).toBe("ssh");
  });

  it("DiscoveryTargetIssue literals compile", () => {
    const issues: DiscoveryTargetIssue[] = [
      "host_empty",
      "host_whitespace_only",
      "port_invalid",
      "username_empty",
      "data_source_label_empty",
    ];
    expect(issues).toHaveLength(5);
  });

  it("DiscoveryRunOutcome union compiles with transport_deferred", () => {
    const outcome: DiscoveryRunOutcome = {
      kind: "transport_deferred",
      reason: "ssh not yet implemented",
    };
    expect(outcome.kind).toBe("transport_deferred");
  });

  it("DiscoveryRunOutcome union compiles with refused", () => {
    const outcome: DiscoveryRunOutcome = {
      kind: "refused",
      reason: "credentials failed",
    };
    expect(outcome.kind).toBe("refused");
  });

  it("DiscoveryTarget shape is readonly", () => {
    const target: DiscoveryTarget = {
      host: "192.168.1.1",
      port: 22,
      username: "admin",
      platform_hint: "iosxe",
      transport: "ssh",
      data_source_label: "test",
    };
    expect(target.host).toBe("192.168.1.1");
    expect(target.port).toBe(22);
  });

  it("DiscoveryTargetValidation shape compiles", () => {
    const validation: DiscoveryTargetValidation = {
      is_valid: true,
      issues: [],
    };
    expect(validation.is_valid).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });

  it("DiscoveryRunPlan shape compiles", () => {
    const plan: DiscoveryRunPlan = {
      target: {
        host: "192.168.1.1",
        port: 22,
        username: "admin",
        platform_hint: "iosxe",
        transport: "ssh",
        data_source_label: "test",
      },
      dry_run: undefined,
      all_commands_read_only: true,
    };
    expect(plan.all_commands_read_only).toBe(true);
  });

  it("DiscoveryRunReport shape compiles", () => {
    const report: DiscoveryRunReport = {
      target_label: "test-device",
      platform_hint: "iosxe",
      planned_command_count: 2,
      outcome: {
        kind: "transport_deferred",
        reason: "not yet implemented",
      },
    };
    expect(report.planned_command_count).toBe(2);
  });
});
