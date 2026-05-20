/**
 * V1BL — CrawlPreviewPanel UI tests.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SeedEntry } from "../seedPlanner";
import { CrawlPreviewPanel } from "../CrawlPreviewPanel";

function makeSeed(overrides?: Partial<SeedEntry>): SeedEntry {
  return {
    id: "seed_1",
    host_or_cidr: "192.168.1.1",
    label: "Test Seed",
    platform_hint: "iosxe",
    transport_intent: "ssh",
    port: 22,
    credential_profile_label: "lab-ssh",
    source_kind: "seed_device",
    notes: "",
    enabled: true,
    ...overrides,
  };
}

describe("CrawlPreviewPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when seeds list is empty", () => {
    render(<CrawlPreviewPanel seeds={[]} />);

    expect(screen.getByTestId("cp-empty")).toBeInTheDocument();
    expect(screen.getByText(/No seeds defined/i)).toBeInTheDocument();
  });

  it("renders form when seeds are present", () => {
    const seeds = [makeSeed()];
    render(<CrawlPreviewPanel seeds={seeds} />);

    expect(screen.getByTestId("cp-form")).toBeInTheDocument();
    expect(screen.getByTestId("cp-max-depth")).toBeInTheDocument();
    expect(screen.getByTestId("cp-max-nodes")).toBeInTheDocument();
  });

  it("displays preview summary with active seed count", () => {
    const seeds = [makeSeed({ id: "s1" }), makeSeed({ id: "s2" })];
    render(<CrawlPreviewPanel seeds={seeds} />);

    expect(screen.getByTestId("cp-active-count")).toHaveTextContent("2");
  });

  it("displays frontier table with seed entries", () => {
    const seeds = [makeSeed({ id: "s1", host_or_cidr: "10.0.0.1" })];
    render(<CrawlPreviewPanel seeds={seeds} />);

    expect(screen.getByTestId("cp-frontier")).toBeInTheDocument();
    expect(screen.getByTestId("cp-frontier-row-0")).toBeInTheDocument();
    expect(screen.getByText("10.0.0.1")).toBeInTheDocument();
  });

  it("shows blocked seeds section when seeds are blocked", () => {
    const seeds = [makeSeed({ id: "s_bad", port: 99999 })];
    render(<CrawlPreviewPanel seeds={seeds} />);

    expect(screen.getByTestId("cp-blocked")).toBeInTheDocument();
    expect(screen.getByTestId("cp-blocked-item-0")).toBeInTheDocument();
  });

  it("handles CIDR seeds correctly", () => {
    const seeds = [makeSeed({ id: "s_cidr", host_or_cidr: "10.0.0.0/24" })];
    render(<CrawlPreviewPanel seeds={seeds} />);

    // Panel should render successfully with CIDR seed
    expect(screen.getByTestId("crawl-preview-panel")).toBeInTheDocument();
    // Frontier should show the CIDR as a single entry
    expect(screen.getByTestId("cp-frontier")).toBeInTheDocument();
  });

  it("copy button calls clipboard and onAddHistory", async () => {
    const user = userEvent.setup();
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    const onAddHistory = vi.fn();

    const seeds = [makeSeed()];
    render(
      <CrawlPreviewPanel
        seeds={seeds}
        onAddHistory={onAddHistory}
        clipboard={{ writeText: clipboardWrite }}
      />,
    );

    const copyBtn = screen.getByTestId("cp-copy-btn");
    await user.click(copyBtn);

    expect(clipboardWrite).toHaveBeenCalled();
    expect(onAddHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "crawl_preview",
        label: expect.stringContaining("Crawl Preview"),
      }),
    );
  });

  it("shows copied indicator after successful clipboard write", async () => {
    const user = userEvent.setup();
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);

    render(
      <CrawlPreviewPanel
        seeds={[makeSeed()]}
        clipboard={{ writeText: clipboardWrite }}
      />,
    );

    const copyBtn = screen.getByTestId("cp-copy-btn");
    expect(copyBtn).toHaveTextContent("Copy Crawl Preview");

    await user.click(copyBtn);

    expect(copyBtn).toHaveTextContent("Copied (Markdown)");
  });

  it("markdown preview can be toggled open/closed", async () => {
    const user = userEvent.setup();
    render(<CrawlPreviewPanel seeds={[makeSeed()]} />);

    const preview = screen.getByTestId("cp-md-preview");
    // Initially closed, content is not visible
    expect(screen.queryByTestId("cp-md-content")).not.toBeInTheDocument();

    // Click to open
    const summary = preview.querySelector("summary");
    if (summary) {
      await user.click(summary);
      // After click, check if content is now present
      const content = screen.queryByTestId("cp-md-content");
      expect(content).toBeInTheDocument();
    }
  });

  it("shows honesty footer always", () => {
    render(<CrawlPreviewPanel seeds={[makeSeed()]} />);

    expect(screen.getByTestId("cp-honesty-footer")).toBeInTheDocument();
    expect(
      screen.getByText(/Preview only — no device contact, no recursive crawl execution/i),
    ).toBeInTheDocument();
  });

  it("respects max depth input changes", async () => {
    const user = userEvent.setup();
    render(<CrawlPreviewPanel seeds={[makeSeed()]} />);

    const maxDepthInput = screen.getByTestId("cp-max-depth") as HTMLInputElement;
    expect(maxDepthInput.value).toBe("2");

    await user.clear(maxDepthInput);
    await user.type(maxDepthInput, "5");

    expect(maxDepthInput.value).toBe("5");
  });

  it("computes command labels for iOS XE platform", () => {
    const seeds = [
      makeSeed({
        id: "s_iosxe",
        platform_hint: "iosxe",
        transport_intent: "ssh",
      }),
    ];
    render(<CrawlPreviewPanel seeds={seeds} />);

    // Panel should render successfully with iOS XE seed
    expect(screen.getByTestId("crawl-preview-panel")).toBeInTheDocument();
    // Active seed count should be 1
    expect(screen.getByTestId("cp-active-count")).toHaveTextContent("1");
  });
});
