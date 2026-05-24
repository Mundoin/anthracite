/**
 * V1BN.hotfix-3 — Hardware Inspect Receiver surface ownership parity.
 *
 * Asserts that the full-surface owner and map-layer marker are present
 * for every canonical scenario (Micro 3 / Branch 8 / Campus 24 /
 * Datacenter 32 / Metro 96). If a future refactor introduces a
 * scenario-specific wrapper or drops the marker, this test catches it.
 *
 * jsdom cannot measure layout height, so the assertions are structural
 * only — they prove the DOM chain stays consistent across scenarios.
 * Bujar's manual verify is the source of truth for actual full-height
 * rendering.
 */

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import type { JSX, ReactNode } from "react";

import { HardwareInspectReceiver } from "../HardwareInspectReceiver";
import type {
  GraphReadyTopologyEdge,
  GraphReadyTopologyNode,
  GraphReadyTopologyView,
} from "../../topologyReview";
import {
  EnvironmentLifecycleContext,
  type EnvironmentLifecycleContextValue,
} from "../../../../state/EnvironmentLifecycleContext";
import type { LocalEnvironmentRecord } from "../../../../types/localEnvironment";

function makeNode(id: string, role_hint: string): GraphReadyTopologyNode {
  return {
    id,
    label: id,
    vendor: null,
    platform_id: null,
    role_hint,
    layer: "physical",
  };
}

function chainNodes(count: number, role: string): GraphReadyTopologyNode[] {
  return Array.from({ length: count }, (_, i) =>
    makeNode(`n${String(i).padStart(2, "0")}`, role),
  );
}

function chainEdges(count: number): GraphReadyTopologyEdge[] {
  const out: GraphReadyTopologyEdge[] = [];
  for (let i = 0; i + 1 < count; i++) {
    out.push({
      id: `e${i}`,
      source_node_id: `n${String(i).padStart(2, "0")}`,
      target_node_id: `n${String(i + 1).padStart(2, "0")}`,
      kind: "lldp",
      local_interface: null,
      remote_interface: null,
      evidence_count: 1,
    });
  }
  return out;
}

function makeView(
  nodes: GraphReadyTopologyNode[],
  edges: GraphReadyTopologyEdge[],
): GraphReadyTopologyView {
  return {
    environment_id: "env-test",
    nodes,
    edges,
    renderer_attached: false,
    note: "test",
  };
}

function fakeActive(scenarioId: string): LocalEnvironmentRecord {
  return {
    environment_id: "env-test",
    name: scenarioId,
    provenance: "generated-lab" as LocalEnvironmentRecord["provenance"],
    lifecycle_state: "active",
    created_at: "2026-05-24T00:00:00Z",
    updated_at: "2026-05-24T00:00:00Z",
    lab_payload: {
      scenario_id: scenarioId,
    } as unknown as LocalEnvironmentRecord["lab_payload"],
  } as LocalEnvironmentRecord;
}

function withActive(
  active: LocalEnvironmentRecord,
  ui: ReactNode,
): JSX.Element {
  const value = { active } as unknown as EnvironmentLifecycleContextValue;
  return (
    <EnvironmentLifecycleContext.Provider value={value}>
      {ui}
    </EnvironmentLifecycleContext.Provider>
  );
}

const scenarios: Array<{
  label: string;
  count: number;
  role: string;
  scenarioId: string;
}> = [
  { label: "Micro 3",       count: 3,  role: "switch", scenarioId: "micro-lab" },
  { label: "Branch 8",      count: 8,  role: "switch", scenarioId: "branch-office" },
  { label: "Campus 24",     count: 24, role: "switch", scenarioId: "campus" },
  { label: "Datacenter 32", count: 32, role: "router", scenarioId: "datacenter-pod" },
  { label: "Metro 96",      count: 96, role: "router", scenarioId: "metro-backbone" },
];

describe("HardwareInspectReceiver — V1BN.hotfix-3 full-surface parity", () => {
  for (const s of scenarios) {
    it(`${s.label} — mounts identical full-surface chain (receiver > map > svg)`, () => {
      const view = makeView(chainNodes(s.count, s.role), chainEdges(s.count));
      const { container } = render(
        withActive(
          fakeActive(s.scenarioId),
          <HardwareInspectReceiver
            canvasProps={{ view, dataSource: "simulated" }}
          />,
        ),
      );

      const fullSurface = container.querySelector(
        '[data-topology-full-surface="true"]',
      );
      const mapLayer = container.querySelector(
        '[data-topology-map-layer="true"]',
      );
      const svgLayer = container.querySelector(
        '[data-topology-svg-layer="true"]',
      );

      expect(fullSurface).not.toBeNull();
      expect(mapLayer).not.toBeNull();
      expect(svgLayer).not.toBeNull();

      // Map layer must be inside full-surface owner; svg inside map.
      expect(fullSurface?.contains(mapLayer!)).toBe(true);
      expect(mapLayer?.contains(svgLayer!)).toBe(true);

      // No scenario-specific wrapper class.
      expect(fullSurface?.className).toBe("hardware-inspect-receiver");
      expect(mapLayer?.className).toBe("hir-map");
    });
  }

  it("bay-closed at mount keeps map layer mounted", () => {
    const view = makeView(chainNodes(8, "switch"), chainEdges(8));
    const { container } = render(
      withActive(
        fakeActive("branch-office"),
        <HardwareInspectReceiver
          canvasProps={{ view, dataSource: "simulated" }}
        />,
      ),
    );
    const fullSurface = container.querySelector(
      '[data-topology-full-surface="true"]',
    );
    const mapLayer = container.querySelector(
      '[data-topology-map-layer="true"]',
    );
    // Bay not in DOM at mount (no inspect intent).
    expect(container.querySelector('[data-testid="hir-bay"]')).toBeNull();
    expect(fullSurface).not.toBeNull();
    expect(mapLayer).not.toBeNull();
  });
});
