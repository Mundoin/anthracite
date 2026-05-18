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

describe("LiveCollectionDryRunPanel — V1AU fixture simulator", () => {
  function rawImportResult() {
    return {
      parsed_entries_total: 1,
      accepted_evidence_count: 1,
      rejected_count: 0,
      unresolved_count: 0,
      stored_evidence_count: 1,
      evidence_set_id: "set-1",
      accepted_evidence: [],
      rejected_entries: [],
    };
  }

  async function planThen(plan = basePlan()) {
    const onPlan = vi.fn(async () => plan);
    const onImportRaw = vi.fn(async () => rawImportResult());
    render(
      <LiveCollectionDryRunPanel
        environmentId="env-core-eu1"
        onPlan={onPlan}
        onImportRawNeighborOutput={onImportRaw}
      />,
    );
    fireEvent.click(screen.getByTestId("tm-live-collection-plan-button"));
    await Promise.resolve();
    await Promise.resolve();
    return { onPlan, onImportRaw };
  }

  it("renders fixture simulator section after ready plan with honesty note", async () => {
    await planThen();
    expect(
      await screen.findByTestId("tm-live-simulator"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("tm-live-simulator-honesty"),
    ).toHaveTextContent(/No device contact/i);
  });

  it("contains no host/IP/credential inputs in simulator section", async () => {
    await planThen();
    const section = await screen.findByTestId("tm-live-simulator");
    expect(section.querySelector('input[type="password"]')).toBeNull();
    section.querySelectorAll("input, select, textarea").forEach((node) => {
      const id = node.getAttribute("data-testid") ?? "";
      expect(id).not.toMatch(/password|credential|username|host|ip|ssh/i);
    });
  });

  it("Simulate button fires raw-import callback with V1AP/V1AQ wire shape", async () => {
    const { onImportRaw } = await planThen();
    fireEvent.click(
      await screen.findByTestId("tm-live-simulator-button"),
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(onImportRaw).toHaveBeenCalledTimes(1);
    const req = onImportRaw.mock.calls[0][0];
    expect(req.environment_id).toBe("env-core-eu1");
    expect(req.source_kind).toBe("lldp");
    expect(req.platform_hint).toBe("iosxe");
    expect(req.mode).toBe("merge");
    expect(req.raw_text.length).toBeGreaterThan(0);
    expect(req.source_label).toMatch(/simulator:/);
    const reqKeys = Object.keys(req);
    reqKeys.forEach((k) =>
      expect(k).not.toMatch(/host|ip|password|credential|username|ssh/i),
    );
    expect(
      await screen.findByTestId("tm-live-simulator-feedback"),
    ).toHaveTextContent(/Parsed 1.*Accepted 1.*Stored 1/);
  });

  it("threads the planned import mode through the request", async () => {
    const replacePlan = basePlan({
      planned_import_mode: "replace",
      warnings: ["replace_import_mode_selected"],
    });
    const onImportRaw = vi.fn(async () => rawImportResult());
    const onPlan = vi.fn(async () => replacePlan);
    render(
      <LiveCollectionDryRunPanel
        environmentId="env-core-eu1"
        onPlan={onPlan}
        onImportRawNeighborOutput={onImportRaw}
      />,
    );
    fireEvent.click(screen.getByTestId("tm-live-collection-plan-button"));
    await Promise.resolve();
    await Promise.resolve();
    fireEvent.click(
      await screen.findByTestId("tm-live-simulator-button"),
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(onImportRaw.mock.calls[0][0].mode).toBe("replace");
    // V1AT replace-mode warning still visible.
    expect(
      screen.getByTestId(
        "tm-live-collection-warning-replace_import_mode_selected",
      ),
    ).toBeInTheDocument();
  });

  it("renders no-fixture honest message when planned command has no fixture", async () => {
    const junosCdp = basePlan({
      platform: "junos",
      raw_platform_hint: "junos",
      commands: [
        {
          source_kind: "cdp",
          command: "show cdp neighbors",
          read_only: true,
          raw_neighbor_source_kind: "cdp",
          platform_hint: "junos",
          planned_import_function: "importTopologyNeighborOutput",
          note: "Junos CDP",
        },
      ],
    });
    await planThen(junosCdp);
    expect(
      await screen.findByTestId("tm-live-simulator-no-fixture"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("tm-live-simulator-button")).toBeNull();
  });

  it("renders unavailable message for unsupported platform plan", async () => {
    const fortios = basePlan({
      readiness: "unsupported",
      platform: "fortios",
      raw_platform_hint: "fortios",
      commands: [],
      warnings: ["unsupported_platform", "empty_command_plan"],
      unsupported_reason: "parser_unsupported",
    });
    await planThen(fortios);
    expect(
      await screen.findByTestId("tm-live-simulator-unavailable"),
    ).toHaveTextContent(/unavailable/i);
  });

  it("surfaces simulator errors observably without throwing", async () => {
    const onPlan = vi.fn(async () => basePlan());
    const onImportRaw = vi.fn(async () => {
      throw new Error("backend rejected");
    });
    render(
      <LiveCollectionDryRunPanel
        environmentId="env-core-eu1"
        onPlan={onPlan}
        onImportRawNeighborOutput={onImportRaw}
      />,
    );
    fireEvent.click(screen.getByTestId("tm-live-collection-plan-button"));
    await Promise.resolve();
    await Promise.resolve();
    fireEvent.click(
      await screen.findByTestId("tm-live-simulator-button"),
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(
      await screen.findByTestId("tm-live-simulator-error"),
    ).toHaveTextContent(/Simulation import failed: backend rejected/);
  });

  it("disables simulator when import callback missing", async () => {
    const onPlan = vi.fn(async () => basePlan());
    render(
      <LiveCollectionDryRunPanel
        environmentId="env-core-eu1"
        onPlan={onPlan}
      />,
    );
    fireEvent.click(screen.getByTestId("tm-live-collection-plan-button"));
    await Promise.resolve();
    await Promise.resolve();
    expect(
      await screen.findByTestId("tm-live-simulator-button"),
    ).toBeDisabled();
    expect(
      screen.getByTestId("tm-live-simulator-no-callback"),
    ).toBeInTheDocument();
  });
});
