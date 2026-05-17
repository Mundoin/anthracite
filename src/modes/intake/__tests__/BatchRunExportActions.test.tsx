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
});
