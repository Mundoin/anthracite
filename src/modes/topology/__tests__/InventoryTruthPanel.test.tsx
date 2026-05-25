/**
 * V1CG — Inventory Truth Panel UI tests.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InventoryTruthPanel } from "../InventoryTruthPanel";

describe("InventoryTruthPanel", () => {
  it("mounts the panel + demo row", () => {
    render(<InventoryTruthPanel />);
    expect(screen.getByTestId("iv-panel")).toBeInTheDocument();
    expect(screen.getByTestId("iv-list")).toBeInTheDocument();
    expect(screen.getByTestId("iv-row-tgt-demo-edge-01")).toBeInTheDocument();
  });

  it("renders hostname + vendor + platform + OS for the demo row", () => {
    render(<InventoryTruthPanel />);
    const row = screen.getByTestId("iv-row-tgt-demo-edge-01");
    expect(row).toHaveTextContent("edge-rtr-01");
    expect(row).toHaveTextContent("Cisco");
    expect(row).toHaveTextContent("iosxe");
    expect(row).toHaveTextContent("IOS-XE 17.9.4a");
  });

  it("source pill reads 'demo' (V1CF fixture-backed honesty)", () => {
    render(<InventoryTruthPanel />);
    expect(
      screen.getByTestId("iv-row-source-tgt-demo-edge-01"),
    ).toHaveTextContent("demo");
  });

  it("state pill reads 'unknown' until topology+inventory merge lands", () => {
    render(<InventoryTruthPanel />);
    expect(
      screen.getByTestId("iv-row-state-tgt-demo-edge-01"),
    ).toHaveTextContent("unknown");
  });

  it("confidence pill renders as a percent capped at 95%", () => {
    render(<InventoryTruthPanel />);
    const pill = screen.getByTestId("iv-row-conf-tgt-demo-edge-01");
    expect(pill.textContent).toMatch(/conf \d+%/);
  });

  it("target hints enrich role/site/zone on the row", () => {
    render(<InventoryTruthPanel />);
    const row = screen.getByTestId("iv-row-tgt-demo-edge-01");
    expect(row).toHaveTextContent("edge router");
    expect(row).toHaveTextContent("Campus A");
    expect(row).toHaveTextContent("edge");
  });

  it("proof line names receipt + evidence ref counts", () => {
    render(<InventoryTruthPanel />);
    const proof = screen.getByTestId("iv-row-proof-tgt-demo-edge-01");
    expect(proof.textContent).toMatch(/1 receipt/);
    expect(proof.textContent).toMatch(/4 evidence refs/);
  });

  it("evidence ref list includes inventory + version_facts facts", () => {
    render(<InventoryTruthPanel />);
    expect(
      screen.getByTestId("iv-row-proof-ref-tgt-demo-edge-01-inventory"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("iv-row-proof-ref-tgt-demo-edge-01-version_facts"),
    ).toBeInTheDocument();
  });
});
