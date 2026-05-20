import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssessPanel } from "../AssessPanel";
import type { LoadResult } from "../loadBatchRunJson";
import type { BatchRunExport } from "../../../types/batchRunExport";

function makeArtifact(): BatchRunExport {
  return {
    export_version: 1,
    kind: "batch_run_export",
    batch_run_status: "complete",
    source: { kind: "paste" },
    summary: {
      total_count: 0,
      parsed_count: 0,
      failed_count: 0,
      skipped_count: 0,
      pending_count: 0,
      with_findings_count: 0,
      clean_count: 0,
      severity_counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    },
    generated_by: { app_name: "Anthracite", stage: "V1R" },
    versions: {
      validator_versions: [],
      rule_pack_versions: [],
      parser_versions: [],
      registry_versions: [],
    },
    devices: [],
    omitted: {
      raw_config_text: "omitted_by_default",
      detection_evidence_preview: "omitted_to_avoid_raw_config_excerpt",
      finding_raw_excerpt: "omitted_to_avoid_raw_config_excerpt",
      device_model: "omitted_use_receipt_summary",
      timestamps: "omitted_for_determinism",
      batch_run_epoch: "omitted_frontend_control_only",
    },
  };
}

function dummyLoader(): () => Promise<LoadResult> {
  return vi.fn(
    async (): Promise<LoadResult> => ({
      kind: "ok",
      artifact: makeArtifact(),
      filename: "test.json",
    }),
  );
}

describe("AssessPanel — ModeWorkbenchShell integration", () => {
  it("workbench shell renders with mode-workbench testid", () => {
    render(<AssessPanel loader={dummyLoader()} />);
    expect(screen.getByTestId("mode-workbench")).toBeInTheDocument();
  });

  it("default active tool is viewer", () => {
    render(<AssessPanel loader={dummyLoader()} />);
    expect(screen.getByTestId("mwb-tool-viewer")).toHaveAttribute("aria-selected", "true");
  });

  it("rail exposes all 5 tools with correct labels", () => {
    render(<AssessPanel loader={dummyLoader()} />);
    expect(screen.getByTestId("mwb-tool-viewer")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Assessment Viewer/i })).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-pipeline")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Run Pipeline/i })).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-compliance")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Compliance/i })).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-report_export")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Report Export/i })).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-evidence_receipts")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Evidence.*Receipts/i })).toBeInTheDocument();
  });

  it("clicking pipeline renders assess-pipeline-planner panel", async () => {
    render(<AssessPanel loader={dummyLoader()} />);
    const pipelineBtn = screen.getByTestId("mwb-tool-pipeline");
    await userEvent.click(pipelineBtn);
    expect(screen.getByTestId("assess-pipeline-planner")).toBeInTheDocument();
  });

  it("clicking report_export shows deferred state with planned controls including Executive summary", async () => {
    render(<AssessPanel loader={dummyLoader()} />);
    const reportExportBtn = screen.getByTestId("mwb-tool-report_export");
    await userEvent.click(reportExportBtn);
    expect(screen.getByTestId("mwb-deferred-report_export")).toBeInTheDocument();
    expect(screen.getByText(/Executive summary/)).toBeInTheDocument();
  });

  it("clicking evidence_receipts shows deferred state with planned controls including Timestamp timeline", async () => {
    render(<AssessPanel loader={dummyLoader()} />);
    const evidenceBtn = screen.getByTestId("mwb-tool-evidence_receipts");
    await userEvent.click(evidenceBtn);
    expect(screen.getByTestId("mwb-deferred-evidence_receipts")).toBeInTheDocument();
    expect(screen.getByText(/Timestamp timeline/)).toBeInTheDocument();
  });

  it("returning to viewer restores assess-root class", async () => {
    render(<AssessPanel loader={dummyLoader()} />);
    const pipelineBtn = screen.getByTestId("mwb-tool-pipeline");
    await userEvent.click(pipelineBtn);
    expect(screen.queryByText("Open assessment file")).not.toBeInTheDocument();
    const viewerBtn = screen.getByTestId("mwb-tool-viewer");
    await userEvent.click(viewerBtn);
    expect(screen.getByRole("button", { name: "Open assessment file" })).toBeInTheDocument();
  });

  it("tool labels do not include forbidden terms", () => {
    render(<AssessPanel loader={dummyLoader()} />);
    const toolButtons = Array.from(screen.getAllByRole("tab")).map(
      (btn) => btn.textContent || "",
    );
    toolButtons.forEach((label) => {
      expect(label).not.toMatch(/Forge|Intelligence|AI|Library/i);
    });
  });
});
