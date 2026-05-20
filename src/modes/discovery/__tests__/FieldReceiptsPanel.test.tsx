/**
 * V1BL — FieldReceiptsPanel UI tests.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  emptyHistory,
  addHistoryEntry,
  type HistoryEntry,
} from "../discoveryRunHistory";
import { FieldReceiptsPanel } from "../FieldReceiptsPanel";

function makeEntry(overrides?: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: "entry_1",
    kind: "seed_plan",
    created_at: "2026-05-20T10:00:00Z",
    label: "Seed Plan 1",
    summary: "3 active seeds",
    markdown: "# Seed Plan\n\n- 3 active seeds",
    source_tool: "seed_planner",
    redaction_status: "safe",
    ...overrides,
  };
}

describe("FieldReceiptsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when history is empty", () => {
    const history = emptyHistory();
    const onClear = vi.fn();

    render(<FieldReceiptsPanel history={history} onClear={onClear} />);

    expect(screen.getByTestId("frp-empty")).toBeInTheDocument();
    expect(
      screen.getByText(/No receipts generated yet this session/i),
    ).toBeInTheDocument();
  });

  it("renders entries list when history has entries", () => {
    let history = emptyHistory();
    history = addHistoryEntry(history, makeEntry({ id: "e1" }));

    const onClear = vi.fn();
    render(<FieldReceiptsPanel history={history} onClear={onClear} />);

    expect(screen.getByTestId("frp-entries-list")).toBeInTheDocument();
    expect(screen.getByTestId("frp-entry-0")).toBeInTheDocument();
  });

  it("displays entry details: kind chip, label, timestamp", () => {
    let history = emptyHistory();
    history = addHistoryEntry(
      history,
      makeEntry({
        id: "e1",
        kind: "seed_plan",
        label: "Initial Plan",
        created_at: "2026-05-20T10:00:00Z",
      }),
    );

    const onClear = vi.fn();
    render(<FieldReceiptsPanel history={history} onClear={onClear} />);

    expect(screen.getByTestId("frp-kind-chip-0")).toHaveTextContent("seed_plan");
    expect(screen.getByTestId("frp-label-0")).toHaveTextContent("Initial Plan");
    expect(screen.getByTestId("frp-timestamp-0")).toHaveTextContent("2026-05-20T10:00:00Z");
  });

  it("displays summary and counts when available", () => {
    let history = emptyHistory();
    history = addHistoryEntry(
      history,
      makeEntry({
        id: "e1",
        summary: "5 seeds staged",
        counts: { seeds: 5, warnings: 2 },
      }),
    );

    const onClear = vi.fn();
    render(<FieldReceiptsPanel history={history} onClear={onClear} />);

    expect(screen.getByTestId("frp-summary-0")).toHaveTextContent("5 seeds staged");
    expect(screen.getByTestId("frp-count-seeds-0")).toHaveTextContent("Seeds: 5");
    expect(screen.getByTestId("frp-count-warnings-0")).toHaveTextContent("Warnings: 2");
  });

  it("filters entries by kind", async () => {
    const user = userEvent.setup();
    let history = emptyHistory();
    history = addHistoryEntry(history, makeEntry({ id: "e1", kind: "seed_plan" }));
    history = addHistoryEntry(history, makeEntry({ id: "e2", kind: "crawl_preview" }));

    const onClear = vi.fn();
    render(<FieldReceiptsPanel history={history} onClear={onClear} />);

    // Should show both initially
    expect(screen.getByTestId("frp-entry-0")).toBeInTheDocument();
    expect(screen.getByTestId("frp-entry-1")).toBeInTheDocument();

    // Filter by seed_plan
    await user.click(screen.getByTestId("frp-filter-seed_plan"));

    expect(screen.getByTestId("frp-entry-0")).toBeInTheDocument();
    expect(screen.queryByTestId("frp-entry-1")).not.toBeInTheDocument();
  });

  it("shows 'No entries' message when filter narrows to zero results", async () => {
    const user = userEvent.setup();
    let history = emptyHistory();
    history = addHistoryEntry(history, makeEntry({ id: "e1", kind: "seed_plan" }));

    const onClear = vi.fn();
    render(<FieldReceiptsPanel history={history} onClear={onClear} />);

    // Filter by a kind with no entries
    await user.click(screen.getByTestId("frp-filter-crawl_preview"));

    expect(screen.getByTestId("frp-no-entries")).toBeInTheDocument();
    expect(screen.getByText(/No entries of kind/i)).toBeInTheDocument();
  });

  it("shows wiring pending note for ssh_validation_pack and field_receipt", async () => {
    const user = userEvent.setup();
    let history = emptyHistory();
    history = addHistoryEntry(history, makeEntry({ id: "e1", kind: "seed_plan" }));

    const onClear = vi.fn();
    render(<FieldReceiptsPanel history={history} onClear={onClear} />);

    await user.click(screen.getByTestId("frp-filter-ssh_validation_pack"));
    expect(screen.getByText(/wiring pending/i)).toBeInTheDocument();

    await user.click(screen.getByTestId("frp-filter-field_receipt"));
    expect(screen.getByText(/wiring pending/i)).toBeInTheDocument();
  });

  it("copy button writes to clipboard", async () => {
    const user = userEvent.setup();
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);

    let history = emptyHistory();
    history = addHistoryEntry(
      history,
      makeEntry({
        id: "e1",
        markdown: "# Test Markdown\n\nContent here",
      }),
    );

    const onClear = vi.fn();
    render(
      <FieldReceiptsPanel
        history={history}
        onClear={onClear}
        clipboard={{ writeText: clipboardWrite }}
      />,
    );

    const copyBtn = screen.getByTestId("frp-copy-btn-0");
    await user.click(copyBtn);

    expect(clipboardWrite).toHaveBeenCalledWith("# Test Markdown\n\nContent here");
  });

  it("shows copied indicator after clipboard write", async () => {
    const user = userEvent.setup();
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);

    let history = emptyHistory();
    history = addHistoryEntry(history, makeEntry({ id: "e1" }));

    const onClear = vi.fn();
    render(
      <FieldReceiptsPanel
        history={history}
        onClear={onClear}
        clipboard={{ writeText: clipboardWrite }}
      />,
    );

    const copyBtn = screen.getByTestId("frp-copy-btn-0");
    expect(copyBtn).toHaveTextContent("Copy");

    await user.click(copyBtn);

    expect(copyBtn).toHaveTextContent("Copied");
  });

  it("clear all button calls onClear when confirmed", async () => {
    const user = userEvent.setup();
    let history = emptyHistory();
    history = addHistoryEntry(history, makeEntry({ id: "e1" }));

    const onClear = vi.fn();
    // Mock window.confirm
    vi.stubGlobal("confirm", vi.fn(() => true));

    render(<FieldReceiptsPanel history={history} onClear={onClear} />);

    const clearBtn = screen.getByTestId("frp-clear-all-btn");
    await user.click(clearBtn);

    expect(onClear).toHaveBeenCalled();
  });

  it("clear all button does not call onClear when not confirmed", async () => {
    const user = userEvent.setup();
    let history = emptyHistory();
    history = addHistoryEntry(history, makeEntry({ id: "e1" }));

    const onClear = vi.fn();
    // Mock window.confirm to return false
    vi.stubGlobal("confirm", vi.fn(() => false));

    render(<FieldReceiptsPanel history={history} onClear={onClear} />);

    const clearBtn = screen.getByTestId("frp-clear-all-btn");
    await user.click(clearBtn);

    expect(onClear).not.toHaveBeenCalled();
  });

  it("displays all history markdown in collapsible section", async () => {
    let history = emptyHistory();
    history = addHistoryEntry(history, makeEntry({ id: "e1" }));

    const onClear = vi.fn();
    render(<FieldReceiptsPanel history={history} onClear={onClear} />);

    const allHistory = screen.getByTestId("frp-all-history");

    // The details element is rendered; the markdown content should be visible
    const mdElement = screen.getByTestId("frp-history-md");
    expect(mdElement).toBeInTheDocument();
    expect(mdElement.textContent).toContain("Discovery Session History");
  });
});
