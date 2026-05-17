/**
 * V1Q — BatchSummaryView with run columns.
 *
 * Additive tests over the existing BatchSummaryView.test.tsx
 * suite. Existing markup queries (slice id, hostname,
 * detection cell, Open button) must continue to pass; this
 * file covers ONLY the new Stage + Findings cells and the
 * RunSummaryStrip that V1Q adds when batchRun props are
 * supplied.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type {
  BatchRun,
  BatchRunDevice,
  DeviceStageStatus,
} from "../../../types/batchRun";
import type { ConfigBatchSplitResult } from "../../../types/configBatch";
import type {
  Finding,
  Severity,
  ValidationReport,
} from "../../../types/validator";
import { BatchSummaryView } from "../components/BatchSummaryView";
import { deriveBatchRunSummary } from "../orchestration/batchRunSummary";
import type { PerSliceDetection } from "../intakeTypes";

const RESULT: ConfigBatchSplitResult = {
  slices: [
    {
      slice_id: "slice-0",
      line_start: 1,
      line_end: 8,
      raw_text: "hostname r1\nend\n",
      confidence: 1.0,
      hint: { kind: "hostname_present", hostname: "r1" },
    },
    {
      slice_id: "slice-1",
      line_start: 10,
      line_end: 17,
      raw_text: "hostname r2\nend\n",
      confidence: 0.85,
      hint: { kind: "hostname_present", hostname: "r2" },
    },
  ],
  method: { kind: "heuristic" },
  warnings: [],
  total_line_count: 17,
  scanned_line_count: 17,
  splitter_version: "1",
};

const PER: Readonly<Record<string, PerSliceDetection>> = {
  "slice-0": { status: "pending" },
  "slice-1": { status: "pending" },
};

function reportWith(severities: ReadonlyArray<Severity>): ValidationReport {
  const findings: ReadonlyArray<Finding> = severities.map((sev, i) => ({
    finding_key: `R-${i}:a:b=${i}`,
    rule_id: `R-${i}`,
    rule_version: 1,
    severity: sev,
    signal: "hard",
    title: `t${i}`,
    evidence: [],
    affected_area: "services_snmp",
    recommendation: null,
  }));
  return {
    validator_version: 1,
    rule_pack_version: 1,
    context: {
      platform_id: "cisco-iosxe",
      parser_id: "cisco-iosxe",
      parser_version: "v3",
      selection_mode: "from_detection",
      detection_confidence: 0.95,
      detection_source: "best_match",
      source_context: null,
    },
    findings,
    clean_rules: [],
    skipped_rules: [],
  };
}

function device(
  sliceId: string,
  stage: DeviceStageStatus,
  report?: ValidationReport,
  errStage?: "parse" | "detect" | "receipt" | "validate",
): BatchRunDevice {
  return {
    slice_id: sliceId,
    hostname_hint: null,
    source_provenance: null,
    stage_status: stage,
    detection_result: null,
    selected_platform: null,
    is_manual_override: false,
    device_model: null,
    receipt: null,
    validation_report: report ?? null,
    stage_error: errStage ? { stage: errStage, message: "boom" } : null,
  };
}

function makeRun(devices: ReadonlyArray<BatchRunDevice>, status: BatchRun["status"]): BatchRun {
  return {
    source: { kind: "paste" },
    devices,
    summary: deriveBatchRunSummary(devices),
    status,
    epoch: 1,
  };
}

describe("BatchSummaryView V1Q — Stage + Findings cells", () => {
  it("RunSummaryStrip renders above the slices table when run props supplied", () => {
    render(
      <BatchSummaryView
        result={RESULT}
        perSliceDetection={PER}
        onOpenSlice={() => undefined}
        onTreatAsSingleConfig={() => undefined}
        disabled={false}
        batchRun={null}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Batch run summary")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analyse batch" }),
    ).toBeInTheDocument();
  });

  it("pre-analyse: Stage cells show 'pending' (or '—'), Findings cells show '—'", () => {
    const run = makeRun(
      [device("slice-0", "pending"), device("slice-1", "pending")],
      "idle",
    );
    render(
      <BatchSummaryView
        result={RESULT}
        perSliceDetection={PER}
        onOpenSlice={() => undefined}
        onTreatAsSingleConfig={() => undefined}
        disabled={false}
        batchRun={run}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
      />,
    );
    // Two "pending" cells (Stage column).
    expect(screen.getAllByText("pending").length).toBeGreaterThanOrEqual(2);
  });

  it("mid-run: a device with stage_status 'parsing' shows 'parsing…'", () => {
    const run = makeRun(
      [device("slice-0", "parsing"), device("slice-1", "pending")],
      "in_progress",
    );
    render(
      <BatchSummaryView
        result={RESULT}
        perSliceDetection={PER}
        onOpenSlice={() => undefined}
        onTreatAsSingleConfig={() => undefined}
        disabled={false}
        batchRun={run}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
      />,
    );
    expect(screen.getByText("parsing…")).toBeInTheDocument();
  });

  it("post-run with findings: Findings cell renders correct severity chips", () => {
    const run = makeRun(
      [
        device("slice-0", "complete", reportWith(["high", "high", "medium"])),
        device("slice-1", "complete", reportWith([])),
      ],
      "complete",
    );
    render(
      <BatchSummaryView
        result={RESULT}
        perSliceDetection={PER}
        onOpenSlice={() => undefined}
        onTreatAsSingleConfig={() => undefined}
        disabled={false}
        batchRun={run}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
      />,
    );
    // Both the per-row Findings cell AND the strip's severity
    // chips render "H 2" / "M 1"; ensure at least one of each
    // appears.
    expect(screen.getAllByText("H 2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("M 1").length).toBeGreaterThanOrEqual(1);
  });

  it("post-run clean: Findings cell shows 'clean'", () => {
    const run = makeRun(
      [device("slice-0", "complete", reportWith([]))],
      "complete",
    );
    render(
      <BatchSummaryView
        result={{ ...RESULT, slices: [RESULT.slices[0]] }}
        perSliceDetection={{ "slice-0": { status: "pending" } }}
        onOpenSlice={() => undefined}
        onTreatAsSingleConfig={() => undefined}
        disabled={false}
        batchRun={run}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
      />,
    );
    expect(screen.getByText("clean")).toBeInTheDocument();
  });

  it("failed device: Stage cell shows 'failed: parse' with tooltip; Findings cell shows '—'", () => {
    const run = makeRun(
      [device("slice-0", "failed", undefined, "parse")],
      "complete_with_failures",
    );
    render(
      <BatchSummaryView
        result={{ ...RESULT, slices: [RESULT.slices[0]] }}
        perSliceDetection={{ "slice-0": { status: "pending" } }}
        onOpenSlice={() => undefined}
        onTreatAsSingleConfig={() => undefined}
        disabled={false}
        batchRun={run}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
      />,
    );
    const stage = screen.getByLabelText("failed: parse");
    expect(stage).toBeInTheDocument();
    expect(stage.getAttribute("title")).toBe("boom");
  });

  it("skipped device: Stage cell shows 'skipped' with tooltip", () => {
    const dev: BatchRunDevice = {
      ...device("slice-0", "skipped"),
      stage_error: { stage: "detect", message: "no_platform_resolved" },
    };
    const run = makeRun([dev], "complete");
    render(
      <BatchSummaryView
        result={{ ...RESULT, slices: [RESULT.slices[0]] }}
        perSliceDetection={{ "slice-0": { status: "pending" } }}
        onOpenSlice={() => undefined}
        onTreatAsSingleConfig={() => undefined}
        disabled={false}
        batchRun={run}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
      />,
    );
    const stage = screen.getByLabelText("skipped");
    expect(stage).toBeInTheDocument();
    expect(stage.getAttribute("title")).toBe("no_platform_resolved");
  });

  it("existing row content (slice id, hostname, Open button) unchanged when batchRun supplied", () => {
    const run = makeRun(
      [device("slice-0", "complete", reportWith([]))],
      "complete",
    );
    render(
      <BatchSummaryView
        result={{ ...RESULT, slices: [RESULT.slices[0]] }}
        perSliceDetection={{ "slice-0": { status: "pending" } }}
        onOpenSlice={() => undefined}
        onTreatAsSingleConfig={() => undefined}
        disabled={false}
        batchRun={run}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
      />,
    );
    expect(screen.getByText("slice-0")).toBeInTheDocument();
    expect(screen.getByText("r1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open slice-0" }),
    ).toBeInTheDocument();
  });

  it("legacy call (no run props) does NOT render the strip or run columns", () => {
    render(
      <BatchSummaryView
        result={RESULT}
        perSliceDetection={PER}
        onOpenSlice={() => undefined}
        onTreatAsSingleConfig={() => undefined}
        disabled={false}
      />,
    );
    expect(screen.queryByLabelText("Batch run summary")).toBeNull();
    expect(screen.queryByText("Stage")).toBeNull();
    expect(screen.queryByText("Findings")).toBeNull();
  });
});
