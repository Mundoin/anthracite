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

describe("RunSummaryStrip — mode='author'", () => {
  it("display null → '(not yet analysed)' visible, Analyse button enabled", () => {
    const onAnalyse = vi.fn();
    render(
      <RunSummaryStrip
        display={null}
        mode="author"
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
        display={makeRun({
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
        mode="author"
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
        disabled={false}
      />,
    );
    expect(screen.getByRole("status", { name: "Analysing" })).toBeInTheDocument();
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
        display={makeRun({
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
        mode="author"
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
        display={makeRun({
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
        mode="author"
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
        display={null}
        mode="author"
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
        display={makeRun({
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
        mode="author"
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
        display={null}
        mode="author"
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
        display={makeRun({
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
        mode="author"
        onAnalyse={vi.fn()}
        onReRun={vi.fn()}
        disabled={true}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Re-run analysis" }),
    ).toBeDisabled();
  });

  it("severity counts render verbatim from display.summary.severity_counts", () => {
    render(
      <RunSummaryStrip
        display={makeRun({
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
        mode="author"
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

// -----------------------------------------------------------------------------
// V1Y — viewer mode
// -----------------------------------------------------------------------------

function makeCompletedRun(): BatchRun {
  return makeRun({
    status: "complete",
    summary: {
      total_count: 4,
      parsed_count: 4,
      failed_count: 0,
      skipped_count: 0,
      pending_count: 0,
      with_findings_count: 2,
      clean_count: 2,
      severity_counts: {
        critical: 1,
        high: 2,
        medium: 3,
        low: 4,
        info: 5,
      },
    },
  });
}

describe("RunSummaryStrip — mode='viewer' (V1Y)", () => {
  it("renders counts but no Analyse button (idle)", () => {
    render(
      <RunSummaryStrip
        display={makeRun({ status: "idle" })}
        mode="viewer"
        onAnalyse={vi.fn()}
      />,
    );
    expect(screen.getByText(/not yet analysed/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Analyse batch" }),
    ).toBeNull();
  });

  it("renders counts but no Re-run button (complete)", () => {
    render(
      <RunSummaryStrip
        display={makeCompletedRun()}
        mode="viewer"
        onReRun={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Re-run analysis" }),
    ).toBeNull();
  });

  it("renders counts but no Copy JSON button (complete)", () => {
    render(
      <RunSummaryStrip
        display={makeCompletedRun()}
        mode="viewer"
        onCopyJson={vi.fn()}
        onCopyMarkdown={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Copy JSON" }),
    ).toBeNull();
  });

  it("renders counts but no Copy Markdown button (complete)", () => {
    render(
      <RunSummaryStrip
        display={makeCompletedRun()}
        mode="viewer"
        onCopyJson={vi.fn()}
        onCopyMarkdown={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Copy Markdown" }),
    ).toBeNull();
  });

  it("renders counts but no Save JSON button (complete)", () => {
    render(
      <RunSummaryStrip
        display={makeCompletedRun()}
        mode="viewer"
        onCopyJson={vi.fn()}
        onCopyMarkdown={vi.fn()}
        onSaveJson={vi.fn()}
        onSaveMarkdown={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Save JSON" }),
    ).toBeNull();
  });

  it("renders counts but no Save Markdown button (complete)", () => {
    render(
      <RunSummaryStrip
        display={makeCompletedRun()}
        mode="viewer"
        onCopyJson={vi.fn()}
        onCopyMarkdown={vi.fn()}
        onSaveJson={vi.fn()}
        onSaveMarkdown={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Save Markdown" }),
    ).toBeNull();
  });

  it("renders counts but no ExportStatusView even if status supplied", () => {
    render(
      <RunSummaryStrip
        display={makeCompletedRun()}
        mode="viewer"
        onCopyJson={vi.fn()}
        onCopyMarkdown={vi.fn()}
        exportStatus={{ kind: "copied", format: "json" }}
      />,
    );
    expect(
      screen.queryByRole("status", { name: "Export copied" }),
    ).toBeNull();
  });

  it("severity counts render verbatim in viewer mode", () => {
    render(
      <RunSummaryStrip display={makeCompletedRun()} mode="viewer" />,
    );
    expect(screen.getByText("C 1")).toBeInTheDocument();
    expect(screen.getByText("H 2")).toBeInTheDocument();
    expect(screen.getByText("M 3")).toBeInTheDocument();
    expect(screen.getByText("L 4")).toBeInTheDocument();
    expect(screen.getByText("I 5")).toBeInTheDocument();
    expect(screen.getByText(/4 devices/)).toBeInTheDocument();
    expect(screen.getByText("4 parsed")).toBeInTheDocument();
    expect(screen.getByText("2 with findings")).toBeInTheDocument();
    expect(screen.getByText("2 clean")).toBeInTheDocument();
  });

  it("renders '(not yet analysed)' when display is null", () => {
    render(<RunSummaryStrip display={null} mode="viewer" />);
    expect(screen.getByText(/not yet analysed/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Analyse batch" }),
    ).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// V1AH — Discovery import preview
// -----------------------------------------------------------------------------

describe("RunSummaryStrip — Discovery import preview (V1AH)", () => {
  it("does not render preview button when activeEnvironmentId is null", () => {
    render(
      <RunSummaryStrip
        display={makeRun({
          status: "complete",
          summary: {
            total_count: 3,
            parsed_count: 3,
            failed_count: 0,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 0,
            clean_count: 3,
            severity_counts: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              info: 0,
            },
          },
        })}
        mode="author"
        onReRun={vi.fn()}
        disabled={false}
        discoveryImportableCount={3}
        activeEnvironmentId={null}
        onPreviewDiscoveryImport={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Preview Discovery Import/i }),
    ).toBeNull();
  });

  it("does not render preview button when discoveryImportableCount is 0", () => {
    render(
      <RunSummaryStrip
        display={makeRun({
          status: "complete",
          summary: {
            total_count: 3,
            parsed_count: 3,
            failed_count: 0,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 0,
            clean_count: 3,
            severity_counts: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              info: 0,
            },
          },
        })}
        mode="author"
        onReRun={vi.fn()}
        disabled={false}
        discoveryImportableCount={0}
        activeEnvironmentId="env-123"
        onPreviewDiscoveryImport={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Preview Discovery Import/i }),
    ).toBeNull();
  });

  it("does not render preview button when run is in_progress", () => {
    render(
      <RunSummaryStrip
        display={makeRun({
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
        mode="author"
        onReRun={vi.fn()}
        disabled={false}
        discoveryImportableCount={3}
        activeEnvironmentId="env-123"
        onPreviewDiscoveryImport={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Preview Discovery Import/i }),
    ).toBeNull();
  });

  it("does not render preview button when run is idle", () => {
    render(
      <RunSummaryStrip
        display={makeRun({
          status: "idle",
        })}
        mode="author"
        onReRun={vi.fn()}
        disabled={false}
        discoveryImportableCount={3}
        activeEnvironmentId="env-123"
        onPreviewDiscoveryImport={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Preview Discovery Import/i }),
    ).toBeNull();
  });

  it("renders preview button when run is complete and env + candidates present", () => {
    render(
      <RunSummaryStrip
        display={makeRun({
          status: "complete",
          summary: {
            total_count: 3,
            parsed_count: 3,
            failed_count: 0,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 0,
            clean_count: 3,
            severity_counts: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              info: 0,
            },
          },
        })}
        mode="author"
        onReRun={vi.fn()}
        disabled={false}
        discoveryImportableCount={3}
        activeEnvironmentId="env-123"
        onPreviewDiscoveryImport={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button", { name: /Preview Discovery Import/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent("(3)");
  });

  it("renders preview button when run is complete_with_failures", () => {
    render(
      <RunSummaryStrip
        display={makeRun({
          status: "complete_with_failures",
          summary: {
            total_count: 3,
            parsed_count: 2,
            failed_count: 1,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 0,
            clean_count: 2,
            severity_counts: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              info: 0,
            },
          },
        })}
        mode="author"
        onReRun={vi.fn()}
        disabled={false}
        discoveryImportableCount={2}
        activeEnvironmentId="env-123"
        onPreviewDiscoveryImport={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /Preview Discovery Import/i }),
    ).toBeInTheDocument();
  });

  it("button calls onPreviewDiscoveryImport when clicked", async () => {
    const user = userEvent.setup();
    const onPreviewDiscoveryImport = vi.fn();
    render(
      <RunSummaryStrip
        display={makeRun({
          status: "complete",
          summary: {
            total_count: 3,
            parsed_count: 3,
            failed_count: 0,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 0,
            clean_count: 3,
            severity_counts: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              info: 0,
            },
          },
        })}
        mode="author"
        onReRun={vi.fn()}
        disabled={false}
        discoveryImportableCount={3}
        activeEnvironmentId="env-123"
        onPreviewDiscoveryImport={onPreviewDiscoveryImport}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /Preview Discovery Import/i }),
    );
    expect(onPreviewDiscoveryImport).toHaveBeenCalledTimes(1);
  });

  it("button is disabled when status is 'running'", () => {
    render(
      <RunSummaryStrip
        display={makeRun({
          status: "complete",
          summary: {
            total_count: 3,
            parsed_count: 3,
            failed_count: 0,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 0,
            clean_count: 3,
            severity_counts: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              info: 0,
            },
          },
        })}
        mode="author"
        onReRun={vi.fn()}
        disabled={false}
        discoveryImportableCount={3}
        activeEnvironmentId="env-123"
        onPreviewDiscoveryImport={vi.fn()}
        discoveryPreviewStatus={{ kind: "running" }}
      />,
    );
    const btn = screen.getByRole("button", {
      name: /Preview Discovery Import/i,
    });
    expect(btn).toBeDisabled();
  });

  it("renders 'previewing…' status while running", () => {
    render(
      <RunSummaryStrip
        display={makeRun({
          status: "complete",
          summary: {
            total_count: 3,
            parsed_count: 3,
            failed_count: 0,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 0,
            clean_count: 3,
            severity_counts: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              info: 0,
            },
          },
        })}
        mode="author"
        onReRun={vi.fn()}
        disabled={false}
        discoveryImportableCount={3}
        activeEnvironmentId="env-123"
        onPreviewDiscoveryImport={vi.fn()}
        discoveryPreviewStatus={{ kind: "running" }}
      />,
    );
    expect(screen.getByText("previewing…")).toBeInTheDocument();
  });

  it("renders accepted/rejected counts when status is 'ready'", () => {
    render(
      <RunSummaryStrip
        display={makeRun({
          status: "complete",
          summary: {
            total_count: 3,
            parsed_count: 3,
            failed_count: 0,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 0,
            clean_count: 3,
            severity_counts: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              info: 0,
            },
          },
        })}
        mode="author"
        onReRun={vi.fn()}
        disabled={false}
        discoveryImportableCount={3}
        activeEnvironmentId="env-123"
        onPreviewDiscoveryImport={vi.fn()}
        discoveryPreviewStatus={{
          kind: "ready",
          preview: {
            environment_id: "env-123",
            accepted: [],
            rejected: [],
            summary: {
              total_candidates: 7,
              accepted_count: 5,
              rejected_count: 2,
            },
          },
        }}
      />,
    );
    const status = screen.getByRole("status", { name: "Discovery preview result" });
    expect(status.textContent).toContain("5 accepted · 2 rejected");
  });

  it("renders failure message when status is 'failed'", () => {
    render(
      <RunSummaryStrip
        display={makeRun({
          status: "complete",
          summary: {
            total_count: 3,
            parsed_count: 3,
            failed_count: 0,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 0,
            clean_count: 3,
            severity_counts: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              info: 0,
            },
          },
        })}
        mode="author"
        onReRun={vi.fn()}
        disabled={false}
        discoveryImportableCount={3}
        activeEnvironmentId="env-123"
        onPreviewDiscoveryImport={vi.fn()}
        discoveryPreviewStatus={{
          kind: "failed",
          message: "Network error",
        }}
      />,
    );
    expect(screen.getByText(/preview failed: Network error/)).toBeInTheDocument();
  });

  it("does not render preview status when status is 'idle'", () => {
    render(
      <RunSummaryStrip
        display={makeRun({
          status: "complete",
          summary: {
            total_count: 3,
            parsed_count: 3,
            failed_count: 0,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 0,
            clean_count: 3,
            severity_counts: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              info: 0,
            },
          },
        })}
        mode="author"
        onReRun={vi.fn()}
        disabled={false}
        discoveryImportableCount={3}
        activeEnvironmentId="env-123"
        onPreviewDiscoveryImport={vi.fn()}
        discoveryPreviewStatus={{ kind: "idle" }}
      />,
    );
    expect(screen.queryByText(/previewing…/)).toBeNull();
    expect(screen.queryByText(/preview:/)).toBeNull();
    expect(screen.queryByText(/preview failed:/)).toBeNull();
  });

  it("viewer mode hides preview button even when other props are valid", () => {
    render(
      <RunSummaryStrip
        display={makeRun({
          status: "complete",
          summary: {
            total_count: 3,
            parsed_count: 3,
            failed_count: 0,
            skipped_count: 0,
            pending_count: 0,
            with_findings_count: 0,
            clean_count: 3,
            severity_counts: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              info: 0,
            },
          },
        })}
        mode="viewer"
        discoveryImportableCount={3}
        activeEnvironmentId="env-123"
        onPreviewDiscoveryImport={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Preview Discovery Import/i }),
    ).toBeNull();
  });
});

describe("RunSummaryStrip — Discovery import commit (V1AI)", () => {
  const completeSummary = {
    total_count: 3,
    parsed_count: 3,
    failed_count: 0,
    skipped_count: 0,
    pending_count: 0,
    with_findings_count: 0,
    clean_count: 3,
    severity_counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
  };
  const mkRun = (status: "complete" | "complete_with_failures" | "in_progress" | "idle") =>
    makeRun({ status, summary: completeSummary });
  const mkCommit = (imported: number, rejected: number) => ({
    environment_id: "env-core-eu1",
    imported_records: [],
    rejected: [],
    summary: {
      total_candidates: imported + rejected,
      imported_count: imported,
      rejected_count: rejected,
      inventory_total_after: imported,
    },
  });

  it("does not render import button when activeEnvironmentId is null", () => {
    render(
      <RunSummaryStrip
        display={mkRun("complete")}
        mode="author"
        discoveryImportableCount={3}
        activeEnvironmentId={null}
        onImportDiscoveryRecords={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Import to Discovery/i })).toBeNull();
  });

  it("does not render import button when discoveryImportableCount is 0", () => {
    render(
      <RunSummaryStrip
        display={mkRun("complete")}
        mode="author"
        discoveryImportableCount={0}
        activeEnvironmentId="env-core-eu1"
        onImportDiscoveryRecords={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Import to Discovery/i })).toBeNull();
  });

  it("does not render import button when run is in_progress", () => {
    render(
      <RunSummaryStrip
        display={mkRun("in_progress")}
        mode="author"
        discoveryImportableCount={3}
        activeEnvironmentId="env-core-eu1"
        onImportDiscoveryRecords={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Import to Discovery/i })).toBeNull();
  });

  it("does not render import button when run is idle", () => {
    render(
      <RunSummaryStrip
        display={mkRun("idle")}
        mode="author"
        discoveryImportableCount={3}
        activeEnvironmentId="env-core-eu1"
        onImportDiscoveryRecords={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Import to Discovery/i })).toBeNull();
  });

  it("renders import button when run complete + env + candidates", () => {
    render(
      <RunSummaryStrip
        display={mkRun("complete")}
        mode="author"
        discoveryImportableCount={3}
        activeEnvironmentId="env-core-eu1"
        onImportDiscoveryRecords={vi.fn()}
      />,
    );
    const btn = screen.getByRole("button", { name: "Import to Discovery" });
    expect(btn).toBeInTheDocument();
    expect(btn.textContent).toContain("(3)");
  });

  it("renders import button when run complete_with_failures", () => {
    render(
      <RunSummaryStrip
        display={mkRun("complete_with_failures")}
        mode="author"
        discoveryImportableCount={2}
        activeEnvironmentId="env-core-eu1"
        onImportDiscoveryRecords={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Import to Discovery" })).toBeInTheDocument();
  });

  it("button calls onImportDiscoveryRecords when clicked", async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(
      <RunSummaryStrip
        display={mkRun("complete")}
        mode="author"
        discoveryImportableCount={3}
        activeEnvironmentId="env-core-eu1"
        onImportDiscoveryRecords={spy}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Import to Discovery" }));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("button is disabled when commit status is 'running'", () => {
    render(
      <RunSummaryStrip
        display={mkRun("complete")}
        mode="author"
        discoveryImportableCount={3}
        activeEnvironmentId="env-core-eu1"
        onImportDiscoveryRecords={vi.fn()}
        discoveryCommitStatus={{ kind: "running" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Import to Discovery" })).toBeDisabled();
  });

  it("renders 'importing…' status while running", () => {
    render(
      <RunSummaryStrip
        display={mkRun("complete")}
        mode="author"
        discoveryImportableCount={3}
        activeEnvironmentId="env-core-eu1"
        onImportDiscoveryRecords={vi.fn()}
        discoveryCommitStatus={{ kind: "running" }}
      />,
    );
    expect(screen.getByRole("status", { name: "Discovery import running" }).textContent).toContain(
      "importing…",
    );
  });

  it("renders Imported/Rejected counts when status is 'imported'", () => {
    render(
      <RunSummaryStrip
        display={mkRun("complete")}
        mode="author"
        discoveryImportableCount={3}
        activeEnvironmentId="env-core-eu1"
        onImportDiscoveryRecords={vi.fn()}
        discoveryCommitStatus={{ kind: "imported", result: mkCommit(3, 1) }}
      />,
    );
    const status = screen.getByRole("status", { name: "Discovery import result" });
    expect(status.textContent).toContain("Imported 3 · Rejected 1");
  });

  it("renders 'Imported 0 · Rejected N' on duplicate-only re-import", () => {
    render(
      <RunSummaryStrip
        display={mkRun("complete")}
        mode="author"
        discoveryImportableCount={3}
        activeEnvironmentId="env-core-eu1"
        onImportDiscoveryRecords={vi.fn()}
        discoveryCommitStatus={{ kind: "imported", result: mkCommit(0, 3) }}
      />,
    );
    const status = screen.getByRole("status", { name: "Discovery import result" });
    expect(status.textContent).toContain("Imported 0 · Rejected 3");
  });

  it("renders failure message when status is 'failed'", () => {
    render(
      <RunSummaryStrip
        display={mkRun("complete")}
        mode="author"
        discoveryImportableCount={3}
        activeEnvironmentId="env-core-eu1"
        onImportDiscoveryRecords={vi.fn()}
        discoveryCommitStatus={{ kind: "failed", message: "boom" }}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain("import failed: boom");
  });

  it("viewer mode hides both preview and import buttons", () => {
    render(
      <RunSummaryStrip
        display={mkRun("complete")}
        mode="viewer"
        discoveryImportableCount={3}
        activeEnvironmentId="env-core-eu1"
        onPreviewDiscoveryImport={vi.fn()}
        onImportDiscoveryRecords={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Preview Discovery Import/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Import to Discovery/i })).toBeNull();
  });
});
