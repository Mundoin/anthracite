/**
 * V1CD — Collection Receipts panel UI tests.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CollectionReceiptsPanel } from "../CollectionReceiptsPanel";

describe("CollectionReceiptsPanel", () => {
  it("mounts the read-only catalogue panel", () => {
    render(<CollectionReceiptsPanel />);
    expect(screen.getByTestId("cr-panel")).toBeInTheDocument();
    expect(screen.getByTestId("cr-list")).toBeInTheDocument();
  });

  it("renders both demo receipts", () => {
    render(<CollectionReceiptsPanel />);
    expect(screen.getByTestId("cr-card-rcpt-imported-demo-001")).toBeInTheDocument();
    expect(screen.getByTestId("cr-card-rcpt-tgt-demo-edge-01-001")).toBeInTheDocument();
  });

  it("imported demo receipt shows source pill = imported", () => {
    render(<CollectionReceiptsPanel />);
    expect(
      screen.getByTestId("cr-card-source-rcpt-imported-demo-001"),
    ).toHaveTextContent("imported");
  });

  it("target demo receipt references the V1CC demo target id", () => {
    render(<CollectionReceiptsPanel />);
    expect(
      screen.getByTestId("cr-card-target-rcpt-tgt-demo-edge-01-001"),
    ).toHaveTextContent("tgt-demo-edge-01");
  });

  it("renders accepted/rejected/failed counts deterministically", () => {
    render(<CollectionReceiptsPanel />);
    const imported = screen.getByTestId("cr-card-counts-rcpt-imported-demo-001");
    expect(imported).toHaveTextContent("4");
    const target = screen.getByTestId("cr-card-counts-rcpt-tgt-demo-edge-01-001");
    expect(target).toHaveTextContent("3");
  });

  it("verdict pills read 'valid' for both demo receipts", () => {
    render(<CollectionReceiptsPanel />);
    expect(
      screen.getByTestId("cr-card-verdict-rcpt-imported-demo-001"),
    ).toHaveTextContent("valid");
    expect(
      screen.getByTestId("cr-card-verdict-rcpt-tgt-demo-edge-01-001"),
    ).toHaveTextContent("valid");
  });

  it("target demo receipt surfaces its warning line", () => {
    render(<CollectionReceiptsPanel />);
    expect(
      screen.getByTestId("cr-card-warnings-rcpt-tgt-demo-edge-01-001"),
    ).toHaveTextContent("unresolved");
  });

  it("evidence detail surfaces accepted + rejected entries by id", () => {
    render(<CollectionReceiptsPanel />);
    expect(
      screen.getByTestId(
        "cr-evidence-rcpt-tgt-demo-edge-01-001-ev-lldp-edge-01-rejected",
      ),
    ).toHaveTextContent("rejected");
  });
});
