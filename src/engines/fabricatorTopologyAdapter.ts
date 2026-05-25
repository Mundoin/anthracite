/**
 * D4C — Fabricator Topology Adapter.
 *
 * Pure deterministic adapter: FabricatorEnvironment → GraphReadyTopologyView.
 * The output is renderer-agnostic and theme-agnostic.
 * Feed it to buildRenderGraph() with data_source: "demo" for any canvas.
 *
 * Future-proofing:
 *   - GraphReadyTopologyView is already the contract for 2D SVG and is the
 *     planned input for future Babylon.js 3D rendering.
 *   - Adding more devices/links only requires extending the FabricatorEnvironment.
 *   - Vendor/platform fields are preserved for future icon/theme mapping.
 *   - No coordinates here — layout is assigned by buildRenderGraph (deterministic
 *     circular layout scales with N nodes).
 */

import type { FabricatorEnvironment } from "../types/fabricator";
import type {
  GraphReadyTopologyEdge,
  GraphReadyTopologyNode,
  GraphReadyTopologyView,
} from "../modes/topology/topologyReview";
import { generateFabricatorEnvironment } from "./fabricator";
import { buildRenderGraph } from "../modes/topology/renderGraph";
import type { RenderGraphModel } from "../modes/topology/renderGraph";

const FABRICATOR_TOPOLOGY_NOTE =
  "Fabricated topology — synthetic demo data. No live network contact.";

/**
 * Converts a FabricatorEnvironment into a GraphReadyTopologyView.
 *
 * Mapping:
 *   FabricatedDevice  → GraphReadyTopologyNode  (vendor/platform preserved)
 *   FabricatedLink    → GraphReadyTopologyEdge  (kind: "manual" — fabricated links)
 *
 * Pure — no I/O, no randomness, no timestamps.
 */
export function toGraphReadyTopologyView(
  env: FabricatorEnvironment,
): GraphReadyTopologyView {
  const nodes: GraphReadyTopologyNode[] = env.devices.map((d) => ({
    id: d.id,
    label: d.name,
    vendor: d.vendor,
    platform_id: d.platform,
    role_hint: d.role_hint,
    layer: "inventory",
    operational_state: d.operational_state ?? "healthy",
  }));

  const edges: GraphReadyTopologyEdge[] = env.links.map((l) => ({
    id: l.id,
    source_node_id: l.source_device_id,
    target_node_id: l.target_device_id,
    kind: "manual",
    local_interface: null,
    remote_interface: null,
    evidence_count: 0,
  }));

  return {
    environment_id: env.environment_id,
    nodes: Object.freeze(nodes) as readonly GraphReadyTopologyNode[],
    edges: Object.freeze(edges) as readonly GraphReadyTopologyEdge[],
    renderer_attached: false,
    note: FABRICATOR_TOPOLOGY_NOTE,
  };
}

/**
 * Convenience: build the full RenderGraphModel for the fabricated demo
 * environment in one call. data_source is always "demo".
 *
 * Callers pass the result directly to TopologyGraphPanel or any renderer
 * that accepts RenderGraphModel.
 */
export function buildFabricatorRenderGraph(): RenderGraphModel {
  const view = toGraphReadyTopologyView(generateFabricatorEnvironment());
  return buildRenderGraph({ view, data_source: "demo" });
}
