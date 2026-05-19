/**
 * V1BH — Discovery workbench wiring tests.
 *
 * Covers:
 *   - Discovery defaults to Target Capture tool
 *   - Target Capture renders the existing dx-form / validation pack body
 *   - Rail exposes seed_planner, recursive_crawl, import_evidence, field_receipts
 *   - Switching to a deferred tool renders its deferred body and hides the form
 *   - Returning to Target Capture restores the form
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type {
  DiscoveryRunPlan,
  DiscoveryRunReport,
  DiscoveryTarget,
  DiscoveryTargetValidation,
} from "../../../types/discoveryRunner";
import type { DiscoveryApi, DiscoveryClock } from "../DiscoveryMode";
import { DiscoveryMode } from "../DiscoveryMode";

const FIXED_CLOCK: DiscoveryClock = { now: () => "2026-05-20T00:00:00.000Z" };

function makeApi(): DiscoveryApi {
  return {
    validateDiscoveryTarget: vi
      .fn()
      .mockResolvedValue({ is_valid: true, issues: [] } satisfies DiscoveryTargetValidation),
    planDiscoveryRun: vi.fn().mockResolvedValue({
      target: {} as DiscoveryTarget,
      dry_run: { commands: [] },
      all_commands_read_only: true,
    } satisfies DiscoveryRunPlan),
    attemptDiscoveryRun: vi.fn().mockResolvedValue({
      target_label: "lab-edge",
      platform_hint: "iosxe",
      planned_command_count: 2,
      server_key: null,
      outcome: { kind: "transport_deferred", reason: "deferred" },
    } satisfies DiscoveryRunReport),
    executeDiscoveryRun: vi.fn(),
    importTopologyNeighborOutput: vi.fn(),
    getServerKeyPin: vi.fn().mockResolvedValue(null),
    pinServerKey: vi.fn(),
  };
}

describe("DiscoveryMode — workbench (V1BH)", () => {
  it("renders the workbench shell", () => {
    render(<DiscoveryMode api={makeApi()} clock={FIXED_CLOCK} />);
    expect(screen.getByTestId("mode-workbench")).toBeInTheDocument();
  });

  it("defaults to Target Capture tool", () => {
    render(<DiscoveryMode api={makeApi()} clock={FIXED_CLOCK} />);
    expect(
      screen
        .getByTestId("mode-workbench-active")
        .getAttribute("data-active-tool"),
    ).toBe("target_capture");
  });

  it("Target Capture shows the existing validation pack pre-run", () => {
    render(<DiscoveryMode api={makeApi()} clock={FIXED_CLOCK} />);
    expect(screen.getByTestId("discovery-validation-pack")).toBeInTheDocument();
  });

  it("rail exposes all five Discovery tools", () => {
    render(<DiscoveryMode api={makeApi()} clock={FIXED_CLOCK} />);
    expect(screen.getByTestId("mwb-tool-target_capture")).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-seed_planner")).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-recursive_crawl")).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-import_evidence")).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-field_receipts")).toBeInTheDocument();
  });

  it("Target Capture status is READY; deferred tools are DEFERRED or PREVIEW", () => {
    render(<DiscoveryMode api={makeApi()} clock={FIXED_CLOCK} />);
    expect(
      screen.getByTestId("mwb-tool-target_capture").getAttribute("data-tool-status"),
    ).toBe("available");
    expect(
      screen.getByTestId("mwb-tool-seed_planner").getAttribute("data-tool-status"),
    ).toBe("deferred");
    expect(
      screen.getByTestId("mwb-tool-recursive_crawl").getAttribute("data-tool-status"),
    ).toBe("deferred");
    expect(
      screen.getByTestId("mwb-tool-import_evidence").getAttribute("data-tool-status"),
    ).toBe("preview");
    expect(
      screen.getByTestId("mwb-tool-field_receipts").getAttribute("data-tool-status"),
    ).toBe("preview");
  });

  it("switching to Seed Planner shows its deferred body and hides the form", async () => {
    const user = userEvent.setup();
    render(<DiscoveryMode api={makeApi()} clock={FIXED_CLOCK} />);
    await user.click(screen.getByTestId("mwb-tool-seed_planner"));
    expect(screen.getByTestId("mwb-deferred-seed_planner")).toBeInTheDocument();
    expect(screen.queryByTestId("discovery-validation-pack")).toBeNull();
    expect(screen.queryByTestId("dx-form")).toBeNull();
  });

  it("Recursive Crawl renders planned controls list", async () => {
    const user = userEvent.setup();
    render(<DiscoveryMode api={makeApi()} clock={FIXED_CLOCK} />);
    await user.click(screen.getByTestId("mwb-tool-recursive_crawl"));
    expect(screen.getByText("Max depth")).toBeInTheDocument();
    expect(screen.getByText(/Allowlist \/ denylist/i)).toBeInTheDocument();
  });

  it("Import / Evidence shows route hint to Topology", async () => {
    const user = userEvent.setup();
    render(<DiscoveryMode api={makeApi()} clock={FIXED_CLOCK} />);
    await user.click(screen.getByTestId("mwb-tool-import_evidence"));
    expect(screen.getByText("Topology → Evidence import")).toBeInTheDocument();
  });

  it("returning to Target Capture restores the form", async () => {
    const user = userEvent.setup();
    render(<DiscoveryMode api={makeApi()} clock={FIXED_CLOCK} />);
    await user.click(screen.getByTestId("mwb-tool-seed_planner"));
    expect(screen.queryByTestId("discovery-validation-pack")).toBeNull();
    await user.click(screen.getByTestId("mwb-tool-target_capture"));
    expect(screen.getByTestId("discovery-validation-pack")).toBeInTheDocument();
  });
});
