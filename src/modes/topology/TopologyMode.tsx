import type { JSX } from "react";
import { DataSourceTag } from "../../components/shell/DataSourceTag";
import type { TopologySourceView } from "../../data/topologySource";
import "./TopologyMode.css";

export interface TopologyModeProps {
  readonly topology: TopologySourceView;
}

export function TopologyMode({ topology }: TopologyModeProps): JSX.Element {
  return (
    <div className="topology-mode">
      <header className="tm-header">
        <h2 className="tm-title">
          Topology <DataSourceTag state={topology.sourceState} />
        </h2>
        <p className="tm-scope">
          Scope: {topology.environmentId ?? "All environments"}
        </p>
      </header>

      <section className="tm-summary" data-testid="tm-summary">
        <span className="tm-summary-cell">
          <span className="tm-summary-label">Nodes</span>
          <span className="tm-summary-value">{topology.nodeCount}</span>
        </span>
        <span className="tm-summary-cell">
          <span className="tm-summary-label">Edges</span>
          <span className="tm-summary-value">{topology.edgeCount}</span>
        </span>
        <span className="tm-summary-cell">
          <span className="tm-summary-label">Source records</span>
          <span className="tm-summary-value">{topology.sourceRecordCount}</span>
        </span>
        <span className="tm-summary-message">{topology.message}</span>
      </section>

      {topology.view === null ? (
        <section
          className="tm-body tm-body--unavailable"
          role="status"
          aria-label="Topology unavailable"
        >
          <p>Topology source is not available right now.</p>
          <p className="tm-muted">{topology.message}</p>
        </section>
      ) : topology.isEmpty ? (
        <section
          className="tm-body tm-body--empty"
          role="status"
          aria-label="Topology empty"
        >
          <p>
            No topology to render — discovery inventory is empty for this scope.
          </p>
          <p className="tm-muted">
            Import devices via INTAKE to populate Discovery.
          </p>
        </section>
      ) : (
        <section className="tm-body tm-body--nodes" data-testid="tm-nodes">
          <h3 className="tm-section-heading">Nodes ({topology.nodeCount})</h3>
          <ul className="tm-node-list">
            {topology.view.nodes.map((node) => (
              <li
                key={node.id}
                className="tm-node-card"
                data-testid={`tm-node-${node.id}`}
              >
                <div className="tm-node-label">{node.label}</div>
                <div className="tm-node-meta">
                  <span className="tm-node-tag">{node.vendor ?? "—"}</span>
                  <span className="tm-node-tag">
                    {node.platform_id ?? "—"}
                  </span>
                  <span className="tm-node-tag tm-node-tag--muted">
                    {node.layer}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="tm-edges-note">
            Edges: {topology.edgeCount} reliable link
            {topology.edgeCount === 1 ? "" : "s"}.
          </p>
        </section>
      )}
    </div>
  );
}
