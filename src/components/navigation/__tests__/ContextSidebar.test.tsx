import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContextSidebar } from "../ContextSidebar";
import { MODE_CATALOGUE } from "../../../contracts/modeCatalogue";

describe("ContextSidebar", () => {
  const mockOnActivateChild = vi.fn();
  const mockOnToggleNode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the mode header with icon, label, state chip, and item count", () => {
    render(
      <ContextSidebar
        catalogue={MODE_CATALOGUE}
        activeMode="hierarchy"
        activeChildPath={[]}
        openIds={new Set()}
        onActivateChild={mockOnActivateChild}
        onToggleNode={mockOnToggleNode}
      />
    );
    expect(screen.getByTestId("nav-sidebar")).toBeInTheDocument();
    expect(screen.getByText("Hierarchy")).toBeInTheDocument();
    expect(screen.getByText(/Available/)).toBeInTheDocument();
  });

  it("renders sections in kind order", () => {
    render(
      <ContextSidebar
        catalogue={MODE_CATALOGUE}
        activeMode="provisioning"
        activeChildPath={[]}
        openIds={new Set()}
        onActivateChild={mockOnActivateChild}
        onToggleNode={mockOnToggleNode}
      />
    );
    const sections = document.querySelectorAll("[data-testid^='nav-sidebar-section-']");
    expect(sections.length).toBeGreaterThan(0);
  });

  it("renders the empty state when mode has no children", () => {
    render(
      <ContextSidebar
        catalogue={MODE_CATALOGUE}
        activeMode="operate"
        activeChildPath={[]}
        openIds={new Set()}
        onActivateChild={mockOnActivateChild}
        onToggleNode={mockOnToggleNode}
      />
    );
    expect(screen.getByText(/This mode has no sub-tools/)).toBeInTheDocument();
  });

  it("renders nested children when parent is expanded", () => {
    render(
      <ContextSidebar
        catalogue={MODE_CATALOGUE}
        activeMode="provisioning"
        activeChildPath={[]}
        openIds={new Set(["prov-reconcile"])}
        onActivateChild={mockOnActivateChild}
        onToggleNode={mockOnToggleNode}
      />
    );
    expect(screen.getByTestId("nav-sidebar-row-prov-reconcile-device")).toBeInTheDocument();
  });

  it("highlights the active child by path", () => {
    render(
      <ContextSidebar
        catalogue={MODE_CATALOGUE}
        activeMode="provisioning"
        activeChildPath={["prov-reconcile", "prov-reconcile-device"]}
        openIds={new Set(["prov-reconcile"])}
        onActivateChild={mockOnActivateChild}
        onToggleNode={mockOnToggleNode}
      />
    );
    const activeRow = screen.getByTestId("nav-sidebar-row-prov-reconcile-device");
    expect(activeRow).toHaveAttribute("data-active", "true");
  });

  it("returns null when mode is not found", () => {
    const { container } = render(
      <ContextSidebar
        catalogue={MODE_CATALOGUE}
        activeMode="_nonexistent"
        activeChildPath={[]}
        openIds={new Set()}
        onActivateChild={mockOnActivateChild}
        onToggleNode={mockOnToggleNode}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
