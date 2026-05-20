/**
 * V1BP — Operate Overview Panel Intake Context Tests.
 *
 * Component tests for intake context row rendering.
 * Validates:
 * - Row absent when intake fields are empty/zero
 * - Row present and displays platform_id when non-null
 * - Row present and displays finding count when > 0
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OperateOverviewPanel, type OperateOverviewPanelProps } from "../OperateOverviewPanel";
import type { OperateOverviewInputs } from "../operateOverview";

describe("OperateOverviewPanel — intake context", () => {
  const mockClock = {
    now: () => "2026-05-20T12:00:00Z",
  };

  const mockClipboard = {
    writeText: vi.fn().mockResolvedValue(undefined),
  };

  it("should not render intake-context row when all intake fields are empty/zero", () => {
    const inputs: OperateOverviewInputs = {
      staged_seed_count: 0,
      crawl_frontier_count: 0,
      evidence_import_count: 0,
      topology_node_count: 0,
      topology_edge_count: 0,
      intake_parsed_device_count: 0,
      intake_finding_count: 0,
      intake_current_platform_id: null,
    };

    const props: OperateOverviewPanelProps = {
      inputs,
      clock: mockClock,
      clipboard: mockClipboard,
    };

    render(<OperateOverviewPanel {...props} />);

    const intakeRow = screen.queryByTestId("operate-intake-context");
    expect(intakeRow).not.toBeInTheDocument();
  });

  it("should render intake-context row when intake_current_platform_id is non-null", () => {
    const inputs: OperateOverviewInputs = {
      staged_seed_count: 0,
      crawl_frontier_count: 0,
      evidence_import_count: 0,
      topology_node_count: 0,
      topology_edge_count: 0,
      intake_current_platform_id: "iosxe",
    };

    const props: OperateOverviewPanelProps = {
      inputs,
      clock: mockClock,
      clipboard: mockClipboard,
    };

    render(<OperateOverviewPanel {...props} />);

    const intakeRow = screen.getByTestId("operate-intake-context");
    expect(intakeRow).toBeInTheDocument();
    expect(intakeRow).toHaveTextContent("platform=iosxe");
  });

  it("should render intake-context row and display findings when intake_finding_count > 0", () => {
    const inputs: OperateOverviewInputs = {
      staged_seed_count: 0,
      crawl_frontier_count: 0,
      evidence_import_count: 0,
      topology_node_count: 0,
      topology_edge_count: 0,
      intake_finding_count: 2,
    };

    const props: OperateOverviewPanelProps = {
      inputs,
      clock: mockClock,
      clipboard: mockClipboard,
    };

    render(<OperateOverviewPanel {...props} />);

    const intakeRow = screen.getByTestId("operate-intake-context");
    expect(intakeRow).toBeInTheDocument();
    expect(intakeRow).toHaveTextContent("findings=2");
  });

  it("should render intake-context row with both platform and findings when both are present", () => {
    const inputs: OperateOverviewInputs = {
      staged_seed_count: 0,
      crawl_frontier_count: 0,
      evidence_import_count: 0,
      topology_node_count: 0,
      topology_edge_count: 0,
      intake_current_platform_id: "ios-xr",
      intake_finding_count: 5,
      intake_parsed_device_count: 3,
    };

    const props: OperateOverviewPanelProps = {
      inputs,
      clock: mockClock,
      clipboard: mockClipboard,
    };

    render(<OperateOverviewPanel {...props} />);

    const intakeRow = screen.getByTestId("operate-intake-context");
    expect(intakeRow).toBeInTheDocument();
    expect(intakeRow).toHaveTextContent("platform=ios-xr");
    expect(intakeRow).toHaveTextContent("findings=5");
  });

  it("should display '—' for platform when platform_id is null but other intake fields are present", () => {
    const inputs: OperateOverviewInputs = {
      staged_seed_count: 0,
      crawl_frontier_count: 0,
      evidence_import_count: 0,
      topology_node_count: 0,
      topology_edge_count: 0,
      intake_current_platform_id: null,
      intake_finding_count: 1,
    };

    const props: OperateOverviewPanelProps = {
      inputs,
      clock: mockClock,
      clipboard: mockClipboard,
    };

    render(<OperateOverviewPanel {...props} />);

    const intakeRow = screen.getByTestId("operate-intake-context");
    expect(intakeRow).toBeInTheDocument();
    expect(intakeRow).toHaveTextContent("platform=—");
  });
});
