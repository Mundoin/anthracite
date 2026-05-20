/**
 * V1BN — IntakeMode workbench adoption tests.
 *
 * Covers:
 *   - IntakeMode renders ModeWorkbenchShell
 *   - Default tool is Single Config
 *   - Rail exposes all five Intake tools
 *   - Switching to deferred tools shows deferred state
 *   - Single Config renders IntakePanel
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntakeMode } from "../IntakeMode";

describe("IntakeMode — workbench (V1BN)", () => {
  it("renders ModeWorkbenchShell", () => {
    render(<IntakeMode activeEnvironmentId={null} />);
    expect(screen.getByTestId("mode-workbench")).toBeInTheDocument();
  });

  it("defaults to Single Config", () => {
    render(<IntakeMode activeEnvironmentId={null} />);
    expect(
      screen
        .getByTestId("mode-workbench-active")
        .getAttribute("data-active-tool"),
    ).toBe("single_config");
  });

  it("rail exposes all five Intake tools", () => {
    render(<IntakeMode activeEnvironmentId={null} />);
    expect(screen.getByTestId("mwb-tool-single_config")).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-archive_batch")).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-platform_registry")).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-receipts_export")).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-parser_coverage")).toBeInTheDocument();
  });

  it("Single Config tool has available status", () => {
    render(<IntakeMode activeEnvironmentId={null} />);
    expect(
      screen.getByTestId("mwb-tool-single_config").getAttribute("data-tool-status"),
    ).toBe("available");
  });

  it("switching to Archive Batch shows deferred state", async () => {
    const user = userEvent.setup();
    render(<IntakeMode activeEnvironmentId={null} />);
    await user.click(screen.getByTestId("mwb-tool-archive_batch"));
    expect(screen.getByTestId("mwb-deferred-archive_batch")).toBeInTheDocument();
    expect(
      screen
        .getByTestId("mode-workbench-active")
        .getAttribute("data-active-tool"),
    ).toBe("archive_batch");
  });

  it("switching to Platform Registry shows deferred state", async () => {
    const user = userEvent.setup();
    render(<IntakeMode activeEnvironmentId={null} />);
    await user.click(screen.getByTestId("mwb-tool-platform_registry"));
    expect(screen.getByTestId("mwb-deferred-platform_registry")).toBeInTheDocument();
    expect(
      screen
        .getByTestId("mode-workbench-active")
        .getAttribute("data-active-tool"),
    ).toBe("platform_registry");
  });

  it("switching to Receipts / Export shows deferred state", async () => {
    const user = userEvent.setup();
    render(<IntakeMode activeEnvironmentId={null} />);
    await user.click(screen.getByTestId("mwb-tool-receipts_export"));
    expect(screen.getByTestId("mwb-deferred-receipts_export")).toBeInTheDocument();
    expect(
      screen
        .getByTestId("mode-workbench-active")
        .getAttribute("data-active-tool"),
    ).toBe("receipts_export");
  });

  it("switching to Parser Coverage shows deferred state", async () => {
    const user = userEvent.setup();
    render(<IntakeMode activeEnvironmentId={null} />);
    await user.click(screen.getByTestId("mwb-tool-parser_coverage"));
    expect(screen.getByTestId("mwb-deferred-parser_coverage")).toBeInTheDocument();
    expect(
      screen
        .getByTestId("mode-workbench-active")
        .getAttribute("data-active-tool"),
    ).toBe("parser_coverage");
  });
});
