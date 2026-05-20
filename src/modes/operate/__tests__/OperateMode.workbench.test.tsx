import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OperateMode } from "../OperateMode";

describe("OperateMode workbench", () => {
  it("renders workbench", () => {
    render(<OperateMode />);
    const workbench = screen.getByTestId("mode-workbench");
    expect(workbench).toBeInTheDocument();
  });

  it("defaults to live_overview tool", () => {
    render(<OperateMode />);
    const activeStatus = screen.getByTestId("mode-workbench-active-status");
    expect(activeStatus).toBeInTheDocument();
    const activeBody = screen.getByTestId("mode-workbench-body");
    expect(activeBody.textContent).toContain("War Room overview");
  });

  it("exposes all 6 tools on rail", () => {
    render(<OperateMode />);
    const rail = screen.getByTestId("mode-workbench-rail");
    const buttons = rail.querySelectorAll("button[role='tab']");
    expect(buttons).toHaveLength(6);

    const ids = Array.from(buttons).map((btn) => {
      const testId = btn.getAttribute("data-testid") || "";
      return testId.replace("mwb-tool-", "");
    });
    expect(ids).toEqual([
      "live_overview",
      "topology_operations",
      "polling_snmp",
      "baselines_drift",
      "sentinel",
      "events",
    ]);
  });

  it("live_overview shows planned control 'Poll interval (1s to 60s)'", () => {
    render(<OperateMode />);
    const activeBody = screen.getByTestId("mode-workbench-body");
    expect(activeBody.textContent).toContain("Poll interval (1s to 60s)");
  });

  it("topology_operations renders route hint 'Topology → Graph / Map'", async () => {
    const user = userEvent.setup();
    render(<OperateMode />);
    const topoBtn = screen.getByTestId("mwb-tool-topology_operations");
    await user.click(topoBtn);
    const activeBody = screen.getByTestId("mode-workbench-body");
    expect(activeBody.textContent).toContain("Topology → Graph / Map");
  });

  it("baselines_drift shows 'Drift line per device'", async () => {
    const user = userEvent.setup();
    render(<OperateMode />);
    const baselineBtn = screen.getByTestId("mwb-tool-baselines_drift");
    await user.click(baselineBtn);
    const activeBody = screen.getByTestId("mode-workbench-body");
    expect(activeBody.textContent).toContain("Drift line per device");
  });

  it("sentinel shows 'Blast-radius framing'", async () => {
    const user = userEvent.setup();
    render(<OperateMode />);
    const sentinelBtn = screen.getByTestId("mwb-tool-sentinel");
    await user.click(sentinelBtn);
    const activeBody = screen.getByTestId("mode-workbench-body");
    expect(activeBody.textContent).toContain("Blast-radius framing");
  });

  it("6 tool labels do not include 'Forge', 'Intelligence', 'AI', 'Library'", () => {
    render(<OperateMode />);
    const rail = screen.getByTestId("mode-workbench-rail");
    const toolLabels = Array.from(rail.querySelectorAll("button[role='tab']")).map(
      (btn) => btn.textContent || ""
    );
    const toolText = toolLabels.join(" ");
    expect(toolText).not.toMatch(/Forge/i);
    expect(toolText).not.toMatch(/Intelligence/i);
    expect(toolText).not.toMatch(/\bAI\b/);
    expect(toolText).not.toMatch(/Library/i);
  });
});
