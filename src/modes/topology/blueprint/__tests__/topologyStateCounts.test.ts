import { describe, it, expect } from "vitest";
import { computeStateCounts, formatStateLabel } from "../topologyStateCounts";
import type { GraphReadyTopologyView } from "../../topologyReview";

function view(nodeStates: string[], edgeStates: string[]): GraphReadyTopologyView {
  return {
    environment_id: "env-test",
    renderer_attached: false,
    note: "test",
    nodes: nodeStates.map((s, i) => ({
      id: `n${i}`,
      label: `n${i}`,
      vendor: null,
      platform_id: null,
      role_hint: "router",
      layer: "physical",
      operational_state: s as never,
    })),
    edges: edgeStates.map((s, i) => ({
      id: `e${i}`,
      source_node_id: `n${i}`,
      target_node_id: `n${i + 1}`,
      kind: "lldp" as never,
      local_interface: null,
      remote_interface: null,
      evidence_count: 0,
      operational_state: s as never,
    })),
  };
}

describe("computeStateCounts", () => {
  it("counts all-healthy view", () => {
    const c = computeStateCounts(view(["healthy", "healthy", "healthy"], ["healthy", "healthy"]));
    expect(c.devices.healthy).toBe(3);
    expect(c.links.healthy).toBe(2);
    expect(c.affected_devices).toBe(0);
    expect(c.affected_links).toBe(0);
  });

  it("counts mixed states", () => {
    const c = computeStateCounts(view(
      ["healthy", "warning", "degraded", "down", "maintenance", "unknown"],
      ["healthy", "warning"],
    ));
    expect(c.devices.healthy).toBe(1);
    expect(c.devices.warning).toBe(1);
    expect(c.devices.degraded).toBe(1);
    expect(c.devices.down).toBe(1);
    expect(c.devices.maintenance).toBe(1);
    expect(c.devices.unknown).toBe(1);
    expect(c.affected_devices).toBe(5);
    expect(c.affected_links).toBe(1);
  });

  it("treats missing operational_state as healthy", () => {
    const v: GraphReadyTopologyView = {
      environment_id: "env",
      renderer_attached: false,
      note: "",
      nodes: [{ id: "x", label: "x", vendor: null, platform_id: null, role_hint: "router", layer: "physical" }],
      edges: [],
    };
    const c = computeStateCounts(v);
    expect(c.devices.healthy).toBe(1);
    expect(c.affected_devices).toBe(0);
  });

  it("returns zero affected when all healthy", () => {
    const c = computeStateCounts(view(["healthy", "healthy"], ["healthy"]));
    expect(c.affected_devices).toBe(0);
    expect(c.affected_links).toBe(0);
  });

  it("counts empty view", () => {
    const c = computeStateCounts(view([], []));
    expect(c.devices.healthy).toBe(0);
    expect(c.links.healthy).toBe(0);
    expect(c.affected_devices).toBe(0);
    expect(c.affected_links).toBe(0);
  });
});

describe("formatStateLabel", () => {
  it("formats all 6 states", () => {
    expect(formatStateLabel("healthy")).toBe("Healthy");
    expect(formatStateLabel("warning")).toBe("Warning");
    expect(formatStateLabel("degraded")).toBe("Degraded");
    expect(formatStateLabel("down")).toBe("Down");
    expect(formatStateLabel("maintenance")).toBe("Maintenance");
    expect(formatStateLabel("unknown")).toBe("Unknown");
  });
});
