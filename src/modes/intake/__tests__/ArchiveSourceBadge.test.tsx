/**
 * V1O-B ArchiveSourceBadge — provenance surface lock.
 *
 * The badge is the per-card trace from device → archive entry.
 * These tests lock the visible string + the accessibility name so
 * the BatchSummary / drilldown header surfaces stay correct.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ArchiveSourceBadge } from "../components/ArchiveSourceBadge";

describe("ArchiveSourceBadge", () => {
  it("renders the entry path with a 'from' label", () => {
    render(
      <ArchiveSourceBadge
        provenance={{
          entry_id: "entry-2",
          entry_path: "site-a/r3.cfg",
          archive_name: "drop-2026.zip",
        }}
      />,
    );
    expect(screen.getByText("from")).toBeTruthy();
    expect(screen.getByText("site-a/r3.cfg")).toBeTruthy();
  });

  it("exposes an accessibility label naming the entry path", () => {
    render(
      <ArchiveSourceBadge
        provenance={{
          entry_id: "entry-0",
          entry_path: "r1.cfg",
          archive_name: "configs.zip",
        }}
      />,
    );
    expect(screen.getByLabelText("from r1.cfg")).toBeTruthy();
  });

  it("falls back to entry path alone when archive_name is null", () => {
    render(
      <ArchiveSourceBadge
        provenance={{
          entry_id: "entry-0",
          entry_path: "r1.cfg",
          archive_name: null,
        }}
      />,
    );
    expect(screen.getByText("r1.cfg")).toBeTruthy();
  });
});
