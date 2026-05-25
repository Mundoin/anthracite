/**
 * V1CC — Collection Targets panel UI tests.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CollectionTargetsPanel } from "../CollectionTargetsPanel";

describe("CollectionTargetsPanel", () => {
  it("mounts the read-only catalogue panel", () => {
    render(<CollectionTargetsPanel />);
    expect(screen.getByTestId("ct-panel")).toBeInTheDocument();
    expect(screen.getByTestId("ct-list")).toBeInTheDocument();
  });

  it("renders demo target card with verdict pill = valid", () => {
    render(<CollectionTargetsPanel />);
    expect(screen.getByTestId("ct-card-tgt-demo-edge-01")).toBeInTheDocument();
    expect(
      screen.getByTestId("ct-card-verdict-tgt-demo-edge-01"),
    ).toHaveTextContent("valid");
  });

  it("displays credential reference id (not plaintext)", () => {
    render(<CollectionTargetsPanel />);
    const cred = screen.getByTestId("ct-card-cred-tgt-demo-edge-01");
    expect(cred).toHaveTextContent("cred://read-only-default");
    expect(cred.textContent).not.toMatch(/password|secret|token/i);
  });

  it("audit summary reports catalogue as valid", () => {
    render(<CollectionTargetsPanel />);
    expect(screen.getByTestId("ct-panel-audit")).toHaveTextContent("valid");
  });

  it("no issue list rendered for valid targets", () => {
    render(<CollectionTargetsPanel />);
    expect(
      screen.queryByTestId("ct-card-issues-tgt-demo-edge-01"),
    ).toBeNull();
  });
});
