import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavigationTree } from "../NavigationTree";
import type { ModeChild } from "../../../contracts/modeCatalogue";

describe("NavigationTree", () => {
  const mockOnActivate = vi.fn();
  const mockOnToggle = vi.fn();

  const children: readonly ModeChild[] = [
    { id: "c1", label: "Child 1", kind: "surface", state: "available" },
    { id: "c2", label: "Child 2", kind: "surface", state: "available" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all direct children flat at depth 1", () => {
    const { container } = render(
      <NavigationTree
        children={children}
        activeChildPath={[]}
        openIds={new Set()}
        onActivate={mockOnActivate}
        onToggle={mockOnToggle}
        depth={1}
      />
    );
    expect(screen.getByTestId("nav-sidebar-row-c1")).toBeInTheDocument();
    expect(screen.getByTestId("nav-sidebar-row-c2")).toBeInTheDocument();
    expect(container.querySelector("[role='tree']")).toBeInTheDocument();
  });

  it("renders depth-2 children when parent is opened", () => {
    const parentWithChildren: ModeChild = {
      id: "parent",
      label: "Parent",
      kind: "group",
      state: "available",
      children: [
        { id: "nested", label: "Nested Child", kind: "surface", state: "available" },
      ],
    };
    render(
      <NavigationTree
        children={[parentWithChildren]}
        activeChildPath={[]}
        openIds={new Set(["parent"])}
        onActivate={mockOnActivate}
        onToggle={mockOnToggle}
        depth={1}
      />
    );
    expect(screen.getByTestId("nav-sidebar-row-nested")).toBeInTheDocument();
  });

  it("does not render depth-2 children when parent is collapsed", () => {
    const parentWithChildren: ModeChild = {
      id: "parent",
      label: "Parent",
      kind: "group",
      state: "available",
      children: [
        { id: "nested", label: "Nested Child", kind: "surface", state: "available" },
      ],
    };
    render(
      <NavigationTree
        children={[parentWithChildren]}
        activeChildPath={[]}
        openIds={new Set()}
        onActivate={mockOnActivate}
        onToggle={mockOnToggle}
        depth={1}
      />
    );
    expect(screen.queryByTestId("nav-sidebar-row-nested")).not.toBeInTheDocument();
  });

  it("highlights the active row by path", () => {
    const parentWithChildren: ModeChild = {
      id: "parent",
      label: "Parent",
      kind: "group",
      state: "available",
      children: [
        { id: "nested", label: "Nested", kind: "surface", state: "available" },
      ],
    };
    render(
      <NavigationTree
        children={[parentWithChildren]}
        activeChildPath={["parent", "nested"]}
        openIds={new Set(["parent"])}
        onActivate={mockOnActivate}
        onToggle={mockOnToggle}
        depth={1}
      />
    );
    const activeRow = screen.getByTestId("nav-sidebar-row-nested");
    expect(activeRow).toHaveAttribute("data-active", "true");
  });
});
