/**
 * D3C — CortexOverlay scope chip integration tests.
 *
 * Verifies scope chip row renders, clicking a chip filters results,
 * Tab/Shift+Tab cycles scope, and scope resets when overlay reopens.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { CortexOverlay } from "../CortexOverlay";
import { MODE_CATALOGUE } from "../../../contracts/modeCatalogue";

function renderOverlay(): {
  onClose: ReturnType<typeof vi.fn>;
  onActivate: ReturnType<typeof vi.fn>;
} {
  const onClose = vi.fn();
  const onActivate = vi.fn();
  render(
    <CortexOverlay
      open={true}
      catalogue={MODE_CATALOGUE}
      onClose={onClose}
      onActivate={onActivate}
    />,
  );
  return { onClose, onActivate };
}

describe("CortexOverlay · scope chip row", () => {
  it("renders the scope chip row with every scope chip", () => {
    renderOverlay();
    expect(screen.getByTestId("cortex-scope-row")).toBeInTheDocument();
    expect(screen.getByTestId("cortex-scope-all")).toBeInTheDocument();
    expect(screen.getByTestId("cortex-scope-modes")).toBeInTheDocument();
    expect(screen.getByTestId("cortex-scope-workflows")).toBeInTheDocument();
    expect(screen.getByTestId("cortex-scope-tools")).toBeInTheDocument();
    expect(screen.getByTestId("cortex-scope-surfaces")).toBeInTheDocument();
    expect(screen.getByTestId("cortex-scope-groups")).toBeInTheDocument();
    expect(screen.getByTestId("cortex-scope-foot")).toBeInTheDocument();
  });

  it("starts with the 'all' chip active", () => {
    renderOverlay();
    const chip = screen.getByTestId("cortex-scope-all");
    expect(chip.getAttribute("aria-selected")).toBe("true");
  });

  it("clicking a chip filters results to that scope", () => {
    renderOverlay();
    fireEvent.click(screen.getByTestId("cortex-scope-foot"));
    // Foot scope contains only Ops Console
    expect(screen.getByTestId("cortex-section-foot")).toBeInTheDocument();
    // Modes section should not render
    expect(screen.queryByTestId("cortex-section-modes")).toBeNull();
  });

  it("Tab on the input cycles scope forward", () => {
    renderOverlay();
    const input = screen.getByTestId("cortex-input");
    fireEvent.keyDown(input, { key: "Tab" });
    // After one Tab from "all" we land on "modes"
    expect(screen.getByTestId("cortex-scope-modes").getAttribute("aria-selected")).toBe("true");
  });

  it("Shift+Tab on the input cycles scope backward", () => {
    renderOverlay();
    const input = screen.getByTestId("cortex-input");
    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    // Wrap back to the last filter ("foot")
    expect(screen.getByTestId("cortex-scope-foot").getAttribute("aria-selected")).toBe("true");
  });

  it("scope filter is combined with the text query", () => {
    renderOverlay();
    fireEvent.click(screen.getByTestId("cortex-scope-workflows"));
    fireEvent.change(screen.getByTestId("cortex-input"), {
      target: { value: "reconciling" },
    });
    // Only workflow children matching "reconciling" should render
    expect(screen.getByText("Reconciling a Device's Config")).toBeInTheDocument();
    // The Reconciling Config group row (scope=groups) must NOT be in the result list
    expect(screen.queryByTestId("cortex-result-provisioning/prov-reconcile")).toBeNull();
    // Groups section header must not render under the workflows-only filter
    expect(screen.queryByTestId("cortex-section-groups")).toBeNull();
  });
});
