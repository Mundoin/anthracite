import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssessPipelinePlannerPanel } from "../AssessPipelinePlannerPanel";

describe("AssessPipelinePlannerPanel — UI", () => {
  it("panel renders with assess-pipeline-planner testid", () => {
    render(<AssessPipelinePlannerPanel />);
    expect(screen.getByTestId("assess-pipeline-planner")).toBeInTheDocument();
  });

  it("default (empty profile) shows next_action add_seeds", () => {
    render(<AssessPipelinePlannerPanel />);
    const addSeedsElements = screen.getAllByText(/ADD SEEDS/i);
    expect(addSeedsElements.length).toBeGreaterThan(0);
  });

  it("entering seed_count=3 + no includes → next_action ready_for_future_assessment_run", async () => {
    const user = userEvent.setup();
    render(<AssessPipelinePlannerPanel />);

    const seedCountInput = screen.getByLabelText(/Seed Count/i);
    await user.clear(seedCountInput);
    await user.type(seedCountInput, "3");

    const readyElements = screen.getAllByText(/READY FOR FUTURE ASSESSMENT RUN/i);
    expect(readyElements.length).toBeGreaterThan(0);
  });

  it("toggling include_config_pull with no credential label → next_action attach_credentials + missing input visible", async () => {
    const user = userEvent.setup();
    render(<AssessPipelinePlannerPanel />);

    const seedCountInput = screen.getByLabelText(/Seed Count/i);
    await user.clear(seedCountInput);
    await user.type(seedCountInput, "3");

    const configPullCheckbox = screen.getByRole("checkbox", { name: /Config Pull/i });
    await user.click(configPullCheckbox);

    const attachCredsElements = screen.getAllByText(/ATTACH CREDENTIALS/i);
    expect(attachCredsElements.length).toBeGreaterThan(0);
  });

  it("copy button calls clipboard.writeText with markdown containing honesty footer", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => {});
    const clipboard = { writeText };

    render(
      <AssessPipelinePlannerPanel
        clock={{ now: () => "2026-05-20T00:00:00Z" }}
        clipboard={clipboard}
      />,
    );

    const copyButton = screen.getByRole("button", { name: /Copy Pipeline Plan/i });
    await user.click(copyButton);

    expect(writeText).toHaveBeenCalled();
    const markdown = writeText.mock.calls[0]?.[0] as string;
    expect(markdown).toContain("# Assess Pipeline Plan");
    expect(markdown).toContain("Local pipeline plan only");
    expect(markdown).toContain("no live discovery");
  });

  it("7 pipeline steps always render in fixed order", () => {
    render(<AssessPipelinePlannerPanel />);

    const table = screen.getByRole("table");
    const rows = table.querySelectorAll("tbody tr");

    expect(rows).toHaveLength(7);
    expect(rows[0]).toHaveAttribute("data-step-id", "discovery");
    expect(rows[1]).toHaveAttribute("data-step-id", "snmp_poll");
    expect(rows[2]).toHaveAttribute("data-step-id", "config_pull");
    expect(rows[3]).toHaveAttribute("data-step-id", "compliance_scan");
    expect(rows[4]).toHaveAttribute("data-step-id", "topology_map");
    expect(rows[5]).toHaveAttribute("data-step-id", "anomaly_flag");
    expect(rows[6]).toHaveAttribute("data-step-id", "report_export");
  });

  it("honesty footer visible in UI", () => {
    render(<AssessPipelinePlannerPanel />);
    const footerElements = screen.getAllByText(/Local pipeline plan only/i);
    expect(footerElements.length).toBeGreaterThan(0);
  });

  it("markdown preview details expands and contains honesty footer", async () => {
    const user = userEvent.setup();
    render(<AssessPipelinePlannerPanel />);

    const summary = screen.getByText(/Markdown Preview/i);
    await user.click(summary);

    const detailsElements = screen.getAllByText(/Local pipeline plan only/i);
    expect(detailsElements.length).toBeGreaterThan(0);
  });
});
