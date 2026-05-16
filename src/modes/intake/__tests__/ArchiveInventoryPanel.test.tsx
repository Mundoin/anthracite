/**
 * V1O-B ArchiveInventoryPanel behavioural tests.
 *
 * Locks the inventory honesty rules: collapsed by default (R12),
 * KindMismatch surfaced (R13), skipped entries visible-but-de-emphasised,
 * decode warnings rendered verbatim.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ArchiveIntakeResult } from "../../../types/archiveIntake";
import { ArchiveInventoryPanel } from "../components/ArchiveInventoryPanel";

const ZIP = { kind: "zip" as const };
const TAR = { kind: "tar" as const };

function inventoryFixture(
  overrides: Partial<ArchiveIntakeResult> = {},
): ArchiveIntakeResult {
  return {
    archive_kind_supplied: ZIP,
    archive_kind_detected: ZIP,
    entries: [
      {
        entry_id: "entry-0",
        entry_index: 0,
        path: "r1.cfg",
        raw_path: null,
        size_bytes_compressed: 64,
        size_bytes_uncompressed: 200,
        status: { kind: "extracted" },
        raw_text: "hostname r1\n",
        decode_warning: null,
      },
      {
        entry_id: "entry-1",
        entry_index: 1,
        path: "binary.png",
        raw_path: null,
        size_bytes_compressed: 1024,
        size_bytes_uncompressed: 1024,
        status: { kind: "skipped_non_text" },
        raw_text: null,
        decode_warning: null,
      },
      {
        entry_id: "entry-2",
        entry_index: 2,
        path: "garbled.cfg",
        raw_path: null,
        size_bytes_compressed: 32,
        size_bytes_uncompressed: 32,
        status: { kind: "skipped_decode_error" },
        raw_text: null,
        decode_warning: "invalid utf-8 at byte 7",
      },
    ],
    warnings: [],
    total_uncompressed_size: 1256,
    total_compressed_size: 1120,
    entry_count: 3,
    extracted_count: 1,
    skipped_count: 2,
    archive_intake_version: "1",
    ...overrides,
  };
}

describe("ArchiveInventoryPanel", () => {
  it("renders collapsed by default (R12)", () => {
    const inv = inventoryFixture();
    render(<ArchiveInventoryPanel inventory={inv} archiveName="configs.zip" />);
    const details = screen.getByLabelText(
      "Archive inventory",
    ) as HTMLDetailsElement;
    expect(details.open).toBe(false);
  });

  it("opens initially when initiallyOpen is set", () => {
    const inv = inventoryFixture();
    render(
      <ArchiveInventoryPanel
        inventory={inv}
        archiveName="configs.zip"
        initiallyOpen
      />,
    );
    const details = screen.getByLabelText(
      "Archive inventory",
    ) as HTMLDetailsElement;
    expect(details.open).toBe(true);
  });

  it("surfaces the archive filename + detected kind + entry counts in the summary", () => {
    const inv = inventoryFixture();
    render(<ArchiveInventoryPanel inventory={inv} archiveName="configs.zip" />);
    const summary = screen.getByLabelText("Archive inventory").querySelector("summary")!;
    expect(summary.textContent).toContain("configs.zip");
    expect(summary.textContent).toContain("zip");
    expect(summary.textContent).toContain("3 entries");
    expect(summary.textContent).toContain("1 extracted");
    expect(summary.textContent).toContain("2 skipped");
  });

  it("flags KindMismatch in the summary when supplied != detected (R13)", () => {
    const inv = inventoryFixture({
      archive_kind_supplied: TAR,
      archive_kind_detected: ZIP,
      warnings: [{ kind: "kind_mismatch", supplied: TAR, detected: ZIP }],
    });
    render(<ArchiveInventoryPanel inventory={inv} archiveName="configs.zip" />);
    expect(screen.getByText(/KIND MISMATCH/)).toBeTruthy();
  });

  it("renders every entry (extracted + skipped) — never hides skipped", () => {
    const inv = inventoryFixture();
    render(
      <ArchiveInventoryPanel
        inventory={inv}
        archiveName="configs.zip"
        initiallyOpen
      />,
    );
    expect(screen.getByText("r1.cfg")).toBeTruthy();
    expect(screen.getByText("binary.png")).toBeTruthy();
    expect(screen.getByText("garbled.cfg")).toBeTruthy();
  });

  it("renders the decode warning verbatim for skipped_decode_error entries", () => {
    const inv = inventoryFixture();
    render(
      <ArchiveInventoryPanel
        inventory={inv}
        archiveName="configs.zip"
        initiallyOpen
      />,
    );
    expect(screen.getByText("invalid utf-8 at byte 7")).toBeTruthy();
  });

  it("renders archive warnings list when any warnings are present", () => {
    const inv = inventoryFixture({
      warnings: [
        { kind: "compression_ratio_exceeded", entry_id: "entry-0", ratio: 500 },
      ],
    });
    render(
      <ArchiveInventoryPanel
        inventory={inv}
        archiveName="configs.zip"
        initiallyOpen
      />,
    );
    expect(screen.getByLabelText("Archive warnings")).toBeTruthy();
    expect(screen.getByText(/ratio 500/)).toBeTruthy();
  });
});
