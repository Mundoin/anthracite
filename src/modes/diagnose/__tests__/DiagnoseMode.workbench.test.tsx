import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiagnoseMode } from "../DiagnoseMode";
import type { DiscoverySourceView } from "../../../data/discoverySource";
import type { TopologySourceView } from "../../../data/topologySource";

function discoveryEmpty(): DiscoverySourceView {
  return {
    sourceState: "not_connected",
    environmentId: null,
    totalRecords: 0,
    message: "not connected",
    isEmpty: false,
    view: null,
  };
}

function topologyEmpty(): TopologySourceView {
  return {
    sourceState: "not_connected",
    environmentId: null,
    nodeCount: 0,
    edgeCount: 0,
    sourceRecordCount: 0,
    message: "not connected",
    isEmpty: false,
    projectionStats: null,
    evidenceStats: null,
    view: null,
  };
}

describe("DiagnoseMode — ModeWorkbenchShell integration", () => {
  it("workbench shell renders with mode-workbench testid", () => {
    render(<DiagnoseMode discovery={discoveryEmpty()} topology={topologyEmpty()} />);
    expect(screen.getByTestId("mode-workbench")).toBeInTheDocument();
  });

  it("default active tool is findings", () => {
    render(<DiagnoseMode discovery={discoveryEmpty()} topology={topologyEmpty()} />);
    expect(screen.getByTestId("mwb-tool-findings")).toHaveAttribute("aria-selected", "true");
  });

  it("rail exposes all 6 tools with correct labels", () => {
    render(<DiagnoseMode discovery={discoveryEmpty()} topology={topologyEmpty()} />);
    expect(screen.getByTestId("mwb-tool-findings")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Findings/i })).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-config_audit")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Config Audit/i })).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-troubleshoot")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Troubleshoot/i })).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-device_access")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Device Access/i })).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-path_trace")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Path Trace/i })).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-hypothesis_strip")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Hypothesis Strip/i })).toBeInTheDocument();
  });

  it("clicking config_audit shows deferred state with planned inputs including Rule pack", async () => {
    render(<DiagnoseMode discovery={discoveryEmpty()} topology={topologyEmpty()} />);
    const configAuditBtn = screen.getByTestId("mwb-tool-config_audit");
    await userEvent.click(configAuditBtn);
    expect(screen.getByTestId("mwb-deferred-config_audit")).toBeInTheDocument();
    expect(
      screen.getByText(/Rule pack/),
    ).toBeInTheDocument();
  });

  it("clicking troubleshoot shows deferred state with planned controls including Blast radius", async () => {
    render(<DiagnoseMode discovery={discoveryEmpty()} topology={topologyEmpty()} />);
    const troubleshootBtn = screen.getByTestId("mwb-tool-troubleshoot");
    await userEvent.click(troubleshootBtn);
    expect(screen.getByTestId("mwb-deferred-troubleshoot")).toBeInTheDocument();
    expect(screen.getByText(/Blast radius/)).toBeInTheDocument();
  });

  it("returning to findings restores existing diagnose testid structure", async () => {
    render(<DiagnoseMode discovery={discoveryEmpty()} topology={topologyEmpty()} />);
    const configAuditBtn = screen.getByTestId("mwb-tool-config_audit");
    await userEvent.click(configAuditBtn);
    expect(screen.queryByTestId("dx-summary")).not.toBeInTheDocument();
    const findingsBtn = screen.getByTestId("mwb-tool-findings");
    await userEvent.click(findingsBtn);
    expect(screen.getByTestId("dx-summary")).toBeInTheDocument();
  });

  it("tool labels do not include forbidden terms", () => {
    render(<DiagnoseMode discovery={discoveryEmpty()} topology={topologyEmpty()} />);
    const toolButtons = Array.from(screen.getAllByRole("tab")).map(
      (btn) => btn.textContent || "",
    );
    toolButtons.forEach((label) => {
      expect(label).not.toMatch(/Forge|Intelligence|AI|Library/i);
    });
  });

  it("device_access status is preview and reason mentions no terminal", async () => {
    render(<DiagnoseMode discovery={discoveryEmpty()} topology={topologyEmpty()} />);
    const deviceAccessBtn = screen.getByTestId("mwb-tool-device_access");
    expect(deviceAccessBtn).toHaveAttribute("data-tool-status", "preview");
    await userEvent.click(deviceAccessBtn);
    expect(screen.getByText(/No terminal/)).toBeInTheDocument();
  });
});
