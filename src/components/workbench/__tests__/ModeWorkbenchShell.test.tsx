/**
 * V1BH — ModeWorkbenchShell unit tests.
 *
 * Pure UI contract:
 *   - renders title/tagline
 *   - renders tool rail entries in order with status chips
 *   - clicking a tool calls onSelectTool with its id
 *   - active tool's render output appears in the body
 *   - deferred tool renders honest deferred body with planned inputs/controls
 *   - resolveActiveTool falls back when active id is unknown
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ModeWorkbenchShell } from "../ModeWorkbenchShell";
import type { ModeTool, ModeWorkbenchModel } from "../types";
import { resolveActiveTool } from "../types";

function makeModel(overrides: Partial<ModeWorkbenchModel> = {}): ModeWorkbenchModel {
  const tools: ModeTool[] = [
    {
      id: "alpha",
      kind: "live",
      label: "Alpha",
      description: "Live alpha tool",
      group: "primary",
      status: "available",
      render: () => <div data-testid="alpha-body">alpha-render</div>,
    },
    {
      id: "beta",
      kind: "deferred",
      label: "Beta",
      description: "Deferred beta tool",
      group: "discovery",
      status: "deferred",
      deferred: {
        reason: "Beta engine not built yet.",
        planned_inputs: ["seed", "credential"],
        planned_controls: ["max depth"],
        route_hint: { label: "See Topology" },
      },
    },
    {
      id: "gamma",
      kind: "deferred",
      label: "Gamma",
      description: "Blocked gamma tool",
      group: "support",
      status: "blocked",
      deferred: { reason: "Gamma blocked." },
    },
  ];
  return {
    title: "Workbench",
    tagline: "test tagline",
    tools,
    active_id: "alpha",
    fallback_id: "alpha",
    ...overrides,
  };
}

describe("ModeWorkbenchShell", () => {
  it("renders title and tagline", () => {
    render(<ModeWorkbenchShell model={makeModel()} onSelectTool={vi.fn()} />);
    expect(screen.getByText("Workbench")).toBeInTheDocument();
    expect(screen.getByText("test tagline")).toBeInTheDocument();
  });

  it("renders all tools in the rail", () => {
    render(<ModeWorkbenchShell model={makeModel()} onSelectTool={vi.fn()} />);
    expect(screen.getByTestId("mwb-tool-alpha")).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-beta")).toBeInTheDocument();
    expect(screen.getByTestId("mwb-tool-gamma")).toBeInTheDocument();
  });

  it("marks the active tool with aria-selected=true", () => {
    render(<ModeWorkbenchShell model={makeModel()} onSelectTool={vi.fn()} />);
    const alphaBtn = screen.getByTestId("mwb-tool-alpha");
    expect(alphaBtn.getAttribute("aria-selected")).toBe("true");
    const betaBtn = screen.getByTestId("mwb-tool-beta");
    expect(betaBtn.getAttribute("aria-selected")).toBe("false");
  });

  it("disables blocked tools", () => {
    render(<ModeWorkbenchShell model={makeModel()} onSelectTool={vi.fn()} />);
    const gammaBtn = screen.getByTestId("mwb-tool-gamma") as HTMLButtonElement;
    expect(gammaBtn.disabled).toBe(true);
  });

  it("calls onSelectTool with id on click", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ModeWorkbenchShell model={makeModel()} onSelectTool={onSelect} />);
    await user.click(screen.getByTestId("mwb-tool-beta"));
    expect(onSelect).toHaveBeenCalledWith("beta");
  });

  it("renders live tool body via render fn", () => {
    render(<ModeWorkbenchShell model={makeModel()} onSelectTool={vi.fn()} />);
    expect(screen.getByTestId("alpha-body").textContent).toBe("alpha-render");
  });

  it("renders deferred body with reason, planned inputs, controls, and route", () => {
    const m = makeModel({ active_id: "beta" });
    render(<ModeWorkbenchShell model={m} onSelectTool={vi.fn()} />);
    expect(screen.getByTestId("mwb-deferred-beta")).toBeInTheDocument();
    expect(screen.getByText("Beta engine not built yet.")).toBeInTheDocument();
    expect(screen.getByText("seed")).toBeInTheDocument();
    expect(screen.getByText("max depth")).toBeInTheDocument();
    expect(screen.getByText("See Topology")).toBeInTheDocument();
  });

  it("status chip reflects tool status", () => {
    render(<ModeWorkbenchShell model={makeModel({ active_id: "beta" })} onSelectTool={vi.fn()} />);
    expect(
      screen.getByTestId("mode-workbench-active-status").textContent,
    ).toBe("DEFERRED");
  });

  it("data-active-tool attribute tracks active id", () => {
    const { rerender } = render(
      <ModeWorkbenchShell model={makeModel()} onSelectTool={vi.fn()} />,
    );
    expect(
      screen.getByTestId("mode-workbench-active").getAttribute("data-active-tool"),
    ).toBe("alpha");
    rerender(
      <ModeWorkbenchShell
        model={makeModel({ active_id: "beta" })}
        onSelectTool={vi.fn()}
      />,
    );
    expect(
      screen.getByTestId("mode-workbench-active").getAttribute("data-active-tool"),
    ).toBe("beta");
  });
});

describe("resolveActiveTool", () => {
  it("returns the directly matching tool", () => {
    const m = makeModel();
    expect(resolveActiveTool(m)?.id).toBe("alpha");
  });

  it("falls back to fallback_id when active is unknown", () => {
    const m = makeModel({ active_id: "missing", fallback_id: "beta" });
    expect(resolveActiveTool(m)?.id).toBe("beta");
  });

  it("returns first tool when no fallback is set and active is unknown", () => {
    const m = makeModel({ active_id: "missing", fallback_id: undefined });
    expect(resolveActiveTool(m)?.id).toBe("alpha");
  });
});
