import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LiveCollectionDryRunPanel } from "../LiveCollectionDryRunPanel";
import type {
  LiveCollectionDryRunPlan,
  LiveCollectionDryRunRequest,
} from "../../../types/liveCollection";

function basePlan(
  over: Partial<LiveCollectionDryRunPlan> = {},
): LiveCollectionDryRunPlan {
  return {
    readiness: "ready",
    environment_id: "env-core-eu1",
    target_label: "router-a",
    platform: "iosxe",
    raw_platform_hint: "iosxe",
    planned_import_mode: "merge",
    commands: [
      {
        source_kind: "lldp",
        command: "show lldp neighbors detail",
        read_only: true,
        raw_neighbor_source_kind: "lldp",
        platform_hint: "iosxe",
        planned_import_function: "importTopologyNeighborOutput",
        note: "Read-only LLDP neighbour command planned for Cisco IOS-XE.",
      },
    ],
    warnings: [],
    unsupported_reason: null,
    safety_checklist: [
      "Operator review required before any future collection.",
      "Driver must refuse execution unless readiness is ready.",
      "Every command in the plan is read-only.",
    ],
    honesty_note: "Dry-run plan only. No device contact is performed in V1AT.",
    ...over,
  };
}

describe("LiveCollectionDryRunPanel — surface", () => {
  it("renders honesty header note and form by default", () => {
    render(
      <LiveCollectionDryRunPanel environmentId="env-core-eu1" onPlan={vi.fn()} />,
    );
    expect(screen.getByTestId("tm-live-collection")).toBeInTheDocument();
    expect(
      screen.getByTestId("tm-live-collection-honesty"),
    ).toHaveTextContent("No device contact is performed");
    expect(screen.getByTestId("tm-live-collection-form")).toBeInTheDocument();
    expect(
      screen.getByTestId("tm-live-collection-platform"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("tm-live-collection-source-lldp"),
    ).toBeChecked();
    expect(
      screen.getByTestId("tm-live-collection-source-cdp"),
    ).not.toBeChecked();
    expect(
      screen.getByTestId("tm-live-collection-import-mode"),
    ).toHaveValue("merge");
  });

  it("default import mode is merge", () => {
    render(
      <LiveCollectionDryRunPanel environmentId="env-core-eu1" onPlan={vi.fn()} />,
    );
    expect(
      screen.getByTestId("tm-live-collection-import-mode"),
    ).toHaveValue("merge");
  });

  it("contains no credential / host / IP fields", () => {
    const { container } = render(
      <LiveCollectionDryRunPanel environmentId="env-core-eu1" onPlan={vi.fn()} />,
    );
    expect(container.querySelector('input[type="password"]')).toBeNull();
    const inputs = container.querySelectorAll("input, select, textarea");
    inputs.forEach((node) => {
      const id = node.getAttribute("data-testid") ?? "";
      const placeholder = node.getAttribute("placeholder") ?? "";
      expect(id).not.toMatch(/password|credential|username|host|ip|ssh/i);
      expect(placeholder).not.toMatch(/password|credential|ssh/i);
    });
  });

  it("disables Plan button when no onPlan callback supplied", () => {
    render(<LiveCollectionDryRunPanel environmentId="env-core-eu1" />);
    expect(
      screen.getByTestId("tm-live-collection-plan-button"),
    ).toBeDisabled();
  });

  it("invokes onPlan with deterministic request payload", async () => {
    const captured: LiveCollectionDryRunRequest[] = [];
    const onPlan = vi.fn(async (req: LiveCollectionDryRunRequest) => {
      captured.push(req);
      return basePlan();
    });
    render(
      <LiveCollectionDryRunPanel environmentId="env-core-eu1" onPlan={onPlan} />,
    );
    fireEvent.change(screen.getByTestId("tm-live-collection-target"), {
      target: { value: "router-a" },
    });
    fireEvent.click(screen.getByTestId("tm-live-collection-source-cdp"));
    fireEvent.click(screen.getByTestId("tm-live-collection-plan-button"));
    await Promise.resolve();
    await Promise.resolve();
    expect(onPlan).toHaveBeenCalledTimes(1);
    expect(captured[0]).toEqual({
      environment_id: "env-core-eu1",
      target_label: "router-a",
      platform_hint: "iosxe",
      source_kinds: ["lldp", "cdp"],
      planned_import_mode: "merge",
    });
  });

  it("renders read-only badges and command list when plan returns commands", async () => {
    const onPlan = vi.fn(async () => basePlan());
    render(
      <LiveCollectionDryRunPanel environmentId="env-core-eu1" onPlan={onPlan} />,
    );
    fireEvent.click(screen.getByTestId("tm-live-collection-plan-button"));
    await Promise.resolve();
    await Promise.resolve();
    expect(
      await screen.findByTestId("tm-live-collection-result"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("tm-live-collection-readiness"),
    ).toHaveTextContent(/ready/);
    expect(
      screen.getByTestId("tm-live-collection-command-0"),
    ).toHaveTextContent(/show lldp neighbors detail/);
    expect(
      screen.getByTestId("tm-live-collection-read-only-0"),
    ).toHaveTextContent(/read-only/);
    expect(
      screen.getByTestId("tm-live-collection-result-honesty"),
    ).toHaveTextContent(/Operator review required/);
  });

  it("renders unsupported state with reason", async () => {
    const onPlan = vi.fn(async () =>
      basePlan({
        readiness: "unsupported",
        platform: "fortios",
        raw_platform_hint: "fortios",
        commands: [],
        warnings: ["unsupported_platform", "empty_command_plan"],
        unsupported_reason: "parser_unsupported",
      }),
    );
    render(
      <LiveCollectionDryRunPanel environmentId="env-core-eu1" onPlan={onPlan} />,
    );
    fireEvent.click(screen.getByTestId("tm-live-collection-plan-button"));
    await Promise.resolve();
    await Promise.resolve();
    expect(
      await screen.findByTestId("tm-live-collection-unsupported"),
    ).toHaveTextContent(/parser_unsupported/);
    expect(
      screen.getByTestId("tm-live-collection-warning-unsupported_platform"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("tm-live-collection-commands-empty"),
    ).toBeInTheDocument();
  });

  it("renders replace-mode warning when planner returns it", async () => {
    const onPlan = vi.fn(async () =>
      basePlan({
        planned_import_mode: "replace",
        warnings: ["replace_import_mode_selected"],
      }),
    );
    render(
      <LiveCollectionDryRunPanel environmentId="env-core-eu1" onPlan={onPlan} />,
    );
    fireEvent.change(screen.getByTestId("tm-live-collection-import-mode"), {
      target: { value: "replace" },
    });
    fireEvent.click(screen.getByTestId("tm-live-collection-plan-button"));
    await Promise.resolve();
    await Promise.resolve();
    expect(
      await screen.findByTestId(
        "tm-live-collection-warning-replace_import_mode_selected",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("tm-live-collection-result-import-mode"),
    ).toHaveTextContent(/replace/);
  });

  it("surfaces planner errors observably", async () => {
    const onPlan = vi.fn(async () => {
      throw new Error("backend exploded");
    });
    render(
      <LiveCollectionDryRunPanel environmentId="env-core-eu1" onPlan={onPlan} />,
    );
    fireEvent.click(screen.getByTestId("tm-live-collection-plan-button"));
    await Promise.resolve();
    await Promise.resolve();
    expect(
      await screen.findByTestId("tm-live-collection-error"),
    ).toHaveTextContent(/Planner failed: backend exploded/);
  });

  it("safety checklist renders every item from the plan", async () => {
    const onPlan = vi.fn(async () => basePlan());
    render(
      <LiveCollectionDryRunPanel environmentId="env-core-eu1" onPlan={onPlan} />,
    );
    fireEvent.click(screen.getByTestId("tm-live-collection-plan-button"));
    await Promise.resolve();
    await Promise.resolve();
    const checklist = await screen.findByTestId(
      "tm-live-collection-checklist",
    );
    expect(checklist).toHaveTextContent(/Operator review required/);
    expect(checklist).toHaveTextContent(/read-only/);
  });
});
