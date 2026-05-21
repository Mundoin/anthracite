import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavigationTreeItem } from "../NavigationTreeItem";
import type { ModeChild } from "../../../contracts/modeCatalogue";

describe("NavigationTreeItem", () => {
  const mockOnActivate = vi.fn();
  const mockOnToggle = vi.fn();

  const baseChild: ModeChild = {
    id: "test-child",
    label: "Test Child",
    kind: "surface",
    state: "available",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the label and LED", () => {
    render(
      <NavigationTreeItem
        child={baseChild}
        depth={1}
        isActive={false}
        isExpanded={false}
        onActivate={mockOnActivate}
        onToggle={mockOnToggle}
      />
    );
    expect(screen.getByText("Test Child")).toBeInTheDocument();
    expect(screen.getByTestId("nav-sidebar-row-test-child")).toBeInTheDocument();
  });

  it("applies the correct LED class based on state", () => {
    const { container } = render(
      <NavigationTreeItem
        child={{ ...baseChild, state: "deferred", deferredReason: "Not ready" }}
        depth={1}
        isActive={false}
        isExpanded={false}
        onActivate={mockOnActivate}
        onToggle={mockOnToggle}
      />
    );
    const led = container.querySelector(".nav-led--deferred");
    expect(led).toBeInTheDocument();
  });

  it("renders a caret when child has children", () => {
    const expandable: ModeChild = {
      ...baseChild,
      children: [
        { id: "child-1", label: "Child 1", kind: "surface", state: "available" },
      ],
    };
    render(
      <NavigationTreeItem
        child={expandable}
        depth={1}
        isActive={false}
        isExpanded={false}
        onActivate={mockOnActivate}
        onToggle={mockOnToggle}
      />
    );
    expect(screen.getByTestId(`nav-tree-toggle-${baseChild.id}`)).toBeInTheDocument();
  });

  it("renders a badge when child.badge > 0", () => {
    const withBadge: ModeChild = { ...baseChild, badge: 3 };
    render(
      <NavigationTreeItem
        child={withBadge}
        depth={1}
        isActive={false}
        isExpanded={false}
        onActivate={mockOnActivate}
        onToggle={mockOnToggle}
      />
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("calls onActivate when the row is clicked", async () => {
    const user = userEvent.setup();
    render(
      <NavigationTreeItem
        child={baseChild}
        depth={1}
        isActive={false}
        isExpanded={false}
        onActivate={mockOnActivate}
        onToggle={mockOnToggle}
      />
    );
    await user.click(screen.getByTestId("nav-sidebar-row-test-child"));
    expect(mockOnActivate).toHaveBeenCalledWith("test-child");
  });

  it("calls onToggle when caret is clicked", async () => {
    const user = userEvent.setup();
    const expandable: ModeChild = {
      ...baseChild,
      children: [{ id: "c1", label: "C1", kind: "surface", state: "available" }],
    };
    render(
      <NavigationTreeItem
        child={expandable}
        depth={1}
        isActive={false}
        isExpanded={false}
        onActivate={mockOnActivate}
        onToggle={mockOnToggle}
      />
    );
    await user.click(screen.getByTestId(`nav-tree-toggle-${baseChild.id}`));
    expect(mockOnToggle).toHaveBeenCalledWith("test-child");
    expect(mockOnActivate).not.toHaveBeenCalled();
  });
});
