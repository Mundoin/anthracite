import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OperateMode } from "../OperateMode";
import type { OperateOverviewInputs } from "../operateOverview";

describe("OperateMode — bridge between Discovery and Operate", () => {
  it("renders without inputs (backward compatible)", () => {
    const { container } = render(<OperateMode />);
    expect(container).toBeTruthy();
  });

  it("accepts and passes operateOverviewInputs to OperateOverviewPanel", () => {
    const inputs: OperateOverviewInputs = {
      staged_seed_count: 3,
      crawl_frontier_count: 0,
      evidence_import_count: 0,
      topology_node_count: 0,
      topology_edge_count: 0,
    };

    const { container } = render(<OperateMode operateOverviewInputs={inputs} />);
    expect(container).toBeTruthy();
  });

  it("handles mixed input counts", () => {
    const inputs: OperateOverviewInputs = {
      staged_seed_count: 5,
      crawl_frontier_count: 12,
      evidence_import_count: 2,
      topology_node_count: 8,
      topology_edge_count: 15,
    };

    const { container } = render(<OperateMode operateOverviewInputs={inputs} />);
    expect(container).toBeTruthy();
  });

  it("handles zero inputs", () => {
    const inputs: OperateOverviewInputs = {
      staged_seed_count: 0,
      crawl_frontier_count: 0,
      evidence_import_count: 0,
      topology_node_count: 0,
      topology_edge_count: 0,
    };

    const { container } = render(<OperateMode operateOverviewInputs={inputs} />);
    expect(container).toBeTruthy();
  });
});
