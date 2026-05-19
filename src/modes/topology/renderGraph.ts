/**
 * V1AY Core Graph Renderer — Adapter Layer.
 *
 * Pure-function module converting GraphReadyTopologyView (V1AS contract)
 * into RenderGraphModel (renderer-agnostic, layout-aware shape).
 *
 * Tech decision: SVG rendering. Babylon.js reserved for future 3D variant.
 * Layout: Deterministic circular layout, no physics, no animation, no randomness.
 * Same input always yields identical output.
 *
 * Doctrine: Renderer is a pure consumer of topology truth. This adapter
 * assigns layout coordinates but does NOT mutate the source view.
 */

import type {
  GraphReadyTopologyView,
  GraphReadyTopologyNode,
} from "./topologyReview";

// =============================================================================
// Renderer Contract Types
// =============================================================================

export type RenderGraphDataSource =
  | "demo"
  | "fixture"
  | "imported"
  | "simulated"
  | "unknown";

export interface RenderGraphNode {
  readonly id: string;
  readonly label: string;
  readonly vendor: string | null;
  readonly platform_id: string | null;
  readonly role_hint: string;
  readonly layer: string;
  readonly x: number;
  readonly y: number;
}

export interface RenderGraphEdge {
  readonly id: string;
  readonly source_node_id: string;
  readonly target_node_id: string;
  readonly kind: string;
  readonly local_interface: string | null;
  readonly remote_interface: string | null;
  readonly evidence_count: number;
}

export type RenderGraphState =
  | "empty"
  | "partial"
  | "rendered";

export interface RenderGraphModel {
  readonly environment_id: string | null;
  readonly data_source: RenderGraphDataSource;
  readonly state: RenderGraphState;
  readonly nodes: readonly RenderGraphNode[];
  readonly edges: readonly RenderGraphEdge[];
  readonly node_count: number;
  readonly edge_count: number;
  readonly viewbox: {
    readonly min_x: number;
    readonly min_y: number;
    readonly width: number;
    readonly height: number;
  };
}

export interface BuildRenderGraphInput {
  readonly view: GraphReadyTopologyView;
  readonly data_source: RenderGraphDataSource;
}

export type RenderGraphSelection =
  | { readonly kind: "node"; readonly id: string }
  | { readonly kind: "edge"; readonly id: string };

// =============================================================================
// Layout Computation
// =============================================================================

/**
 * Deterministic circular layout.
 * Sorted node ids placed on a circle centered at (cx, cy) with radius r.
 * Radius scales with node count for visibility: max(120, 24 * N).
 */
function computeCircularLayout(
  nodes: readonly GraphReadyTopologyNode[],
  cx: number = 0,
  cy: number = 0,
): Map<string, { x: number; y: number }> {
  const layout = new Map<string, { x: number; y: number }>();

  if (nodes.length === 0) {
    return layout;
  }

  // Sort node ids for deterministic ordering
  const sortedIds = [...nodes.map((n) => n.id)].sort();
  const n = sortedIds.length;

  // Scale radius by node count
  const r = Math.max(120, 24 * n);

  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    layout.set(sortedIds[i], { x, y });
  }

  return layout;
}

/**
 * Compute viewbox from node coordinates with padding.
 */
function computeViewbox(
  nodes: readonly RenderGraphNode[],
  padding: number = 32,
): {
  min_x: number;
  min_y: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return {
      min_x: -100,
      min_y: -100,
      width: 200,
      height: 200,
    };
  }

  let minX = nodes[0].x;
  let maxX = nodes[0].x;
  let minY = nodes[0].y;
  let maxY = nodes[0].y;

  for (const node of nodes) {
    if (node.x < minX) minX = node.x;
    if (node.x > maxX) maxX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.y > maxY) maxY = node.y;
  }

  return {
    min_x: minX - padding,
    min_y: minY - padding,
    width: maxX - minX + 2 * padding,
    height: maxY - minY + 2 * padding,
  };
}

// =============================================================================
// Builder
// =============================================================================

export function buildRenderGraph(
  input: BuildRenderGraphInput,
): RenderGraphModel {
  const { view, data_source } = input;

  // Determine state
  let state: RenderGraphState;
  if (view.nodes.length === 0) {
    state = "empty";
  } else if (view.edges.length === 0) {
    state = "partial";
  } else {
    state = "rendered";
  }

  // Compute layout
  const layout = computeCircularLayout(view.nodes);

  // Build render nodes with coordinates
  const renderNodes: RenderGraphNode[] = view.nodes.map((node) => {
    const coords = layout.get(node.id);
    if (!coords) {
      // Fallback (should never happen with deterministic layout)
      return { ...node, x: 0, y: 0 };
    }
    return {
      id: node.id,
      label: node.label,
      vendor: node.vendor,
      platform_id: node.platform_id,
      role_hint: node.role_hint,
      layer: node.layer,
      x: coords.x,
      y: coords.y,
    };
  });

  // Build render edges (kind as string for renderer simplicity)
  const renderEdges: RenderGraphEdge[] = view.edges.map((edge) => ({
    id: edge.id,
    source_node_id: edge.source_node_id,
    target_node_id: edge.target_node_id,
    kind: edge.kind,
    local_interface: edge.local_interface,
    remote_interface: edge.remote_interface,
    evidence_count: edge.evidence_count,
  }));

  // Compute viewbox
  const viewbox = computeViewbox(renderNodes);

  return {
    environment_id: view.environment_id,
    data_source,
    state,
    nodes: Object.freeze(renderNodes) as readonly RenderGraphNode[],
    edges: Object.freeze(renderEdges) as readonly RenderGraphEdge[],
    node_count: renderNodes.length,
    edge_count: renderEdges.length,
    viewbox,
  };
}
