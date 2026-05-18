import type { JSX } from "react";
import { DataSourceTag } from "../../components/shell/DataSourceTag";
import type { TopologySourceView } from "../../data/topologySource";
import type {
  TopologyAdjacencyFactSourceState,
  TopologyAdjacencyReadiness,
} from "../../types/topology";
import "./TopologyMode.css";

export interface TopologyModeProps {
  readonly topology: TopologySourceView;
}

interface AdjacencyReadinessSectionProps {
  readonly readiness: TopologyAdjacencyReadiness;
}

function stateLabel(state: TopologyAdjacencyFactSourceState): string {
  switch (state) {
    case "none_available":
      return "no sources connected";
    case "partial":
      return "partial coverage";
    case "ready":
      return "ready";
  }
}

function AdjacencyReadinessSection({
  readiness,
}: AdjacencyReadinessSectionProps): JSX.Element {
  return (
    <section
      className="tm-adjacency"
      data-testid="tm-adjacency"
      aria-label="Adjacency readiness"
    >
      <h3 className="tm-section-heading">
        Adjacency readiness · {stateLabel(readiness.fact_source_state)}
      </h3>
      <p className="tm-adjacency-reason">{readiness.reason}</p>
      <dl className="tm-adjacency-summary">
        <div className="tm-adjacency-summary-row">
          <dt>Eligible nodes</dt>
          <dd>{readiness.eligible_node_count}</dd>
        </div>
        <div className="tm-adjacency-summary-row">
          <dt>Accepted kinds</dt>
          <dd>{readiness.accepted_kinds.join(", ")}</dd>
        </div>
      </dl>
      <table className="tm-adjacency-table" data-testid="tm-adjacency-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>State</th>
            <th>Count</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {readiness.fact_sources.map((src) => (
            <tr key={src.kind} data-testid={`tm-adjacency-source-${src.kind}`}>
              <td className="tm-adjacency-kind">{src.kind}</td>
              <td
                className={
                  src.present
                    ? "tm-adjacency-present"
                    : "tm-adjacency-absent"
                }
              >
                {src.present ? "connected" : "not connected"}
              </td>
              <td className="tm-adjacency-count">
                {src.present ? src.count.toLocaleString("en-US") : "—"}
              </td>
              <td className="tm-adjacency-note">{src.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
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
        <>
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
          {topology.view && (
            <AdjacencyReadinessSection
              readiness={topology.view.adjacency_readiness}
            />
          )}
        </>
      ) : (
        <>
          <section className="tm-body tm-body--nodes" data-testid="tm-nodes">
            <h3 className="tm-section-heading">
              Nodes ({topology.nodeCount})
            </h3>
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
          {topology.view && (
            <AdjacencyReadinessSection
              readiness={topology.view.adjacency_readiness}
            />
          )}
        </>
      )}
    </div>
  );
}
