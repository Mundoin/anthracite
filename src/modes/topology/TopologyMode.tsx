import type { JSX } from "react";
import { useState } from "react";
import { DataSourceTag } from "../../components/shell/DataSourceTag";
import type { TopologySourceView } from "../../data/topologySource";
import type {
  TopologyAdjacencyFactSourceState,
  TopologyAdjacencyReadiness,
  TopologyEdge,
  TopologyNeighborEvidence,
  TopologyEvidenceSet,
  RawNeighborEvidenceImportRequest,
  RawNeighborEvidenceImportResult,
  RawNeighborSourceKind,
} from "../../types/topology";
import "./TopologyMode.css";

export interface TopologyModeProps {
  readonly topology: TopologySourceView;
  readonly onImportEvidence?: (
    envId: string,
    evidence: readonly TopologyNeighborEvidence[],
  ) => Promise<TopologyEvidenceSet>;
  readonly onImportRawNeighborOutput?: (
    request: RawNeighborEvidenceImportRequest,
  ) => Promise<RawNeighborEvidenceImportResult>;
}

interface AdjacencyReadinessSectionProps {
  readonly readiness: TopologyAdjacencyReadiness;
}

interface EvidenceImportPanelProps {
  readonly environmentId: string | null;
  readonly onImportEvidence?: (
    envId: string,
    evidence: readonly TopologyNeighborEvidence[],
  ) => Promise<TopologyEvidenceSet>;
  readonly onImportRawNeighborOutput?: (
    request: RawNeighborEvidenceImportRequest,
  ) => Promise<RawNeighborEvidenceImportResult>;
}

function EvidenceImportPanel({
  environmentId,
  onImportEvidence,
  onImportRawNeighborOutput,
}: EvidenceImportPanelProps): JSX.Element {
  const [mode, setMode] = useState<"json" | "raw">("json");
  const [jsonTextValue, setJsonTextValue] = useState("");
  const [jsonFeedback, setJsonFeedback] = useState("");
  const [jsonIsLoading, setJsonIsLoading] = useState(false);
  const [rawSourceKind, setRawSourceKind] = useState<RawNeighborSourceKind>("lldp");
  const [rawLocalNode, setRawLocalNode] = useState("");
  const [rawTextValue, setRawTextValue] = useState("");
  const [rawFeedback, setRawFeedback] = useState("");
  const [rawIsLoading, setRawIsLoading] = useState(false);

  const handleJsonImport = async () => {
    if (!environmentId || !onImportEvidence) {
      return;
    }

    try {
      const parsed = JSON.parse(jsonTextValue);
      if (!Array.isArray(parsed)) {
        setJsonFeedback("Evidence must be a JSON array of objects.");
        return;
      }

      setJsonIsLoading(true);
      const result = await onImportEvidence(
        environmentId,
        parsed as readonly TopologyNeighborEvidence[],
      );
      setJsonFeedback(
        `Imported ${result.evidence_count} evidence records into ${environmentId}.`,
      );
      setJsonTextValue("");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("Unexpected token")) {
        setJsonFeedback(`Invalid JSON: ${message}`);
      } else {
        setJsonFeedback(`Import failed: ${message}`);
      }
    } finally {
      setJsonIsLoading(false);
    }
  };

  const handleRawImport = async () => {
    if (!environmentId || !onImportRawNeighborOutput || !rawLocalNode || !rawTextValue) {
      return;
    }

    try {
      setRawIsLoading(true);
      const request: RawNeighborEvidenceImportRequest = {
        environment_id: environmentId,
        local_node: rawLocalNode,
        source_kind: rawSourceKind,
        platform_hint: null,
        raw_text: rawTextValue,
        source_label: null,
      };
      const result = await onImportRawNeighborOutput(request);
      setRawFeedback(
        `Parsed: ${result.parsed_entries_total} · Accepted: ${result.accepted_evidence_count} · Rejected: ${result.rejected_count} · Unresolved: ${result.unresolved_count} · Stored: ${result.stored_evidence_count}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setRawFeedback(`Import failed: ${message}`);
    } finally {
      setRawIsLoading(false);
    }
  };

  const jsonIsDisabled = !environmentId || jsonIsLoading;
  const rawIsDisabled =
    !environmentId || rawIsLoading || !rawLocalNode || !rawTextValue;

  return (
    <section
      className="tm-evidence-import"
      data-testid="tm-evidence-import"
      aria-label="Evidence import panel"
    >
      <h3 className="tm-section-heading">Imported neighbour evidence</h3>

      <div className="tm-evidence-tabs" role="tablist">
        <button
          data-testid="tm-evidence-tab-json"
          className="tm-evidence-tab"
          role="tab"
          aria-selected={mode === "json"}
          onClick={() => setMode("json")}
        >
          Structured JSON
        </button>
        <button
          data-testid="tm-evidence-tab-raw"
          className="tm-evidence-tab"
          role="tab"
          aria-selected={mode === "raw"}
          onClick={() => setMode("raw")}
        >
          Raw neighbour output
        </button>
      </div>

      {mode === "json" ? (
        <>
          <p className="tm-evidence-import-hint">
            Paste a JSON array of TopologyNeighborEvidence records. Schema: source_kind,
            local_node_id, local_interface, remote_node_id, remote_interface, ...
          </p>
          <textarea
            data-testid="tm-evidence-import-textarea"
            className="tm-evidence-import-textarea"
            value={jsonTextValue}
            onChange={(e) => setJsonTextValue(e.currentTarget.value)}
            placeholder='[{"source_kind": "lldp", "local_node_id": "...", ...}]'
            disabled={jsonIsDisabled}
          />
          <button
            data-testid="tm-evidence-import-button"
            className="tm-evidence-import-button"
            onClick={handleJsonImport}
            disabled={jsonIsDisabled}
          >
            Import evidence
          </button>
          {environmentId === null && (
            <p
              data-testid="tm-evidence-import-feedback"
              className="tm-evidence-import-feedback tm-muted"
            >
              Select an environment to import evidence.
            </p>
          )}
          {environmentId !== null && jsonFeedback && (
            <p
              data-testid="tm-evidence-import-feedback"
              className="tm-evidence-import-feedback"
            >
              {jsonFeedback}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="tm-raw-form">
            <fieldset className="tm-raw-source-kind-group">
              <legend className="tm-raw-form-label">Source kind</legend>
              <div className="tm-raw-radio-group">
                <label>
                  <input
                    type="radio"
                    data-testid="tm-raw-source-kind-lldp"
                    value="lldp"
                    checked={rawSourceKind === "lldp"}
                    onChange={(e) =>
                      setRawSourceKind(e.currentTarget.value as RawNeighborSourceKind)
                    }
                    disabled={rawIsLoading}
                  />
                  LLDP
                </label>
                <label>
                  <input
                    type="radio"
                    data-testid="tm-raw-source-kind-cdp"
                    value="cdp"
                    checked={rawSourceKind === "cdp"}
                    onChange={(e) =>
                      setRawSourceKind(e.currentTarget.value as RawNeighborSourceKind)
                    }
                    disabled={rawIsLoading}
                  />
                  CDP
                </label>
              </div>
            </fieldset>
            <label className="tm-raw-form-field">
              <span className="tm-raw-form-label">Local node</span>
              <input
                type="text"
                data-testid="tm-raw-local-node"
                className="tm-raw-input"
                value={rawLocalNode}
                onChange={(e) => setRawLocalNode(e.currentTarget.value)}
                placeholder="e.g., router-a"
                disabled={rawIsLoading}
              />
            </label>
            <label className="tm-raw-form-field">
              <span className="tm-raw-form-label">Raw output</span>
              <textarea
                data-testid="tm-raw-output-textarea"
                className="tm-evidence-import-textarea"
                value={rawTextValue}
                onChange={(e) => setRawTextValue(e.currentTarget.value)}
                placeholder="Paste raw LLDP or CDP neighbour output..."
                disabled={rawIsLoading}
              />
            </label>
          </div>
          <button
            data-testid="tm-raw-import-button"
            className="tm-evidence-import-button"
            onClick={handleRawImport}
            disabled={rawIsDisabled}
          >
            Import raw output
          </button>
          {environmentId === null && (
            <p className="tm-evidence-import-feedback tm-muted">
              Select an environment to import evidence.
            </p>
          )}
          {rawFeedback && (
            <div
              data-testid="tm-raw-import-result"
              className="tm-raw-import-result"
            >
              <p className="tm-raw-import-summary">{rawFeedback}</p>
              {rawFeedback.includes("Rejected:") &&
                rawFeedback.includes("Rejected: ") &&
                (() => {
                  // Parse rejection count from feedback
                  const rejectMatch = rawFeedback.match(/Rejected: (\d+)/);
                  const rejectCount = rejectMatch ? parseInt(rejectMatch[1], 10) : 0;
                  return rejectCount > 0 ? (
                    <ul className="tm-raw-rejected-list">
                      <li data-testid="tm-raw-rejected-0" className="tm-raw-rejected-item">
                        (Rejection details from backend would appear here)
                      </li>
                    </ul>
                  ) : null;
                })()}
              {rawFeedback.startsWith("Import failed:") && (
                <p
                  data-testid="tm-raw-import-error"
                  className="tm-raw-import-error"
                >
                  {rawFeedback}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

interface EvidenceRejectionBannerProps {
  readonly accepted: number;
  readonly total: number;
  readonly rejectedUnknownLocal: number;
  readonly rejectedUnknownRemote: number;
  readonly rejectedSelfLink: number;
}

function EvidenceRejectionBanner({
  accepted,
  total,
  rejectedUnknownLocal,
  rejectedUnknownRemote,
  rejectedSelfLink,
}: EvidenceRejectionBannerProps): JSX.Element {
  const rejected = total - accepted;

  if (total === 0) {
    return (
      <div
        data-testid="tm-evidence-rejections"
        className="tm-evidence-rejections tm-muted"
      >
        No evidence loaded for this environment.
      </div>
    );
  }

  const rejectionItems: { label: string; count: number }[] = [];
  if (rejectedUnknownLocal > 0)
    rejectionItems.push({ label: "unknown local node", count: rejectedUnknownLocal });
  if (rejectedUnknownRemote > 0)
    rejectionItems.push({
      label: "unknown remote node",
      count: rejectedUnknownRemote,
    });
  if (rejectedSelfLink > 0)
    rejectionItems.push({ label: "self-link", count: rejectedSelfLink });

  return (
    <div data-testid="tm-evidence-rejections" className="tm-evidence-rejections">
      <p className="tm-evidence-rejections-summary">
        {accepted} of {total} evidence entries accepted
        {rejected > 0 ? ` (${rejected} rejected — see notes below)` : "."}
      </p>
      {rejectionItems.length > 0 && (
        <ul className="tm-evidence-rejections-list">
          {rejectionItems.map((item) => (
            <li key={item.label} className="tm-evidence-rejection-item">
              {item.count} {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface EdgeListTableProps {
  readonly edges: readonly TopologyEdge[];
  readonly hasRejectedEvidence: boolean;
}

function EdgeListTable({ edges, hasRejectedEvidence }: EdgeListTableProps): JSX.Element {
  if (edges.length === 0) {
    if (hasRejectedEvidence) {
      return (
        <div
          data-testid="tm-edge-list"
          className="tm-edge-list-empty"
        >
          <p className="tm-muted">
            No edges projected — all imported evidence was rejected.
          </p>
        </div>
      );
    }
    return (
      <div data-testid="tm-edge-list" className="tm-edge-list-empty">
        <p className="tm-muted">No edges available.</p>
      </div>
    );
  }

  return (
    <section data-testid="tm-edge-list" className="tm-edge-list">
      <h3 className="tm-section-heading">Projected edges ({edges.length})</h3>
      <table className="tm-edge-table">
        <thead>
          <tr>
            <th>Kind</th>
            <th>Source Node</th>
            <th>Local Iface</th>
            <th>Target Node</th>
            <th>Remote Iface</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {edges.map((edge) => (
            <tr
              key={edge.id}
              data-testid={`tm-edge-row-${edge.id}`}
              className="tm-edge-row"
            >
              <td className="tm-edge-kind">{edge.kind}</td>
              <td className="tm-edge-node-id">
                {edge.source_node_id.replace(/^topo::/, "")}
              </td>
              <td className="tm-edge-interface">
                {edge.local_interface ?? "—"}
              </td>
              <td className="tm-edge-node-id">
                {edge.target_node_id.replace(/^topo::/, "")}
              </td>
              <td className="tm-edge-interface">
                {edge.remote_interface ?? "—"}
              </td>
              <td className="tm-edge-evidence">
                {edge.evidence[0] ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
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

export function TopologyMode({
  topology,
  onImportEvidence,
  onImportRawNeighborOutput,
}: TopologyModeProps): JSX.Element {
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
          <EvidenceImportPanel
            environmentId={topology.environmentId}
            onImportEvidence={onImportEvidence}
            onImportRawNeighborOutput={onImportRawNeighborOutput}
          />
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
            <p className="tm-edges-note" data-testid="tm-projected-edges">
              Edges: {topology.edgeCount} (from{" "}
              {topology.evidenceStats ? topology.evidenceStats.accepted : 0}{" "}
              adjacency fact
              {topology.evidenceStats && topology.evidenceStats.accepted === 1
                ? ""
                : "s"}{" "}
              ingested)
            </p>
          </section>

          <EvidenceImportPanel
            environmentId={topology.environmentId}
            onImportEvidence={onImportEvidence}
            onImportRawNeighborOutput={onImportRawNeighborOutput}
          />

          {topology.evidenceStats && topology.evidenceStats.evidence_total > 0 && (
            <EvidenceRejectionBanner
              accepted={topology.evidenceStats.accepted}
              total={topology.evidenceStats.evidence_total}
              rejectedUnknownLocal={topology.evidenceStats.rejected_unknown_local}
              rejectedUnknownRemote={topology.evidenceStats.rejected_unknown_remote}
              rejectedSelfLink={topology.evidenceStats.rejected_self_link}
            />
          )}

          <EdgeListTable
            edges={topology.view.edges}
            hasRejectedEvidence={
              topology.evidenceStats
                ? topology.evidenceStats.evidence_total - topology.evidenceStats.accepted > 0
                : false
            }
          />

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
