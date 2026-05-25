/**
 * V1CE — Collection Dry-Run Panel UI tests.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CollectionDryRunPanel } from "../CollectionDryRunPanel";

describe("CollectionDryRunPanel", () => {
  it("mounts the dry-run preview surface", () => {
    render(<CollectionDryRunPanel />);
    expect(screen.getByTestId("cd-panel")).toBeInTheDocument();
  });

  it("renders the demo target dry-run card with ready verdict", () => {
    render(<CollectionDryRunPanel />);
    expect(screen.getByTestId("cd-card-tgt-demo-edge-01")).toBeInTheDocument();
    const pill = screen.getByTestId("cd-card-verdict-tgt-demo-edge-01");
    expect(pill).toHaveTextContent("ready");
  });

  it("exposes contact policy summary including read_only=true", () => {
    render(<CollectionDryRunPanel />);
    expect(
      screen.getByTestId("cd-card-policy-tgt-demo-edge-01"),
    ).toHaveTextContent("read_only=true");
  });

  it("emits a V1CD-shaped receipt preview alongside the plan", () => {
    render(<CollectionDryRunPanel />);
    expect(
      screen.getByTestId("cd-card-preview-tgt-demo-edge-01"),
    ).toBeInTheDocument();
    // Demo target scope: inventory + topology_neighbors + version_facts
    expect(
      screen.getByTestId(
        "cd-preview-evidence-tgt-demo-edge-01-inventory",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(
        "cd-preview-evidence-tgt-demo-edge-01-version_facts",
      ),
    ).toBeInTheDocument();
  });

  it("surfaces 'no contact' guarantee on the card", () => {
    render(<CollectionDryRunPanel />);
    expect(screen.getByTestId("cd-card-tgt-demo-edge-01")).toHaveTextContent(
      "no contact",
    );
  });

  it("reason line names the target id", () => {
    render(<CollectionDryRunPanel />);
    expect(
      screen.getByTestId("cd-card-reason-tgt-demo-edge-01"),
    ).toHaveTextContent("tgt-demo-edge-01");
  });
});
