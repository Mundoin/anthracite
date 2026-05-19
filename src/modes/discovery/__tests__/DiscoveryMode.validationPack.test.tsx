/**
 * V1BF — Validation Pack UI tests.
 *
 * Covers: pack renders pre-run, correct next-action wording, copy button
 * calls clipboard, "no target selected" identity for empty form.
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
import type { DiscoveryApi, DiscoveryClock, DiscoveryClipboard } from "../DiscoveryMode";
import { DiscoveryMode } from "../DiscoveryMode";

const FIXED_CLOCK: DiscoveryClock = { now: () => "2026-05-19T00:00:00.000Z" };

function makeApi(overrides: Partial<DiscoveryApi> = {}): DiscoveryApi {
  return {
    validateDiscoveryTarget: vi.fn().mockResolvedValue({ is_valid: true, issues: [] } satisfies DiscoveryTargetValidation),
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
    ...overrides,
  };
}

function makeClipboard(writeText = vi.fn().mockResolvedValue(undefined)): DiscoveryClipboard {
  return { writeText };
}

describe("DiscoveryMode — validation pack (V1BF)", () => {
  it("renders validation pack section pre-run", () => {
    render(<DiscoveryMode api={makeApi()} clock={FIXED_CLOCK} />);
    expect(screen.getByTestId("discovery-validation-pack")).toBeDefined();
  });

  it("shows 'no target selected' when host is empty", () => {
    render(<DiscoveryMode api={makeApi()} clock={FIXED_CLOCK} />);
    expect(screen.getByTestId("discovery-vpack-target").textContent).toBe(
      "no target selected",
    );
  });

  it("shows 'no run' outcome pre-run", () => {
    render(<DiscoveryMode api={makeApi()} clock={FIXED_CLOCK} />);
    expect(screen.getByTestId("discovery-vpack-outcome").textContent).toContain(
      "no run",
    );
  });

  it("shows run_ssh_capture as next action pre-run", () => {
    render(<DiscoveryMode api={makeApi()} clock={FIXED_CLOCK} />);
    expect(screen.getByTestId("discovery-vpack-next-action").textContent).toContain(
      "run_ssh_capture",
    );
  });

  it("shows 'not observed' for server key pre-run", () => {
    render(<DiscoveryMode api={makeApi()} clock={FIXED_CLOCK} />);
    expect(screen.getByTestId("discovery-vpack-key").textContent).toBe(
      "not observed",
    );
  });

  it("copy button calls clipboard.writeText", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const clipboard = makeClipboard(writeText);
    render(<DiscoveryMode api={makeApi()} clock={FIXED_CLOCK} clipboard={clipboard} />);
    await user.click(screen.getByTestId("discovery-vpack-copy-btn"));
    expect(writeText).toHaveBeenCalledOnce();
    const arg: string = writeText.mock.calls[0][0];
    expect(arg).toContain("SSH Field Validation Pack");
  });

  it("copy button shows 'Copied' label after click", async () => {
    const user = userEvent.setup();
    render(
      <DiscoveryMode
        api={makeApi()}
        clock={FIXED_CLOCK}
        clipboard={makeClipboard()}
      />,
    );
    const btn = screen.getByTestId("discovery-vpack-copy-btn");
    expect(btn.textContent).toContain("Copy Validation Pack");
    await user.click(btn);
    expect(btn.textContent).toContain("Copied");
  });
});
