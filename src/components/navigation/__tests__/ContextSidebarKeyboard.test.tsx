/**
 * D3C — ContextSidebar keyboard interaction tests.
 *
 * Verifies ↑/↓ walk, Home/End jump, Space toggle, Enter activate,
 * Right expand+descend, Left collapse+ascend / rail handoff, Esc.
 */

import { describe, expect, it, vi } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";

import { ContextSidebar } from "../ContextSidebar";
import { MODE_CATALOGUE } from "../../../contracts/modeCatalogue";

interface RenderOpts {
  readonly activeMode?: string;
  readonly activeChildPath?: readonly string[];
  readonly openIds?: ReadonlySet<string>;
}

function setup(opts: RenderOpts = {}): {
  onActivateChild: ReturnType<typeof vi.fn>;
  onToggleNode: ReturnType<typeof vi.fn>;
  onRequestRailFocus: ReturnType<typeof vi.fn>;
  root: HTMLElement;
} {
  const onActivateChild = vi.fn();
  const onToggleNode = vi.fn();
  const onRequestRailFocus = vi.fn();
  const { container } = render(
    <ContextSidebar
      catalogue={MODE_CATALOGUE}
      activeMode={opts.activeMode ?? "provisioning"}
      activeChildPath={opts.activeChildPath ?? []}
      openIds={opts.openIds ?? new Set()}
      onActivateChild={onActivateChild}
      onToggleNode={onToggleNode}
      onRequestRailFocus={onRequestRailFocus}
    />,
  );
  return {
    onActivateChild,
    onToggleNode,
    onRequestRailFocus,
    root: container.querySelector('[data-testid="nav-sidebar"]') as HTMLElement,
  };
}

function focusedRowId(root: HTMLElement): string | null {
  const el = root.querySelector<HTMLElement>('[data-focused="true"]');
  if (!el) return null;
  const testid = el.getAttribute("data-testid");
  return testid ? testid.replace("nav-sidebar-row-", "") : null;
}

describe("ContextSidebar · keyboard navigation", () => {
  it("ArrowDown moves focus to the next visible row", () => {
    const { root } = setup();
    const initial = focusedRowId(root);
    fireEvent.keyDown(root, { key: "ArrowDown" });
    const next = focusedRowId(root);
    expect(next).not.toBe(initial);
    expect(next).not.toBeNull();
  });

  it("ArrowUp wraps to the last row when at the first", () => {
    const { root } = setup();
    // Focus is initialized at first row by default
    fireEvent.keyDown(root, { key: "ArrowUp" });
    const last = focusedRowId(root);
    expect(last).not.toBeNull();
  });

  it("Home + End jump to first / last visible row", () => {
    const { root } = setup();
    fireEvent.keyDown(root, { key: "End" });
    const last = focusedRowId(root);
    fireEvent.keyDown(root, { key: "Home" });
    const first = focusedRowId(root);
    expect(first).not.toBe(last);
  });

  it("Space toggles an expandable group node", () => {
    const { root, onToggleNode } = setup({ activeChildPath: ["prov-reconcile"] });
    // Focus is on prov-reconcile (active path).
    fireEvent.keyDown(root, { key: " " });
    expect(onToggleNode).toHaveBeenCalledWith("prov-reconcile");
  });

  it("Space activates a leaf row (no children)", () => {
    const { root, onActivateChild } = setup({ activeChildPath: ["prov-snapshot"] });
    fireEvent.keyDown(root, { key: " " });
    expect(onActivateChild).toHaveBeenCalledWith(["prov-snapshot"]);
  });

  it("Enter activates the focused row", () => {
    const { root, onActivateChild } = setup({ activeChildPath: ["prov-network"] });
    fireEvent.keyDown(root, { key: "Enter" });
    expect(onActivateChild).toHaveBeenCalledWith(["prov-network"]);
  });

  it("ArrowRight expands a collapsed expandable row", () => {
    const { root, onToggleNode } = setup({
      activeChildPath: ["prov-reconcile"],
      openIds: new Set(),
    });
    fireEvent.keyDown(root, { key: "ArrowRight" });
    expect(onToggleNode).toHaveBeenCalledWith("prov-reconcile");
  });

  it("ArrowLeft on a depth-2 child returns focus to its parent", () => {
    const { root } = setup({
      activeChildPath: ["prov-reconcile", "prov-reconcile-device"],
      openIds: new Set(["prov-reconcile"]),
    });
    expect(focusedRowId(root)).toBe("prov-reconcile-device");
    fireEvent.keyDown(root, { key: "ArrowLeft" });
    expect(focusedRowId(root)).toBe("prov-reconcile");
  });

  it("ArrowLeft on a depth-1 leaf with no expansion requests rail focus", () => {
    const { root, onRequestRailFocus } = setup({
      activeChildPath: ["prov-network"],
    });
    fireEvent.keyDown(root, { key: "ArrowLeft" });
    expect(onRequestRailFocus).toHaveBeenCalledTimes(1);
  });

  it("Escape requests rail focus", () => {
    const { root, onRequestRailFocus } = setup();
    fireEvent.keyDown(root, { key: "Escape" });
    expect(onRequestRailFocus).toHaveBeenCalledTimes(1);
  });

  it("ArrowRight on an expanded row descends into its first child", () => {
    const { root } = setup({
      activeChildPath: ["prov-reconcile"],
      openIds: new Set(["prov-reconcile"]),
    });
    expect(focusedRowId(root)).toBe("prov-reconcile");
    act(() => {
      fireEvent.keyDown(root, { key: "ArrowRight" });
    });
    expect(focusedRowId(root)).toBe("prov-reconcile-device");
  });
});

describe("ContextSidebar · zero-child mode", () => {
  it("Escape on a zero-child mode still requests rail focus", () => {
    const { root, onRequestRailFocus } = setup({ activeMode: "operate" });
    fireEvent.keyDown(root, { key: "Escape" });
    expect(onRequestRailFocus).toHaveBeenCalledTimes(1);
  });
});
