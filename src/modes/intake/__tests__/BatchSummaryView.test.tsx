import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ConfigBatchSplitResult } from "../../../types/configBatch";
import type { ConfigDetectionResult } from "../../../types/configDetection";
import { BatchSummaryView } from "../components/BatchSummaryView";
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
      confidence: 0.7,
      hint: { kind: "hostname_present", hostname: "r2" },
    },
  ],
  method: { kind: "heuristic" },
  warnings: [],
  total_line_count: 17,
  scanned_line_count: 17,
  splitter_version: "1",
};

const DETECTION: ConfigDetectionResult = {
  best_match: {
    platform_id: "cisco-iosxe",
    vendor: "cisco",
    os_family: "iosxe",
    os_version_raw: null,
    os_version_normalized: null,
    detection_confidence: 0.95,
  },
  candidates: [],
  evidence: [],
  confidence: 0.95,
  warnings: [],
  scanned_line_count: 2,
  total_line_count: 2,
};

describe("BatchSummaryView", () => {
  it("renders one row per slice in splitter order", () => {
    const per: Record<string, PerSliceDetection> = {
      "slice-0": { status: "pending" },
      "slice-1": { status: "pending" },
    };
    render(
      <BatchSummaryView
        result={RESULT}
        perSliceDetection={per}
        onOpenSlice={() => {}}
        onTreatAsSingleConfig={() => {}}
        disabled={false}
      />,
    );
    expect(screen.getByText("slice-0")).toBeInTheDocument();
    expect(screen.getByText("slice-1")).toBeInTheDocument();
    expect(screen.getByText("r1")).toBeInTheDocument();
    expect(screen.getByText("r2")).toBeInTheDocument();
  });

  it("shows per-slice detection result when present", () => {
    const per: Record<string, PerSliceDetection> = {
      "slice-0": { status: "detected", result: DETECTION },
      "slice-1": { status: "pending" },
    };
    render(
      <BatchSummaryView
        result={RESULT}
        perSliceDetection={per}
        onOpenSlice={() => {}}
        onTreatAsSingleConfig={() => {}}
        disabled={false}
      />,
    );
    expect(screen.getByText(/cisco-iosxe/)).toBeInTheDocument();
    expect(screen.getByText("detecting…")).toBeInTheDocument();
  });

  it("surfaces per-slice detection failure honestly", () => {
    const per: Record<string, PerSliceDetection> = {
      "slice-0": { status: "failed", message: "rpc down" },
      "slice-1": { status: "pending" },
    };
    render(
      <BatchSummaryView
        result={RESULT}
        perSliceDetection={per}
        onOpenSlice={() => {}}
        onTreatAsSingleConfig={() => {}}
        disabled={false}
      />,
    );
    expect(screen.getByText("FAILED")).toBeInTheDocument();
  });

  it("clicking Open dispatches onOpenSlice with slice id", async () => {
    const user = userEvent.setup();
    const onOpenSlice = vi.fn();
    render(
      <BatchSummaryView
        result={RESULT}
        perSliceDetection={{
          "slice-0": { status: "pending" },
          "slice-1": { status: "pending" },
        }}
        onOpenSlice={onOpenSlice}
        onTreatAsSingleConfig={() => {}}
        disabled={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Open slice-1" }));
    expect(onOpenSlice).toHaveBeenCalledWith("slice-1");
  });

  it("hides Treat-as-single-config button when no ambiguous warnings", () => {
    render(
      <BatchSummaryView
        result={RESULT}
        perSliceDetection={{}}
        onOpenSlice={() => {}}
        onTreatAsSingleConfig={() => {}}
        disabled={false}
      />,
    );
    expect(screen.queryByRole("button", { name: "Treat as single config" })).toBeNull();
  });

  it("shows Treat-as-single-config when ambiguous_boundary warning present", async () => {
    const user = userEvent.setup();
    const onTreatAsSingleConfig = vi.fn();
    const ambiguous: ConfigBatchSplitResult = {
      ...RESULT,
      warnings: [{ kind: "ambiguous_boundary", near_line: 5 }],
    };
    render(
      <BatchSummaryView
        result={ambiguous}
        perSliceDetection={{}}
        onOpenSlice={() => {}}
        onTreatAsSingleConfig={onTreatAsSingleConfig}
        disabled={false}
      />,
    );
    const btn = screen.getByRole("button", { name: "Treat as single config" });
    await user.click(btn);
    expect(onTreatAsSingleConfig).toHaveBeenCalledTimes(1);
  });

  it("renders splitter warnings verbatim by kind", () => {
    const withWarnings: ConfigBatchSplitResult = {
      ...RESULT,
      warnings: [
        { kind: "low_confidence_split", slice_id: "slice-1" },
        { kind: "ambiguous_boundary", near_line: 9 },
      ],
    };
    render(
      <BatchSummaryView
        result={withWarnings}
        perSliceDetection={{}}
        onOpenSlice={() => {}}
        onTreatAsSingleConfig={() => {}}
        disabled={false}
      />,
    );
    expect(screen.getByText("low_confidence_split")).toBeInTheDocument();
    expect(screen.getByText("ambiguous_boundary")).toBeInTheDocument();
  });
});
