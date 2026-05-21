/**
 * D3B — CortexOverlay integration tests.
 *
 * Verifies open/close, query filtering, keyboard navigation, activation,
 * and honest deferred/blocked surfacing on top of the real MODE_CATALOGUE.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { CortexOverlay } from "../CortexOverlay";
import { MODE_CATALOGUE } from "../../../contracts/modeCatalogue";
import type { CortexEntry } from "../../navigation/cortexCatalogueAdapter";

function renderOverlay(props: Partial<Parameters<typeof CortexOverlay>[0]> = {}): {
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
      {...props}
    />,
  );
  return { onClose, onActivate };
}

describe("CortexOverlay · render gating", () => {
  it("renders nothing when open is false", () => {
    const onClose = vi.fn();
    const onActivate = vi.fn();
    const { container } = render(
      <CortexOverlay
        open={false}
        catalogue={MODE_CATALOGUE}
        onClose={onClose}
        onActivate={onActivate}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the overlay + input + results when open", () => {
    renderOverlay();
    expect(screen.getByTestId("cortex-overlay")).toBeInTheDocument();
    expect(screen.getByTestId("cortex-input")).toBeInTheDocument();
    expect(screen.getByTestId("cortex-results")).toBeInTheDocument();
  });

  it("autofocuses the input on open", () => {
    renderOverlay();
    expect(document.activeElement).toBe(screen.getByTestId("cortex-input"));
  });
});

describe("CortexOverlay · default state", () => {
  it("empty query shows the modes section", () => {
    renderOverlay();
    expect(screen.getByTestId("cortex-section-modes")).toBeInTheDocument();
  });

  it("empty query shows foot section (Ops Console)", () => {
    renderOverlay();
    expect(screen.getByTestId("cortex-section-foot")).toBeInTheDocument();
  });
});

describe("CortexOverlay · search filtering", () => {
  it("'devices' returns the Devices mode + descendants", () => {
    renderOverlay();
    const input = screen.getByTestId("cortex-input");
    fireEvent.change(input, { target: { value: "devices" } });

    // Devices mode is in the modes section
    expect(screen.getByTestId("cortex-section-modes")).toBeInTheDocument();
    expect(screen.getByTestId("cortex-result-devices")).toBeInTheDocument();
  });

  it("'ptp' returns PTP Events with Governance/Events breadcrumb", () => {
    renderOverlay();
    const input = screen.getByTestId("cortex-input");
    fireEvent.change(input, { target: { value: "ptp" } });

    expect(screen.getByText("PTP Events")).toBeInTheDocument();
    // breadcrumb segments rendered separately; assert presence of mid segments
    expect(screen.getByText("Governance")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
  });

  it("'reconciling' returns the group + 2 nested children", () => {
    renderOverlay();
    const input = screen.getByTestId("cortex-input");
    fireEvent.change(input, { target: { value: "reconciling" } });

    // "Reconciling Config" appears as both a label and a breadcrumb segment
    expect(screen.getAllByText("Reconciling Config").length).toBeGreaterThan(0);
    expect(screen.getByText("Reconciling a Device's Config")).toBeInTheDocument();
    expect(screen.getByText("Reconciling a Container's Config")).toBeInTheDocument();
  });

  it("non-matching query shows the empty state", () => {
    renderOverlay();
    const input = screen.getByTestId("cortex-input");
    fireEvent.change(input, { target: { value: "zzzzznothing" } });
    expect(screen.getByTestId("cortex-empty")).toBeInTheDocument();
  });
});

describe("CortexOverlay · honest state surfacing", () => {
  it("deferred entries remain visible with a Deferred state chip", () => {
    renderOverlay();
    const input = screen.getByTestId("cortex-input");
    fireEvent.change(input, { target: { value: "ptp" } });

    const ptpRow = screen
      .getAllByRole("option")
      .find((el) => el.getAttribute("data-state") === "deferred");
    expect(ptpRow).toBeDefined();
  });

  it("state chip shows for non-available states", () => {
    renderOverlay();
    const input = screen.getByTestId("cortex-input");
    fireEvent.change(input, { target: { value: "devices" } });
    // Devices mode is deferred — chip must render
    const chips = screen.getAllByText("Deferred");
    expect(chips.length).toBeGreaterThan(0);
  });
});

describe("CortexOverlay · keyboard navigation", () => {
  it("ArrowDown moves highlight to the next row", () => {
    renderOverlay();
    const input = screen.getByTestId("cortex-input");
    // First row starts highlighted at index 0
    const firstRow = screen.getAllByRole("option")[0];
    expect(firstRow.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    const secondRow = screen.getAllByRole("option")[1];
    expect(secondRow.getAttribute("aria-selected")).toBe("true");
  });

  it("ArrowUp wraps to the last row from the first", () => {
    renderOverlay();
    const input = screen.getByTestId("cortex-input");
    const rows = screen.getAllByRole("option");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    const last = rows[rows.length - 1];
    expect(last.getAttribute("aria-selected")).toBe("true");
  });

  it("Enter activates the highlighted mode and calls onActivate + onClose", () => {
    const { onActivate, onClose } = renderOverlay();
    const input = screen.getByTestId("cortex-input");
    // Highlighted = first row (a mode in default state)
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    const arg = onActivate.mock.calls[0][0] as CortexEntry;
    expect(arg.kind === "mode" || arg.kind === "foot").toBe(true);
  });

  it("Escape closes the overlay", () => {
    const { onClose } = renderOverlay();
    const input = screen.getByTestId("cortex-input");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Backdrop click closes the overlay", () => {
    const { onClose } = renderOverlay();
    const backdrop = screen.getByTestId("cortex-overlay");
    fireEvent.mouseDown(backdrop, { target: backdrop });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Panel click does NOT close the overlay (event scoped to backdrop)", () => {
    const { onClose } = renderOverlay();
    const input = screen.getByTestId("cortex-input");
    fireEvent.mouseDown(input);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("CortexOverlay · child activation", () => {
  it("clicking a child result calls onActivate with the full CortexChildEntry shape", () => {
    const { onActivate } = renderOverlay();
    const input = screen.getByTestId("cortex-input");
    fireEvent.change(input, { target: { value: "reconciling a device" } });

    const row = screen.getByText("Reconciling a Device's Config").closest("[role='option']");
    expect(row).not.toBeNull();
    if (row) fireEvent.click(row);
    expect(onActivate).toHaveBeenCalledTimes(1);
    const arg = onActivate.mock.calls[0][0] as CortexEntry;
    expect(arg.kind).toBe("child");
    if (arg.kind === "child") {
      expect(arg.modeId).toBe("provisioning");
      expect(arg.childPath).toEqual(["prov-reconcile", "prov-reconcile-device"]);
    }
  });
});
