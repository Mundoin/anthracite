/**
 * V1CB-HF1 — Imported-Evidence Demo Fixture.
 *
 * Tiny hand-crafted topology view modelled after the shape that the
 * real imported neighbour-evidence pipeline (V1AS) produces:
 *   - 4 devices (firewall + core router + dist switch + access switch)
 *   - 3 LLDP-style edges with non-zero evidence_count
 *   - one warning node + one degraded node so V1BU device state, V1BV
 *     link state, V1BW affected-only fade, and V1BX affected focus all
 *     have visible payload to react to
 *
 * Pure, deterministic — no Date.now(), no I/O. Returns a raw
 * GraphReadyTopologyView without source info; callers (TopologyMode)
 * pass it through `attachImportedSourceToTopologyView` so V1BY source
 * contract stamps `kind = "imported"` before render.
 */

import type {
  GraphReadyTopologyEdge,
  GraphReadyTopologyNode,
  GraphReadyTopologyView,
} from "../topologyReview";
import { deriveLinkState } from "../blueprint/linkState";

export const IMPORTED_DEMO_ENV_ID = "env-imported-demo";

export interface BuildImportedDemoOptions {
  readonly environmentId?: string;
}

export function buildImportedDemoTopologyView(
  options: BuildImportedDemoOptions = {},
): GraphReadyTopologyView {
  const nodes: readonly GraphReadyTopologyNode[] = [
    {
      id: "fw-edge-01",
      label: "fw-edge-01",
      vendor: "Fortinet",
      platform_id: "fortios",
      role_hint: "firewall",
      layer: "physical",
      operational_state: "healthy",
    },
    {
      id: "core-rtr-01",
      label: "core-rtr-01",
      vendor: "Cisco",
      platform_id: "iosxe",
      role_hint: "core router",
      layer: "physical",
      operational_state: "warning",
    },
    {
      id: "dist-sw-01",
      label: "dist-sw-01",
      vendor: "Cisco",
      platform_id: "nxos",
      role_hint: "distribution switch",
      layer: "physical",
      operational_state: "degraded",
    },
    {
      id: "acc-sw-01",
      label: "acc-sw-01",
      vendor: "Arista",
      platform_id: "eos",
      role_hint: "access switch",
      layer: "physical",
      operational_state: "healthy",
    },
  ];

  const stateById = new Map(
    nodes.map((n) => [n.id, n.operational_state] as const),
  );

  const rawEdges: ReadonlyArray<Omit<GraphReadyTopologyEdge, "operational_state">> = [
    {
      id: "lldp-fw-core",
      source_node_id: "fw-edge-01",
      target_node_id: "core-rtr-01",
      kind: "lldp",
      local_interface: "Ethernet1/1",
      remote_interface: "GigabitEthernet0/0",
      evidence_count: 2,
    },
    {
      id: "lldp-core-dist",
      source_node_id: "core-rtr-01",
      target_node_id: "dist-sw-01",
      kind: "lldp",
      local_interface: "GigabitEthernet0/1",
      remote_interface: "Ethernet1/1",
      evidence_count: 2,
    },
    {
      id: "lldp-dist-acc",
      source_node_id: "dist-sw-01",
      target_node_id: "acc-sw-01",
      kind: "lldp",
      local_interface: "Ethernet1/2",
      remote_interface: "Ethernet1",
      evidence_count: 1,
    },
  ];

  const edges: readonly GraphReadyTopologyEdge[] = rawEdges.map((e) => ({
    ...e,
    operational_state: deriveLinkState(
      stateById.get(e.source_node_id),
      stateById.get(e.target_node_id),
    ),
  }));

  return {
    environment_id: options.environmentId ?? IMPORTED_DEMO_ENV_ID,
    nodes,
    edges,
    renderer_attached: false,
    note: "imported-evidence demo (V1CB-HF1)",
  };
}
