import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { BatchRun } from "../../../types/batchRun";
import { RunSummaryStrip } from "../components/RunSummaryStrip";

function makeRun(overrides: Partial<BatchRun> = {}): BatchRun {
  return {
    source: { kind: "paste" },
    devices: [],
    summary: {
      total_count: 0,
      parsed_count: 0,
      failed_count: 0,
      skipped_count: 0,
      pending_count: 0,
      with_findings_count: 0,
      clean_count: 0,
      severity_counts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      },
    },
    status: "idle",
    epoch: 1,
    ...overrides,
  };
}

describe("RunSummaryStrip", () => {
  it("batchRun null → '(not yet analysed)' visible, Analyse button enabled", () => {
    const onAnalyse = vi.fn();
    render(
      <RunSummaryStrip
        batchRun={null}
        onAnalyse={onAnalyse}
        onReRun={vi.fn()}
        disabled={false}
      />,
    );
    expect(screen.getByText(/not yet analysed/i)).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: "Analyse batch" });
    expect(btn).not.toBeDisabled();
  });

  it("status in_progress → Analysing… indicator visible; both buttons absent or disabled", () => {
    render(
      <RunSummaryStrip
        batchRun={makeRun({
          status: "in_progress",
          summary: {
            total_count: 3,
            parsed_count: 1,
            failed_count: 0,
            skipped_count: 0,
            pending_count: 2,
            with_findings_count: 0,
            clean_count: 1,
            severity_counts: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              info: 0,
            },
          },
        })}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
        disabled={false}
      />,
    );
    expect(screen.getByRole("status", { name: "Analysing" })).toBeInTheDocument();
    // Neither Analyse nor Re-run rendered while in_progress.
    expect(
      screen.queryByRole("button", { name: "Analyse batch" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Re-run analysis" }),
    ).toBeNull();
  });

  it("status complete with mixed findings → counts render verbatim; Re-run visible", () => {
    render(
      <RunSummaryStrip
        batchRun={makeRun({
          status: "complete",
          summary: {
            total_count: 5,
            parsed_count: 5,
            failed_count: 0,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 2,
            clean_count: 3,
            severity_counts: {
              critical: 0,
              high: 3,
              medium: 1,
              low: 0,
              info: 4,
            },
          },
        })}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
        disabled={false}
      />,
    );
    expect(screen.getByText(/5 devices/)).toBeInTheDocument();
    expect(screen.getByText("5 parsed")).toBeInTheDocument();
    expect(screen.getByText("0 failed")).toBeInTheDocument();
    expect(screen.getByText("2 with findings")).toBeInTheDocument();
    expect(screen.getByText("3 clean")).toBeInTheDocument();
    expect(screen.getByText("H 3")).toBeInTheDocument();
    expect(screen.getByText("M 1")).toBeInTheDocument();
    expect(screen.getByText("L 0")).toBeInTheDocument();
    expect(screen.getByText("I 4")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Re-run analysis" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Analyse batch" }),
    ).toBeNull();
  });

  it("status complete_with_failures → failed_count surfaced; Re-run visible", () => {
    render(
      <RunSummaryStrip
        batchRun={makeRun({
          status: "complete_with_failures",
          summary: {
            total_count: 3,
            parsed_count: 2,
            failed_count: 1,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 1,
            clean_count: 1,
            severity_counts: {
              critical: 0,
              high: 1,
              medium: 0,
              low: 0,
              info: 0,
            },
          },
        })}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
        disabled={false}
      />,
    );
    expect(screen.getByText("1 failed")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Re-run analysis" }),
    ).toBeInTheDocument();
  });

  it("Analyse button click fires onAnalyse", async () => {
    const user = userEvent.setup();
    const onAnalyse = vi.fn();
    render(
      <RunSummaryStrip
        batchRun={null}
        onAnalyse={onAnalyse}
        onReRun={vi.fn()}
        disabled={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Analyse batch" }));
    expect(onAnalyse).toHaveBeenCalledTimes(1);
  });

  it("Re-run button click fires onReRun", async () => {
    const user = userEvent.setup();
    const onReRun = vi.fn();
    render(
      <RunSummaryStrip
        batchRun={makeRun({
          status: "complete",
          summary: {
            total_count: 1,
            parsed_count: 1,
            failed_count: 0,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 0,
            clean_count: 1,
            severity_counts: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              info: 0,
            },
          },
        })}
        onAnalyse={vi.fn()}
        onReRun={onReRun}
        disabled={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Re-run analysis" }));
    expect(onReRun).toHaveBeenCalledTimes(1);
  });

  it("disabled prop disables both buttons even when visible", () => {
    const { rerender } = render(
      <RunSummaryStrip
        batchRun={null}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
        disabled={true}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Analyse batch" }),
    ).toBeDisabled();
    rerender(
      <RunSummaryStrip
        batchRun={makeRun({
          status: "complete",
          summary: {
            total_count: 1,
            parsed_count: 1,
            failed_count: 0,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 0,
            clean_count: 1,
            severity_counts: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              info: 0,
            },
          },
        })}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
        disabled={true}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Re-run analysis" }),
    ).toBeDisabled();
  });

  it("severity counts render verbatim from batchRun.summary.severity_counts", () => {
    render(
      <RunSummaryStrip
        batchRun={makeRun({
          status: "complete",
          summary: {
            total_count: 1,
            parsed_count: 1,
            failed_count: 0,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 1,
            clean_count: 0,
            severity_counts: {
              critical: 7,
              high: 11,
              medium: 13,
              low: 17,
              info: 19,
            },
          },
        })}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
        disabled={false}
      />,
    );
    expect(screen.getByText("C 7")).toBeInTheDocument();
    expect(screen.getByText("H 11")).toBeInTheDocument();
    expect(screen.getByText("M 13")).toBeInTheDocument();
    expect(screen.getByText("L 17")).toBeInTheDocument();
    expect(screen.getByText("I 19")).toBeInTheDocument();
  });
});
