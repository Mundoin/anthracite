import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OperateMode } from "../OperateMode";
import type { OperateOverviewInputs } from "../operateOverview";

describe("OperateMode — topology counts wired to overview", () => {
  it("renders topology node count when topology has nodes", () => {
    const inputs: OperateOverviewInputs = {
      staged_seed_count: 0,
      crawl_frontier_count: 0,
      evidence_import_count: 0,
      topology_node_count: 12,
      topology_edge_count: 17,
    };

    render(<OperateMode operateOverviewInputs={inputs} />);

    // Assert metric shows node count value
    const nodeMetric = screen.getByText("12");
    expect(nodeMetric).toBeTruthy();
  });

  it("shows connect_live_polling_future next-action when topology has nodes", () => {
    const inputs: OperateOverviewInputs = {
      staged_seed_count: 0,
      crawl_frontier_count: 0,
      evidence_import_count: 0,
      topology_node_count: 12,
      topology_edge_count: 17,
    };

    const { container } = render(<OperateMode operateOverviewInputs={inputs} />);

    // Assert next-action text appears (should reference connecting live polling)
    const text = container.textContent ?? "";
    expect(text).toContain("connect_live_polling_future");
  });

  it("does not claim live polling or SNMP is enabled when topology is available", () => {
    const inputs: OperateOverviewInputs = {
      staged_seed_count: 0,
      crawl_frontier_count: 0,
      evidence_import_count: 0,
      topology_node_count: 12,
      topology_edge_count: 17,
    };

    const { container } = render(<OperateMode operateOverviewInputs={inputs} />);

    const text = container.textContent ?? "";
    // These false-positive claims must NOT appear
    expect(text).not.toContain("SNMP polling enabled");
    expect(text).not.toContain("live polling active");
  });

  it("returns build_crawl_preview next-action when seeds staged but no topology", () => {
    const inputs: OperateOverviewInputs = {
      staged_seed_count: 5,
      crawl_frontier_count: 0,
      evidence_import_count: 0,
      topology_node_count: 0,
      topology_edge_count: 0,
    };

    const { container } = render(<OperateMode operateOverviewInputs={inputs} />);

    const text = container.textContent ?? "";
    expect(text).toContain("build_crawl_preview");
  });
});
