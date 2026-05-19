/**
 * V1AY Topology Graph Surface — SVG Renderer.
 *
 * Renders RenderGraphModel as an interactive SVG.
 * Edges first, then nodes (so nodes appear above edges).
 * Click handling for nodes, edges, and background.
 * Empty and partial states handled with inline messaging.
 */

import type { JSX } from "react";
import type {
  RenderGraphModel,
  RenderGraphSelection,
} from "./renderGraph";

export interface TopologyGraphSurfaceProps {
  readonly model: RenderGraphModel;
  readonly selection: RenderGraphSelection | null;
  readonly onSelect?: (sel: RenderGraphSelection | null) => void;
}

const NODE_RADIUS = 12;
const EDGE_STROKE_WIDTH = 1.5;
const EDGE_STROKE_WIDTH_SELECTED = 3;
const NODE_STROKE_WIDTH = 1;
const NODE_STROKE_WIDTH_SELECTED = 2.5;

export function TopologyGraphSurface({
  model,
  selection,
  onSelect,
}: TopologyGraphSurfaceProps): JSX.Element {
  const handleSvgClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (event.target === event.currentTarget) {
      onSelect?.(null);
    }
  };

  const handleNodeClick = (
    event: React.MouseEvent<SVGGElement>,
    nodeId: string,
  ) => {
    event.stopPropagation();
    onSelect?.({ kind: "node", id: nodeId });
  };

  const handleEdgeClick = (
    event: React.MouseEvent<SVGLineElement>,
    edgeId: string,
  ) => {
    event.stopPropagation();
    onSelect?.({ kind: "edge", id: edgeId });
  };

  // Empty state
  if (model.state === "empty") {
    return (
      <div className="tg-surface" data-testid="tg-surface">
        <div className="tg-empty-panel" data-testid="tg-empty">
          <p className="tg-empty-text">
            No graph available. Import topology evidence or run discovery to populate.
          </p>
        </div>
      </div>
    );
  }

  // SVG viewbox
  const vb = model.viewbox;
  const viewBoxString = `${vb.min_x} ${vb.min_y} ${vb.width} ${vb.height}`;

  return (
    <div className="tg-surface" data-testid="tg-surface">
      <svg
        className="tg-svg"
        data-testid="tg-svg"
        viewBox={viewBoxString}
        onClick={handleSvgClick}
        style={{ width: "100%", height: "100%", background: "#1a1a1a" }}
      >
        {/* Edges (drawn first, so they appear behind nodes) */}
        {model.edges.map((edge) => {
          const sourceNode = model.nodes.find(
            (n) => n.id === edge.source_node_id,
          );
          const targetNode = model.nodes.find(
            (n) => n.id === edge.target_node_id,
          );

          if (!sourceNode || !targetNode) {
            return null;
          }

          const isSelected =
            selection?.kind === "edge" && selection.id === edge.id;
          const strokeWidth = isSelected
            ? EDGE_STROKE_WIDTH_SELECTED
            : EDGE_STROKE_WIDTH;
          const strokeColor = isSelected ? "#00ff00" : "#666666";

          return (
            <g key={edge.id} data-edge={edge.id}>
              <line
                x1={sourceNode.x}
                y1={sourceNode.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                onClick={(event) => handleEdgeClick(event, edge.id)}
                style={{ cursor: "pointer" }}
                data-testid={`tg-edge-${edge.id}`}
                data-selected={isSelected ? "true" : undefined}
              />
            </g>
          );
        })}

        {/* Nodes (drawn second, so they appear above edges) */}
        {model.nodes.map((node) => {
          const isSelected =
            selection?.kind === "node" && selection.id === node.id;
          const strokeWidth = isSelected
            ? NODE_STROKE_WIDTH_SELECTED
            : NODE_STROKE_WIDTH;
          const strokeColor = isSelected ? "#00ff00" : "#999999";
          const fillColor = "#333333";

          return (
            <g
              key={node.id}
              data-node={node.id}
              onClick={(event) => handleNodeClick(event, node.id)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={NODE_RADIUS}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                data-testid={`tg-node-${node.id}`}
                data-selected={isSelected ? "true" : undefined}
              />
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                fontSize="10"
                fill="#cccccc"
                style={{ pointerEvents: "none" }}
              >
                {node.label.substring(0, 3)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Partial state note */}
      {model.state === "partial" && (
        <div
          className="tg-partial-note"
          data-testid="tg-partial-note"
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            fontSize: "12px",
            color: "#999999",
            background: "rgba(0,0,0,0.7)",
            padding: "4px 8px",
            borderRadius: "4px",
          }}
        >
          No edges yet
        </div>
      )}
    </div>
  );
}
