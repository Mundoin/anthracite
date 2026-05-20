/**
 * V1BL — Operate Overview Panel UI tests.
 *
 * Covers panel rendering, readiness/next-action states,
 * lanes table, copy button, and forbidden labels.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  OperateOverviewPanel,
  type OperateOverviewClipboard,
  type OperateOverviewClock,
} from "../OperateOverviewPanel";
import type { OperateOverviewInputs } from "../operateOverview";

const T = "2026-05-20T00:00:00.000Z";

const mockClock: OperateOverviewClock = { now: () => T };

describe("OperateOverviewPanel", () => {
  it("renders panel with operate-overview testid", () => {
    render(
      <OperateOverviewPanel clock={mockClock} />
    );
    const panel = screen.getByTestId("operate-overview");
    expect(panel).toBeInTheDocument();
  });

  it("default (no inputs) shows readiness no_sources + next_action stage_discovery_seeds", () => {
    render(
      <OperateOverviewPanel clock={mockClock} />
    );
    // readiness chip should show "no_sources"
    const readinessText = screen.getAllByText("no_sources")[0];
    expect(readinessText).toBeInTheDocument();
    // Check the callout has the next-action instruction
    const calloutSection = screen.getByTestId("operate-overview-next-action");
    expect(calloutSection.textContent).toContain("stage_discovery_seeds");
  });

  it("inputs with staged_seed_count = 3 shows readiness seeds_staged + next_action build_crawl_preview", () => {
    const inputs: OperateOverviewInputs = {
      staged_seed_count: 3,
      crawl_frontier_count: 0,
      evidence_import_count: 0,
      topology_node_count: 0,
      topology_edge_count: 0,
    };
    render(
      <OperateOverviewPanel inputs={inputs} clock={mockClock} />
    );
    // readiness chip should show "seeds_staged"
    const readinessText = screen.getAllByText("seeds_staged")[0];
    expect(readinessText).toBeInTheDocument();
    // Check the callout has the next-action instruction
    const calloutSection = screen.getByTestId("operate-overview-next-action");
    expect(calloutSection.textContent).toContain("build_crawl_preview");
  });

  it("lanes table renders all 6 lanes with correct labels", () => {
    render(
      <OperateOverviewPanel clock={mockClock} />
    );
    const lanesTable = screen.getByTestId("operate-overview-lanes");
    expect(lanesTable).toBeInTheDocument();
    expect(screen.getByText("Live Overview")).toBeInTheDocument();
    expect(screen.getByText("Topology Operations")).toBeInTheDocument();
    expect(screen.getByText("Polling / SNMP")).toBeInTheDocument();
    expect(screen.getByText("Baselines / Drift")).toBeInTheDocument();
    expect(screen.getByText("Sentinel")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
  });

  it("lanes have testids for each lane", () => {
    render(
      <OperateOverviewPanel clock={mockClock} />
    );
    expect(screen.getByTestId("operate-lane-live_overview")).toBeInTheDocument();
    expect(screen.getByTestId("operate-lane-topology_operations")).toBeInTheDocument();
    expect(screen.getByTestId("operate-lane-polling_snmp")).toBeInTheDocument();
    expect(screen.getByTestId("operate-lane-baselines_drift")).toBeInTheDocument();
    expect(screen.getByTestId("operate-lane-sentinel")).toBeInTheDocument();
    expect(screen.getByTestId("operate-lane-events")).toBeInTheDocument();
  });

  it("copy button calls clipboard.writeText with markdown", async () => {
    const user = userEvent.setup();
    let clipboardText = "";
    const clipboard: OperateOverviewClipboard = {
      writeText: async (text) => {
        clipboardText = text;
      },
    };

    render(
      <OperateOverviewPanel clock={mockClock} clipboard={clipboard} />
    );

    const copyBtn = screen.getByTestId("operate-overview-copy-btn");
    await user.click(copyBtn);

    expect(clipboardText).toContain("# Operate Live Overview");
    expect(clipboardText).toContain("no_sources");
    expect(clipboardText).toContain("Local readiness summary only");
  });

  it("copy button shows 'Copied' after click", async () => {
    const user = userEvent.setup();
    const clipboard: OperateOverviewClipboard = {
      writeText: async () => {},
    };

    render(
      <OperateOverviewPanel clock={mockClock} clipboard={clipboard} />
    );

    const copyBtn = screen.getByTestId("operate-overview-copy-btn");
    expect(copyBtn.textContent).toBe("Copy Operate Overview Markdown");

    await user.click(copyBtn);

    expect(copyBtn.textContent).toBe("Copied");
  });

  it("markdown preview section has details testid", () => {
    render(
      <OperateOverviewPanel clock={mockClock} />
    );
    const preview = screen.getByTestId("operate-overview-markdown-preview");
    expect(preview).toBeInTheDocument();
  });

  it("honesty footer text visible", () => {
    render(
      <OperateOverviewPanel clock={mockClock} />
    );
    const footerElements = screen.getAllByText(/Local readiness summary only — no live polling, no SNMP, no fabricated metrics/);
    expect(footerElements.length).toBeGreaterThan(0);
  });

  it("no forbidden labels appear", () => {
    render(
      <OperateOverviewPanel clock={mockClock} />
    );
    const panel = screen.getByTestId("operate-overview");
    const text = panel.textContent || "";
    expect(text).not.toMatch(/\bForge\b/i);
    expect(text).not.toMatch(/\bIntelligence\b/i);
    expect(text).not.toMatch(/\bAI\b/);
    expect(text).not.toMatch(/\bLibrary\b/i);
  });

  it("metrics section renders with 5 metrics", () => {
    render(
      <OperateOverviewPanel clock={mockClock} />
    );
    const metricsSection = screen.getByTestId("operate-overview-metrics");
    expect(metricsSection).toBeInTheDocument();
    expect(screen.getByTestId("operate-metric-staged_seeds")).toBeInTheDocument();
    expect(screen.getByTestId("operate-metric-preview_frontier")).toBeInTheDocument();
    expect(screen.getByTestId("operate-metric-evidence_imports")).toBeInTheDocument();
    expect(screen.getByTestId("operate-metric-topology_nodes")).toBeInTheDocument();
    expect(screen.getByTestId("operate-metric-active_incidents")).toBeInTheDocument();
  });

  it("next-action section has testid", () => {
    render(
      <OperateOverviewPanel clock={mockClock} />
    );
    const nextAction = screen.getByTestId("operate-overview-next-action");
    expect(nextAction).toBeInTheDocument();
  });
});
