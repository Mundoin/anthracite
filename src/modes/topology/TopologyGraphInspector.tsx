/**
 * V1AY Topology Graph Inspector — Selection Details Panel.
 *
 * Displays detailed information about selected nodes or edges.
 * Null selection → empty state.
 * Node selection → node metadata.
 * Edge selection → edge metadata + evidence status.
 */

import type { JSX } from "react";
import type {
  RenderGraphModel,
  RenderGraphSelection,
} from "./renderGraph";

export interface TopologyGraphInspectorProps {
  readonly model: RenderGraphModel;
  readonly selection: RenderGraphSelection | null;
}

export function TopologyGraphInspector({
  model,
  selection,
}: TopologyGraphInspectorProps): JSX.Element {
  if (selection === null) {
    return (
      <div className="tgi-inspector" data-testid="tgi-empty">
        <p style={{ color: "#999999", fontSize: "14px" }}>
          Select a node or edge to inspect.
        </p>
      </div>
    );
  }

  if (selection.kind === "node") {
    const node = model.nodes.find((n) => n.id === selection.id);
    if (!node) {
      return (
        <div className="tgi-inspector" data-testid="tgi-node">
          <p style={{ color: "#ff6666" }}>Node not found.</p>
        </div>
      );
    }

    return (
      <div className="tgi-inspector" data-testid="tgi-node">
        <div className="tgi-field">
          <span className="tgi-label">ID</span>
          <span className="tgi-value">{node.id}</span>
        </div>
        <div className="tgi-field">
          <span className="tgi-label">Label</span>
          <span className="tgi-value">{node.label}</span>
        </div>
        <div className="tgi-field">
          <span className="tgi-label">Vendor</span>
          <span className="tgi-value">{node.vendor ?? "—"}</span>
        </div>
        <div className="tgi-field">
          <span className="tgi-label">Platform ID</span>
          <span className="tgi-value">{node.platform_id ?? "—"}</span>
        </div>
        <div className="tgi-field">
          <span className="tgi-label">Role Hint</span>
          <span className="tgi-value">{node.role_hint}</span>
        </div>
        <div className="tgi-field">
          <span className="tgi-label">Layer</span>
          <span className="tgi-value">{node.layer}</span>
        </div>
      </div>
    );
  }

  if (selection.kind === "edge") {
    const edge = model.edges.find((e) => e.id === selection.id);
    if (!edge) {
      return (
        <div className="tgi-inspector" data-testid="tgi-edge">
          <p style={{ color: "#ff6666" }}>Edge not found.</p>
        </div>
      );
    }

    return (
      <div className="tgi-inspector" data-testid="tgi-edge">
        <div className="tgi-field">
          <span className="tgi-label">ID</span>
          <span className="tgi-value">{edge.id}</span>
        </div>
        <div className="tgi-field">
          <span className="tgi-label">Source Node</span>
          <span className="tgi-value">{edge.source_node_id}</span>
        </div>
        <div className="tgi-field">
          <span className="tgi-label">Target Node</span>
          <span className="tgi-value">{edge.target_node_id}</span>
        </div>
        <div className="tgi-field">
          <span className="tgi-label">Kind</span>
          <span className="tgi-value">{edge.kind}</span>
        </div>
        <div className="tgi-field">
          <span className="tgi-label">Local Interface</span>
          <span className="tgi-value">{edge.local_interface ?? "—"}</span>
        </div>
        <div className="tgi-field">
          <span className="tgi-label">Remote Interface</span>
          <span className="tgi-value">{edge.remote_interface ?? "—"}</span>
        </div>
        <div className="tgi-field">
          <span className="tgi-label">Evidence Count</span>
          <span className="tgi-value">{edge.evidence_count}</span>
        </div>
        {edge.evidence_count === 0 && (
          <div
            className="tgi-no-evidence"
            data-testid="tgi-no-evidence"
            style={{
              marginTop: "12px",
              padding: "8px",
              background: "rgba(255, 102, 102, 0.1)",
              borderLeft: "2px solid #ff6666",
              fontSize: "13px",
              color: "#ff9999",
            }}
          >
            No evidence attached to this edge yet.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="tgi-inspector">
      <p style={{ color: "#ff6666" }}>Unknown selection type.</p>
    </div>
  );
}
