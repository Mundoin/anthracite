/**
 * V1BP — Operate Overview Intake Integration Tests.
 *
 * Unit tests for intake fields in buildOperateOverview and buildMetrics.
 * Validates:
 * - Intake metric display with zero and non-zero counts
 * - Readiness state unchanged by intake (display-only)
 * - Next action unaffected by intake counts
 */

import { describe, it, expect } from "vitest";
import {
  buildOperateOverview,
  resolveOperateReadiness,
  type OperateOverviewInputs,
} from "../operateOverview";

describe("buildOperateOverview — intake integration", () => {
  it("should show intake_parsed metric as '0' when intake_parsed_device_count is undefined", () => {
    const inputs: OperateOverviewInputs = {
      staged_seed_count: 0,
      crawl_frontier_count: 0,
      evidence_import_count: 0,
      topology_node_count: 0,
      topology_edge_count: 0,
      // intake_parsed_device_count intentionally undefined
    };

    const summary = buildOperateOverview(inputs, "2026-05-20T12:00:00Z");
    const intakeMetric = summary.metrics.find((m) => m.id === "intake_parsed");

    expect(intakeMetric).toBeDefined();
    expect(intakeMetric?.value).toBe("0");
    expect(intakeMetric?.sub).toBe("no parses yet");
  });

  it("should show intake_parsed metric with device count and 'local intake' sub when intake_parsed_device_count > 0", () => {
    const inputs: OperateOverviewInputs = {
      staged_seed_count: 0,
      crawl_frontier_count: 0,
      evidence_import_count: 0,
      topology_node_count: 0,
      topology_edge_count: 0,
      intake_parsed_device_count: 3,
    };

    const summary = buildOperateOverview(inputs, "2026-05-20T12:00:00Z");
    const intakeMetric = summary.metrics.find((m) => m.id === "intake_parsed");

    expect(intakeMetric).toBeDefined();
    expect(intakeMetric?.value).toBe("3");
    expect(intakeMetric?.sub).toBe("local intake");
  });

  it("should not flip readiness state when intake_finding_count > 0", () => {
    const baseInputs: OperateOverviewInputs = {
      staged_seed_count: 0,
      crawl_frontier_count: 0,
      evidence_import_count: 0,
      topology_node_count: 0,
      topology_edge_count: 0,
    };

    const withoutIntake = buildOperateOverview(baseInputs, "2026-05-20T12:00:00Z");
    const withIntakeFinding: OperateOverviewInputs = {
      ...baseInputs,
      intake_finding_count: 5,
    };

    const withIntakeReadiness = buildOperateOverview(withIntakeFinding, "2026-05-20T12:00:00Z");

    expect(withoutIntake.readiness).toBe("no_sources");
    expect(withIntakeReadiness.readiness).toBe("no_sources");
  });

  it("should not change next_action based on intake fields", () => {
    const baseInputs: OperateOverviewInputs = {
      staged_seed_count: 1,
      crawl_frontier_count: 0,
      evidence_import_count: 0,
      topology_node_count: 0,
      topology_edge_count: 0,
    };

    const withoutIntake = buildOperateOverview(baseInputs, "2026-05-20T12:00:00Z");
    const withIntake: OperateOverviewInputs = {
      ...baseInputs,
      intake_parsed_device_count: 10,
      intake_finding_count: 2,
      intake_current_platform_id: "iosxe",
    };

    const withIntakeSummary = buildOperateOverview(withIntake, "2026-05-20T12:00:00Z");

    expect(withoutIntake.next_action).toBe("build_crawl_preview");
    expect(withIntakeSummary.next_action).toBe("build_crawl_preview");
  });

  it("should include exactly 6 metrics when intake fields are provided", () => {
    const inputs: OperateOverviewInputs = {
      staged_seed_count: 1,
      crawl_frontier_count: 2,
      evidence_import_count: 1,
      topology_node_count: 5,
      topology_edge_count: 8,
      intake_parsed_device_count: 3,
      intake_finding_count: 1,
      intake_current_platform_id: "iosxe",
    };

    const summary = buildOperateOverview(inputs, "2026-05-20T12:00:00Z");

    expect(summary.metrics).toHaveLength(6);
    const metricIds = summary.metrics.map((m) => m.id);
    expect(metricIds).toContain("intake_parsed");
  });
});
