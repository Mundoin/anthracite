import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopologyStateLegend } from "../TopologyStateLegend";
import type { GraphReadyTopologyView } from "../../topologyReview";

function mockView(
  deviceStates: Array<{ state: string; count: number }>,
  linkStates: Array<{ state: string; count: number }>,
): GraphReadyTopologyView {
  const nodes = deviceStates.flatMap(({ state, count }) =>
    Array.from({ length: count }, (_, i) => ({
      id: `n-${state}-${i}`,
      label: `Device ${state} ${i}`,
      vendor: null as const,
      platform_id: null as const,
      role_hint: "router",
      layer: "physical",
      operational_state: state as any,
    })),
  );
  const edges = linkStates.flatMap(({ state, count }) =>
    Array.from({ length: count }, (_, i) => ({
      id: `e-${state}-${i}`,
      source_node_id: `n-${state}-${i}`,
      target_node_id: `n-${state}-${i + 1}`,
      kind: "lldp" as const,
      local_interface: null as const,
      remote_interface: null as const,
      evidence_count: 0,
      operational_state: state as any,
    })),
  );
  return {
    environment_id: "env-test",
    renderer_attached: false,
    note: "test view",
    nodes,
    edges,
  };
}

describe("TopologyStateLegend", () => {
  it("renders legend with devices section", () => {
    const view = mockView(
      [
        { state: "healthy", count: 5 },
        { state: "warning", count: 2 },
      ],
      [],
    );
    const onToggle = vi.fn();
    render(
      <TopologyStateLegend view={view} affectedOnly={false} onToggleAffectedOnly={onToggle} />,
    );
    expect(screen.getByTestId("bt-legend-devices")).toBeInTheDocument();
    expect(screen.getByTestId("bt-legend-device-healthy")).toHaveTextContent("5");
    expect(screen.getByTestId("bt-legend-device-warning")).toHaveTextContent("2");
  });

  it("renders legend with links section", () => {
    const view = mockView(
      [],
      [
        { state: "healthy", count: 3 },
        { state: "degraded", count: 1 },
      ],
    );
    const onToggle = vi.fn();
    render(
      <TopologyStateLegend view={view} affectedOnly={false} onToggleAffectedOnly={onToggle} />,
    );
    expect(screen.getByTestId("bt-legend-links")).toBeInTheDocument();
    expect(screen.getByTestId("bt-legend-link-healthy")).toHaveTextContent("3");
    expect(screen.getByTestId("bt-legend-link-degraded")).toHaveTextContent("1");
  });

  it("renders all 6 device states", () => {
    const view = mockView(
      [
        { state: "healthy", count: 1 },
        { state: "warning", count: 1 },
        { state: "degraded", count: 1 },
        { state: "down", count: 1 },
        { state: "maintenance", count: 1 },
        { state: "unknown", count: 1 },
      ],
      [],
    );
    const onToggle = vi.fn();
    render(
      <TopologyStateLegend view={view} affectedOnly={false} onToggleAffectedOnly={onToggle} />,
    );
    expect(screen.getByTestId("bt-legend-device-healthy")).toBeInTheDocument();
    expect(screen.getByTestId("bt-legend-device-warning")).toBeInTheDocument();
    expect(screen.getByTestId("bt-legend-device-degraded")).toBeInTheDocument();
    expect(screen.getByTestId("bt-legend-device-down")).toBeInTheDocument();
    expect(screen.getByTestId("bt-legend-device-maintenance")).toBeInTheDocument();
    expect(screen.getByTestId("bt-legend-device-unknown")).toBeInTheDocument();
  });

  it("renders all 6 link states", () => {
    const view = mockView(
      [],
      [
        { state: "healthy", count: 1 },
        { state: "warning", count: 1 },
        { state: "degraded", count: 1 },
        { state: "down", count: 1 },
        { state: "maintenance", count: 1 },
        { state: "unknown", count: 1 },
      ],
    );
    const onToggle = vi.fn();
    render(
      <TopologyStateLegend view={view} affectedOnly={false} onToggleAffectedOnly={onToggle} />,
    );
    expect(screen.getByTestId("bt-legend-link-healthy")).toBeInTheDocument();
    expect(screen.getByTestId("bt-legend-link-warning")).toBeInTheDocument();
    expect(screen.getByTestId("bt-legend-link-degraded")).toBeInTheDocument();
    expect(screen.getByTestId("bt-legend-link-down")).toBeInTheDocument();
    expect(screen.getByTestId("bt-legend-link-maintenance")).toBeInTheDocument();
    expect(screen.getByTestId("bt-legend-link-unknown")).toBeInTheDocument();
  });

  it("toggles affected-only checkbox and fires callback", async () => {
    const view = mockView([{ state: "healthy", count: 1 }], []);
    const onToggle = vi.fn();
    render(
      <TopologyStateLegend view={view} affectedOnly={false} onToggleAffectedOnly={onToggle} />,
    );
    const checkbox = screen.getByTestId("bt-legend-affected-input");
    expect(checkbox).not.toBeChecked();
    await userEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("reflects affectedOnly prop in checkbox state", () => {
    const view = mockView([{ state: "healthy", count: 1 }], []);
    const onToggle = vi.fn();
    const { rerender } = render(
      <TopologyStateLegend view={view} affectedOnly={false} onToggleAffectedOnly={onToggle} />,
    );
    let checkbox = screen.getByTestId("bt-legend-affected-input");
    expect(checkbox).not.toBeChecked();
    rerender(
      <TopologyStateLegend view={view} affectedOnly={true} onToggleAffectedOnly={onToggle} />,
    );
    checkbox = screen.getByTestId("bt-legend-affected-input");
    expect(checkbox).toBeChecked();
  });

  it("updates title when there are affected items", () => {
    const view = mockView(
      [
        { state: "healthy", count: 3 },
        { state: "warning", count: 2 },
      ],
      [
        { state: "healthy", count: 2 },
        { state: "down", count: 1 },
      ],
    );
    const onToggle = vi.fn();
    const { container } = render(
      <TopologyStateLegend view={view} affectedOnly={false} onToggleAffectedOnly={onToggle} />,
    );
    const label = container.querySelector(".bt-legend-affected");
    expect(label?.getAttribute("title")).toContain("2 affected devices");
    expect(label?.getAttribute("title")).toContain("1 affected links");
  });

  it("shows 'No affected items' title when all healthy", () => {
    const view = mockView([{ state: "healthy", count: 5 }], [{ state: "healthy", count: 3 }]);
    const onToggle = vi.fn();
    const { container } = render(
      <TopologyStateLegend view={view} affectedOnly={false} onToggleAffectedOnly={onToggle} />,
    );
    const label = container.querySelector(".bt-legend-affected");
    expect(label?.getAttribute("title")).toBe("No affected items");
  });

  it("counts states correctly in complex scenario", () => {
    const view = mockView(
      [
        { state: "healthy", count: 10 },
        { state: "warning", count: 3 },
        { state: "degraded", count: 2 },
        { state: "down", count: 1 },
      ],
      [
        { state: "healthy", count: 8 },
        { state: "warning", count: 2 },
      ],
    );
    const onToggle = vi.fn();
    render(
      <TopologyStateLegend view={view} affectedOnly={false} onToggleAffectedOnly={onToggle} />,
    );
    expect(screen.getByTestId("bt-legend-device-healthy")).toHaveTextContent("10");
    expect(screen.getByTestId("bt-legend-device-warning")).toHaveTextContent("3");
    expect(screen.getByTestId("bt-legend-device-degraded")).toHaveTextContent("2");
    expect(screen.getByTestId("bt-legend-device-down")).toHaveTextContent("1");
    expect(screen.getByTestId("bt-legend-link-healthy")).toHaveTextContent("8");
    expect(screen.getByTestId("bt-legend-link-warning")).toHaveTextContent("2");
  });
});
