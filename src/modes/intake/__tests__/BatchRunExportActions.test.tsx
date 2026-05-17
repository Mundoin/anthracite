import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { BatchRun } from "../../../types/batchRun";
import { RunSummaryStrip } from "../components/RunSummaryStrip";

function run(status: BatchRun["status"]): BatchRun {
  return {
    source: { kind: "paste" },
    devices: [],
    summary: {
      total_count: 1,
      parsed_count: status === "idle" ? 0 : 1,
      failed_count: status === "complete_with_failures" ? 1 : 0,
      skipped_count: 0,
      pending_count: status === "in_progress" || status === "idle" ? 1 : 0,
      with_findings_count: 0,
      clean_count: status === "complete" ? 1 : 0,
      severity_counts: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      },
    },
    status,
    epoch: 1,
  };
}

describe("BatchRun export actions", () => {
  it("are hidden before a terminal BatchRun exists", () => {
    const { rerender } = render(
      <RunSummaryStrip
        batchRun={null}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
        disabled={false}
        onCopyJson={vi.fn()}
        onCopyMarkdown={vi.fn()}
        exportStatus={null}
      />,
    );
    expect(screen.queryByRole("button", { name: "Copy JSON" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy Markdown" })).toBeNull();

    rerender(
      <RunSummaryStrip
        batchRun={run("in_progress")}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
        disabled={false}
        onCopyJson={vi.fn()}
        onCopyMarkdown={vi.fn()}
        exportStatus={null}
      />,
    );
    expect(screen.queryByRole("button", { name: "Copy JSON" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy Markdown" })).toBeNull();
  });

  it("are visible after complete and complete_with_failures", () => {
    const { rerender } = render(
      <RunSummaryStrip
        batchRun={run("complete")}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
        disabled={false}
        onCopyJson={vi.fn()}
        onCopyMarkdown={vi.fn()}
        exportStatus={null}
      />,
    );
    expect(screen.getByRole("button", { name: "Copy JSON" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy Markdown" }),
    ).toBeInTheDocument();

    rerender(
      <RunSummaryStrip
        batchRun={run("complete_with_failures")}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
        disabled={false}
        onCopyJson={vi.fn()}
        onCopyMarkdown={vi.fn()}
        exportStatus={null}
      />,
    );
    expect(screen.getByRole("button", { name: "Copy JSON" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy Markdown" }),
    ).toBeInTheDocument();
  });

  it("fires copy handlers and displays success/failure feedback", async () => {
    const user = userEvent.setup();
    const onCopyJson = vi.fn();
    const { rerender } = render(
      <RunSummaryStrip
        batchRun={run("complete")}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
        disabled={false}
        onCopyJson={onCopyJson}
        onCopyMarkdown={vi.fn()}
        exportStatus={{ kind: "copied", format: "json" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Copy JSON" }));
    expect(onCopyJson).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status", { name: "Export copied" })).toHaveTextContent(
      "copied JSON",
    );

    rerender(
      <RunSummaryStrip
        batchRun={run("complete")}
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
        disabled={false}
        onCopyJson={onCopyJson}
        onCopyMarkdown={vi.fn()}
        exportStatus={{
          kind: "failed",
          format: "markdown",
          message: "clipboard denied",
        }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "failed Markdown: clipboard denied",
    );
  });

  describe("save actions", () => {
    it("are not rendered when save handlers are not provided", () => {
      render(
        <RunSummaryStrip
          batchRun={run("complete")}
          onAnalyse={vi.fn()}
          onReRun={vi.fn()}
          disabled={false}
          onCopyJson={vi.fn()}
          onCopyMarkdown={vi.fn()}
          exportStatus={null}
        />,
      );
      expect(screen.queryByRole("button", { name: "Save JSON" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Save Markdown" })).toBeNull();
    });

    it("are rendered when save handlers are provided on terminal run", () => {
      const { rerender } = render(
        <RunSummaryStrip
          batchRun={run("complete")}
          onAnalyse={vi.fn()}
          onReRun={vi.fn()}
          disabled={false}
          onCopyJson={vi.fn()}
          onCopyMarkdown={vi.fn()}
          onSaveJson={vi.fn()}
          onSaveMarkdown={vi.fn()}
          exportStatus={null}
        />,
      );
      expect(screen.getByRole("button", { name: "Save JSON" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Markdown" })).toBeInTheDocument();

      rerender(
        <RunSummaryStrip
          batchRun={run("complete_with_failures")}
          onAnalyse={vi.fn()}
          onReRun={vi.fn()}
          disabled={false}
          onCopyJson={vi.fn()}
          onCopyMarkdown={vi.fn()}
          onSaveJson={vi.fn()}
          onSaveMarkdown={vi.fn()}
          exportStatus={null}
        />,
      );
      expect(screen.getByRole("button", { name: "Save JSON" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save Markdown" })).toBeInTheDocument();
    });

    it("are gated to terminal BatchRun only (not idle, not in_progress)", () => {
      const { rerender } = render(
        <RunSummaryStrip
          batchRun={null}
          onAnalyse={vi.fn()}
          onReRun={vi.fn()}
          disabled={false}
          onCopyJson={vi.fn()}
          onCopyMarkdown={vi.fn()}
          onSaveJson={vi.fn()}
          onSaveMarkdown={vi.fn()}
          exportStatus={null}
        />,
      );
      expect(screen.queryByRole("button", { name: "Save JSON" })).toBeNull();

      rerender(
        <RunSummaryStrip
          batchRun={run("in_progress")}
          onAnalyse={vi.fn()}
          onReRun={vi.fn()}
          disabled={false}
          onCopyJson={vi.fn()}
          onCopyMarkdown={vi.fn()}
          onSaveJson={vi.fn()}
          onSaveMarkdown={vi.fn()}
          exportStatus={null}
        />,
      );
      expect(screen.queryByRole("button", { name: "Save JSON" })).toBeNull();
    });

    it("fires save handlers on click", async () => {
      const user = userEvent.setup();
      const onSaveJson = vi.fn();
      const onSaveMarkdown = vi.fn();
      render(
        <RunSummaryStrip
          batchRun={run("complete")}
          onAnalyse={vi.fn()}
          onReRun={vi.fn()}
          disabled={false}
          onCopyJson={vi.fn()}
          onCopyMarkdown={vi.fn()}
          onSaveJson={onSaveJson}
          onSaveMarkdown={onSaveMarkdown}
          exportStatus={null}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Save JSON" }));
      expect(onSaveJson).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole("button", { name: "Save Markdown" }));
      expect(onSaveMarkdown).toHaveBeenCalledTimes(1);
    });

    it("displays saved status", () => {
      render(
        <RunSummaryStrip
          batchRun={run("complete")}
          onAnalyse={vi.fn()}
          onReRun={vi.fn()}
          disabled={false}
          onCopyJson={vi.fn()}
          onCopyMarkdown={vi.fn()}
          onSaveJson={vi.fn()}
          onSaveMarkdown={vi.fn()}
          exportStatus={{ kind: "saved", format: "json" }}
        />,
      );
      expect(screen.getByRole("status", { name: "Export saved" })).toHaveTextContent(
        "saved JSON",
      );
    });

    it("displays save failure status", () => {
      render(
        <RunSummaryStrip
          batchRun={run("complete")}
          onAnalyse={vi.fn()}
          onReRun={vi.fn()}
          disabled={false}
          onCopyJson={vi.fn()}
          onCopyMarkdown={vi.fn()}
          onSaveJson={vi.fn()}
          onSaveMarkdown={vi.fn()}
          exportStatus={{
            kind: "failed",
            format: "markdown",
            message: "write denied",
          }}
        />,
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        "failed Markdown: write denied",
      );
    });
  });
});
