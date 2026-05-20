import type { JSX, ReactNode } from "react";
import { useMemo, useState } from "react";
import { ModeWorkbenchShell } from "../../components/workbench/ModeWorkbenchShell";
import type { ModeTool } from "../../components/workbench/types";
import { DataSourceTag } from "../../components/shell/DataSourceTag";
import type { TopologySourceView } from "../../data/topologySource";
import type {
  TopologyAdjacencyFactSourceState,
  TopologyAdjacencyReadiness,
  TopologyEdge,
  TopologyNeighborEvidence,
  TopologyEvidenceImportMode,
  TopologyEvidenceMutationResult,
  TopologyEvidenceSummary,
  RawNeighborEvidenceImportRequest,
  RawNeighborEvidenceImportResult,
  RawNeighborSourceKind,
} from "../../types/topology";
import type {
  LiveCollectionDryRunPlan,
  LiveCollectionDryRunRequest,
} from "../../types/liveCollection";
import { LiveCollectionDryRunPanel } from "./LiveCollectionDryRunPanel";
import {
  eventFromFailure,
  eventFromMutationResult,
  eventFromRawNeighborResult,
  type EvidenceImportEvent,
} from "./evidenceImportSummary";
import {
  DEFAULT_REVIEW_FILTERS,
  GRAPH_READY_DISPLAY_NOTE,
  TOPOLOGY_REVIEW_KIND_OPTIONS,
  buildTopologyReviewModel,
  filterTopologyReviewRows,
  findSelectedTopologyEdge,
  formatTopologyEdgeKind,
  type TopologyReviewFilterState,
  type TopologyReviewKindFilter,
  type TopologyReviewModel,
  type TopologyReviewRow,
} from "./topologyReview";
import { TopologyGraphPanel } from "./TopologyGraphPanel";
import type { RenderGraphDataSource } from "./renderGraph";
import "./TopologyMode.css";

export interface TopologyModeProps {
  readonly topology: TopologySourceView;
  readonly onImportEvidence?: (
    envId: string,
    evidence: readonly TopologyNeighborEvidence[],
    mode: TopologyEvidenceImportMode,
  ) => Promise<TopologyEvidenceMutationResult>;
  readonly onImportRawNeighborOutput?: (
    request: RawNeighborEvidenceImportRequest,
  ) => Promise<RawNeighborEvidenceImportResult>;
  readonly onClearEvidence?: (envId: string) => Promise<TopologyEvidenceMutationResult>;
  readonly onFetchEvidenceSummary?: (envId: string) => Promise<TopologyEvidenceSummary>;
  readonly evidenceSummary?: TopologyEvidenceSummary | null;
  readonly lastMutation?: TopologyEvidenceMutationResult | null;
  /** V1AT — dry-run planner callback. No device contact performed. */
  readonly onPlanLiveCollection?: (
    request: LiveCollectionDryRunRequest,
  ) => Promise<LiveCollectionDryRunPlan>;
  /** V1BS — receive sanitized evidence-import events from the panel. */
  readonly onEvidenceImportEvent?: (event: EvidenceImportEvent) => void;
}

interface AdjacencyReadinessSectionProps {
  readonly readiness: TopologyAdjacencyReadiness;
}

interface EvidenceImportPanelProps {
  readonly environmentId: string | null;
  readonly onImportEvidence?: (
    envId: string,
    evidence: readonly TopologyNeighborEvidence[],
    mode: TopologyEvidenceImportMode,
  ) => Promise<TopologyEvidenceMutationResult>;
  readonly onImportRawNeighborOutput?: (
    request: RawNeighborEvidenceImportRequest,
  ) => Promise<RawNeighborEvidenceImportResult>;
  readonly onClearEvidence?: (envId: string) => Promise<TopologyEvidenceMutationResult>;
  readonly onFetchEvidenceSummary?: (envId: string) => Promise<TopologyEvidenceSummary>;
  readonly evidenceSummary?: TopologyEvidenceSummary | null;
  readonly lastMutation?: TopologyEvidenceMutationResult | null;
  /** V1BS — sanitized event emission. */
  readonly onEvidenceImportEvent?: (event: EvidenceImportEvent) => void;
}

function EvidenceImportPanel({
  environmentId,
  onImportEvidence,
  onImportRawNeighborOutput,
  onClearEvidence,
  onFetchEvidenceSummary,
  evidenceSummary,
  lastMutation,
  onEvidenceImportEvent,
}: EvidenceImportPanelProps): JSX.Element {
  const [tabMode, setTabMode] = useState<"json" | "raw">("json");
  const [importMode, setImportMode] = useState<TopologyEvidenceImportMode>("replace");
  const [jsonTextValue, setJsonTextValue] = useState("");
  const [jsonFeedback, setJsonFeedback] = useState("");
  const [jsonIsLoading, setJsonIsLoading] = useState(false);
  const [rawSourceKind, setRawSourceKind] = useState<RawNeighborSourceKind>("lldp");
  const [rawLocalNode, setRawLocalNode] = useState("");
  const [rawTextValue, setRawTextValue] = useState("");
  const [rawFeedback, setRawFeedback] = useState("");
  const [rawIsLoading, setRawIsLoading] = useState(false);
  const [rawPlatformHint, setRawPlatformHint] = useState("");
  const [clearConfirmed, setClearConfirmed] = useState(false);
  const [clearFeedback, setClearFeedback] = useState("");

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
        importMode,
      );

      if (!result.store_mutated) {
        setJsonFeedback("No store mutation — incoming empty or no change.");
      } else {
        setJsonFeedback(
          `Imported ${result.added_count} evidence records into ${environmentId} (final: ${result.final_count}).`,
        );
      }
      setJsonTextValue("");

      // V1BS — emit sanitized event upward (counts only).
      if (onEvidenceImportEvent) {
        const eventKind =
          importMode === "replace"
            ? "json_replace"
            : importMode === "append"
              ? "json_append"
              : "json_merge";
        onEvidenceImportEvent(
          eventFromMutationResult(eventKind, result, environmentId, new Date().toISOString()),
        );
      }

      // Auto-refresh summary after successful import
      if (onFetchEvidenceSummary) {
        try {
          await onFetchEvidenceSummary(environmentId);
        } catch {
          // Silently ignore fetch failure
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isParseError = err instanceof SyntaxError;
      if (isParseError) {
        setJsonFeedback(`Invalid JSON: ${message}`);
      } else {
        setJsonFeedback(`Import failed: ${message}`);
      }
      // V1BS — emit rejected event; raw err message dropped, only short code.
      if (onEvidenceImportEvent) {
        const eventKind =
          importMode === "replace"
            ? "json_replace"
            : importMode === "append"
              ? "json_append"
              : "json_merge";
        onEvidenceImportEvent(
          eventFromFailure(
            eventKind,
            isParseError ? "parse_error" : "import_failed",
            environmentId,
            new Date().toISOString(),
          ),
        );
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
        platform_hint: rawPlatformHint === "" ? null : rawPlatformHint,
        raw_text: rawTextValue,
        source_label: null,
        mode: importMode,
      };
      const result = await onImportRawNeighborOutput(request);
      setRawFeedback(
        `Parsed: ${result.parsed_entries_total} · Accepted: ${result.accepted_evidence_count} · Rejected: ${result.rejected_count} · Unresolved: ${result.unresolved_count} · Stored: ${result.stored_evidence_count}`,
      );

      // V1BS — emit sanitized event upward (counts only; rejected_entries dropped).
      if (onEvidenceImportEvent) {
        const eventKind = rawSourceKind === "cdp" ? "raw_cdp" : "raw_lldp";
        onEvidenceImportEvent(
          eventFromRawNeighborResult(eventKind, result, environmentId, new Date().toISOString()),
        );
      }

      // Auto-refresh summary after successful import
      if (onFetchEvidenceSummary) {
        try {
          await onFetchEvidenceSummary(environmentId);
        } catch {
          // Silently ignore fetch failure
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setRawFeedback(`Import failed: ${message}`);
      // V1BS — emit rejected event; raw err message dropped.
      if (onEvidenceImportEvent) {
        const eventKind = rawSourceKind === "cdp" ? "raw_cdp" : "raw_lldp";
        onEvidenceImportEvent(
          eventFromFailure(eventKind, "import_failed", environmentId, new Date().toISOString()),
        );
      }
    } finally {
      setRawIsLoading(false);
    }
  };

  const jsonIsDisabled = !environmentId || jsonIsLoading;
  const rawIsDisabled =
    !environmentId || rawIsLoading || !rawLocalNode || !rawTextValue;
  const clearIsDisabled =
    !environmentId || !clearConfirmed || !onClearEvidence;

  const handleClearEvidence = async () => {
    if (!environmentId || !onClearEvidence) {
      return;
    }

    try {
      const result = await onClearEvidence(environmentId);
      setClearFeedback(
        `Cleared: previous=${result.previous_count} → final=0`,
      );
      setClearConfirmed(false);

      // V1BS — emit sanitized clear event (counts only, attempts not incremented).
      if (onEvidenceImportEvent) {
        onEvidenceImportEvent({
          kind: "clear",
          status: "accepted",
          accepted_count: 0,
          rejected_count: 0,
          reason_code: null,
          timestamp: new Date().toISOString(),
          source_label: environmentId,
        });
      }

      // Auto-refresh summary after successful clear
      if (onFetchEvidenceSummary) {
        try {
          await onFetchEvidenceSummary(environmentId);
        } catch {
          // Silently ignore fetch failure
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setClearFeedback(`Clear failed: ${message}`);
      // V1BS — emit failure event for clear attempt.
      if (onEvidenceImportEvent) {
        onEvidenceImportEvent(
          eventFromFailure("clear", "clear_failed", environmentId, new Date().toISOString()),
        );
      }
    }
  };

  return (
    <section
      className="tm-evidence-import"
      data-testid="tm-evidence-import"
      aria-label="Evidence import panel"
    >
      <h3 className="tm-section-heading">Imported neighbour evidence</h3>

      <fieldset
        className="tm-import-mode-group"
        data-testid="tm-import-mode-group"
      >
        <legend className="tm-import-mode-legend">Import mode</legend>
        <div className="tm-import-mode-radios">
          <label className="tm-import-mode-label">
            <input
              type="radio"
              data-testid="tm-import-mode-replace"
              name="importMode"
              value="replace"
              checked={importMode === "replace"}
              onChange={(e) =>
                setImportMode(e.currentTarget.value as TopologyEvidenceImportMode)
              }
            />
            Replace current evidence
          </label>
          <label className="tm-import-mode-label">
            <input
              type="radio"
              data-testid="tm-import-mode-append"
              name="importMode"
              value="append"
              checked={importMode === "append"}
              onChange={(e) =>
                setImportMode(e.currentTarget.value as TopologyEvidenceImportMode)
              }
            />
            Append to current evidence
          </label>
          <label className="tm-import-mode-label">
            <input
              type="radio"
              data-testid="tm-import-mode-merge"
              name="importMode"
              value="merge"
              checked={importMode === "merge"}
              onChange={(e) =>
                setImportMode(e.currentTarget.value as TopologyEvidenceImportMode)
              }
            />
            Merge and deduplicate
          </label>
        </div>
      </fieldset>

      <div className="tm-evidence-tabs" role="tablist">
        <button
          data-testid="tm-evidence-tab-json"
          className="tm-evidence-tab"
          role="tab"
          aria-selected={tabMode === "json"}
          onClick={() => setTabMode("json")}
        >
          Structured JSON
        </button>
        <button
          data-testid="tm-evidence-tab-raw"
          className="tm-evidence-tab"
          role="tab"
          aria-selected={tabMode === "raw"}
          onClick={() => setTabMode("raw")}
        >
          Raw neighbour output
        </button>
      </div>

      {tabMode === "json" ? (
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
            <label className="tm-raw-form-field">
              <span className="tm-raw-form-label">Platform hint</span>
              <select
                data-testid="tm-raw-platform-hint"
                className="tm-raw-platform-hint-select"
                value={rawPlatformHint}
                onChange={(e) => setRawPlatformHint(e.currentTarget.value)}
                disabled={rawIsLoading}
              >
                <option value="">Auto (cascade)</option>
                <option value="iosxe">Cisco IOS-XE</option>
                <option value="nxos">Cisco NX-OS</option>
                <option value="iosxr">Cisco IOS-XR</option>
                <option value="eos">Arista EOS</option>
                <option value="junos">Juniper Junos</option>
                <option value="huawei_vrp">Huawei VRP</option>
                <option value="nokia_sros">Nokia SR OS</option>
                <option value="fortios">FortiOS (live collection deferred)</option>
                <option value="mikrotik">MikroTik (live collection deferred)</option>
              </select>
            </label>
            <p className="tm-raw-form-hint" data-testid="tm-raw-platform-hint-hint">
              Platform hint guides parser selection. Auto cascades through supported formats. Exact inventory match only — no fuzzy resolution. Unsupported platforms are honestly rejected with diagnostics.
            </p>
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

      <section
        className="tm-evidence-summary"
        data-testid="tm-evidence-summary"
        aria-label="Evidence summary"
      >
        {evidenceSummary === null || evidenceSummary === undefined ? (
          <p className="tm-muted">Summary not loaded.</p>
        ) : (
          <>
            <p>
              <strong>Active evidence count:</strong> {evidenceSummary.evidence_count}
            </p>
            <p>
              <strong>Source labels:</strong>{" "}
              {evidenceSummary.source_labels.length > 0
                ? evidenceSummary.source_labels.join(", ")
                : "—"}
            </p>
            <p>
              <strong>Source kinds:</strong>{" "}
              {(() => {
                const kindsMap: Record<string, number> = {
                  lldp: 0,
                  cdp: 0,
                  config_neighbor: 0,
                  manual: 0,
                };
                evidenceSummary.source_kind_counts.forEach(([kind, count]) => {
                  kindsMap[kind] = count;
                });
                return `lldp:${kindsMap.lldp} · cdp:${kindsMap.cdp} · config_neighbor:${kindsMap.config_neighbor} · manual:${kindsMap.manual}`;
              })()}
            </p>
          </>
        )}
        {lastMutation && lastMutation.store_mutated && (
          <p className="tm-last-mutation">
            <strong>Last import:</strong> mode={lastMutation.mode} ·
            previous={lastMutation.previous_count} ·
            incoming={lastMutation.incoming_count} ·
            added={lastMutation.added_count} ·
            replaced={lastMutation.replaced_count} ·
            ignored duplicate={lastMutation.ignored_duplicate_count} ·
            final={lastMutation.final_count}
          </p>
        )}
      </section>

      <section className="tm-clear-evidence-section" data-testid="tm-clear-evidence-section">
        <label className="tm-clear-confirm-label">
          <input
            type="checkbox"
            data-testid="tm-clear-confirm"
            checked={clearConfirmed}
            onChange={(e) => setClearConfirmed(e.currentTarget.checked)}
          />
          I understand this will remove all evidence for this environment.
        </label>
        <button
          data-testid="tm-clear-button"
          className="tm-clear-button"
          disabled={clearIsDisabled}
          onClick={handleClearEvidence}
        >
          Clear evidence for this environment
        </button>
        {clearFeedback && (
          <p
            data-testid="tm-clear-feedback"
            className="tm-clear-feedback"
          >
            {clearFeedback}
          </p>
        )}
      </section>
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
  readonly selectedEdgeId?: string | null;
  readonly onSelectEdge?: (edgeId: string) => void;
  readonly filteredFromTotal?: number | null;
}

function EdgeListTable({
  edges,
  hasRejectedEvidence,
  selectedEdgeId,
  onSelectEdge,
  filteredFromTotal,
}: EdgeListTableProps): JSX.Element {
  if (edges.length === 0) {
    if (filteredFromTotal !== null && filteredFromTotal !== undefined && filteredFromTotal > 0) {
      return (
        <div data-testid="tm-edge-list" className="tm-edge-list-empty">
          <p className="tm-muted">
            No edges match the current filters ({filteredFromTotal} hidden).
          </p>
        </div>
      );
    }
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

  const headingSuffix =
    filteredFromTotal !== null && filteredFromTotal !== undefined && filteredFromTotal !== edges.length
      ? ` of ${filteredFromTotal}`
      : "";

  return (
    <section data-testid="tm-edge-list" className="tm-edge-list">
      <h3 className="tm-section-heading">
        Projected edges ({edges.length}
        {headingSuffix})
      </h3>
      <table className="tm-edge-table">
        <thead>
          <tr>
            <th>Kind</th>
            <th>Source Node</th>
            <th>Local Iface</th>
            <th>Target Node</th>
            <th>Remote Iface</th>
            <th>Evidence</th>
            {onSelectEdge ? <th>Review</th> : null}
          </tr>
        </thead>
        <tbody>
          {edges.map((edge) => {
            const isSelected = selectedEdgeId === edge.id;
            return (
              <tr
                key={edge.id}
                data-testid={`tm-edge-row-${edge.id}`}
                className={
                  isSelected ? "tm-edge-row tm-edge-row--selected" : "tm-edge-row"
                }
                aria-selected={onSelectEdge ? isSelected : undefined}
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
                {onSelectEdge ? (
                  <td className="tm-edge-select-cell">
                    <button
                      type="button"
                      data-testid={`tm-review-row-select-${edge.id}`}
                      className={
                        isSelected
                          ? "tm-edge-select-button tm-edge-select-button--selected"
                          : "tm-edge-select-button"
                      }
                      onClick={() => onSelectEdge(edge.id)}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

// V1AS — Topology Edge Review surface: stats strip, filters, selected-edge
// inspector, rejection drilldown, graph-ready handoff note. Renders above
// the projected edge table and drives its selection state.

interface TopologyReviewSurfaceProps {
  readonly model: TopologyReviewModel;
  readonly sourceEdges: readonly TopologyEdge[];
  readonly hasRejectedEvidence: boolean;
}

function ReviewStatsStrip({
  model,
}: {
  readonly model: TopologyReviewModel;
}): JSX.Element {
  const { stats } = model;
  return (
    <section
      className="tm-review-stats"
      data-testid="tm-review-stats"
      aria-label="Topology edge review stats"
    >
      <span className="tm-review-stat" data-testid="tm-review-stat-projected-edges">
        <span className="tm-review-stat-label">Projected edges</span>
        <span className="tm-review-stat-value">{stats.projected_edge_count}</span>
      </span>
      <span className="tm-review-stat" data-testid="tm-review-stat-accepted-evidence">
        <span className="tm-review-stat-label">Accepted evidence</span>
        <span className="tm-review-stat-value">{stats.evidence_accepted}</span>
      </span>
      <span className="tm-review-stat" data-testid="tm-review-stat-rejected-evidence">
        <span className="tm-review-stat-label">Rejected evidence</span>
        <span className="tm-review-stat-value">{stats.evidence_rejected}</span>
      </span>
      <span className="tm-review-stat" data-testid="tm-review-stat-facts-accepted">
        <span className="tm-review-stat-label">Facts accepted</span>
        <span className="tm-review-stat-value">{stats.facts_accepted}</span>
      </span>
      <span className="tm-review-stat" data-testid="tm-review-stat-facts-duplicate">
        <span className="tm-review-stat-label">Duplicate facts</span>
        <span className="tm-review-stat-value">{stats.facts_collapsed_duplicate}</span>
      </span>
      <span className="tm-review-stat" data-testid="tm-review-stat-source-kinds">
        <span className="tm-review-stat-label">By source kind</span>
        <span className="tm-review-stat-value">
          {stats.per_kind_counts.length === 0
            ? "—"
            : stats.per_kind_counts
                .map((entry) => `${entry.kind}:${entry.count}`)
                .join(" · ")}
        </span>
      </span>
    </section>
  );
}

function ReviewFilters({
  filters,
  onFiltersChange,
  matchedCount,
  totalCount,
}: {
  readonly filters: TopologyReviewFilterState;
  readonly onFiltersChange: (next: TopologyReviewFilterState) => void;
  readonly matchedCount: number;
  readonly totalCount: number;
}): JSX.Element {
  return (
    <section
      className="tm-review-filters"
      data-testid="tm-review-filters"
      aria-label="Topology edge review filters"
    >
      <label className="tm-review-filter-field">
        <span className="tm-review-filter-label">Source kind</span>
        <select
          data-testid="tm-review-filter-kind"
          className="tm-review-filter-select"
          value={filters.kind}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              kind: e.currentTarget.value as TopologyReviewKindFilter,
            })
          }
        >
          {TOPOLOGY_REVIEW_KIND_OPTIONS.map((kind) => (
            <option key={kind} value={kind}>
              {kind === "all" ? "All kinds" : kind}
            </option>
          ))}
        </select>
      </label>
      <label className="tm-review-filter-field tm-review-filter-field--grow">
        <span className="tm-review-filter-label">Search</span>
        <input
          type="text"
          data-testid="tm-review-filter-text"
          className="tm-review-filter-input"
          value={filters.text}
          onChange={(e) =>
            onFiltersChange({ ...filters, text: e.currentTarget.value })
          }
          placeholder="node, interface, evidence…"
        />
      </label>
      <span className="tm-review-filter-count" data-testid="tm-review-filter-count">
        {matchedCount} of {totalCount} shown
      </span>
    </section>
  );
}

function ReviewInspector({
  row,
}: {
  readonly row: TopologyReviewRow | null;
}): JSX.Element {
  if (row === null) {
    return (
      <section
        className="tm-review-inspector tm-review-inspector--empty"
        data-testid="tm-review-inspector"
        aria-label="Selected edge inspector"
      >
        <p className="tm-muted" data-testid="tm-review-inspector-empty">
          Select an edge to inspect its evidence and endpoints.
        </p>
      </section>
    );
  }
  return (
    <section
      className="tm-review-inspector"
      data-testid="tm-review-inspector"
      aria-label="Selected edge inspector"
    >
      <header className="tm-review-inspector-header">
        <h3 className="tm-section-heading">Selected edge</h3>
        <span
          className="tm-review-inspector-id"
          data-testid="tm-review-inspector-id"
        >
          {row.edge_id}
        </span>
        <span
          className="tm-review-inspector-kind"
          data-testid="tm-review-inspector-kind"
        >
          {formatTopologyEdgeKind(row.kind)}
        </span>
      </header>
      <dl className="tm-review-inspector-grid">
        <div className="tm-review-inspector-row">
          <dt>Local node</dt>
          <dd data-testid="tm-review-inspector-local-node">
            {row.local.node_label ?? "(unresolved)"} ·{" "}
            <code>{row.local.node_id}</code>
            {row.local.node_vendor !== null ? (
              <span className="tm-review-inspector-meta">
                {" "}
                · {row.local.node_vendor}
                {row.local.node_platform_id !== null
                  ? ` / ${row.local.node_platform_id}`
                  : ""}
              </span>
            ) : null}
          </dd>
        </div>
        <div className="tm-review-inspector-row">
          <dt>Local interface</dt>
          <dd data-testid="tm-review-inspector-local-iface">
            {row.local.interface ?? "—"}
          </dd>
        </div>
        <div className="tm-review-inspector-row">
          <dt>Remote node</dt>
          <dd data-testid="tm-review-inspector-remote-node">
            {row.remote.node_label ?? "(unresolved)"} ·{" "}
            <code>{row.remote.node_id}</code>
            {row.remote.node_vendor !== null ? (
              <span className="tm-review-inspector-meta">
                {" "}
                · {row.remote.node_vendor}
                {row.remote.node_platform_id !== null
                  ? ` / ${row.remote.node_platform_id}`
                  : ""}
              </span>
            ) : null}
          </dd>
        </div>
        <div className="tm-review-inspector-row">
          <dt>Remote interface</dt>
          <dd data-testid="tm-review-inspector-remote-iface">
            {row.remote.interface ?? "—"}
          </dd>
        </div>
        <div className="tm-review-inspector-row">
          <dt>Status</dt>
          <dd data-testid="tm-review-inspector-status">{row.status_note}</dd>
        </div>
      </dl>
      <section
        className="tm-review-inspector-evidence"
        data-testid="tm-review-inspector-evidence"
      >
        <h4 className="tm-review-inspector-subheading">Evidence</h4>
        {row.evidence.length === 0 ? (
          <p className="tm-muted">
            No evidence string retained for this edge in the current view.
          </p>
        ) : (
          <ul className="tm-review-inspector-evidence-list">
            {row.evidence.map((item) => (
              <li
                key={item.index}
                data-testid={`tm-review-inspector-evidence-${item.index}`}
                className="tm-review-inspector-evidence-item"
              >
                <code>{item.text}</code>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function ReviewRejectionSummary({
  model,
}: {
  readonly model: TopologyReviewModel;
}): JSX.Element {
  const { rejection_summary: summary } = model;
  return (
    <section
      className="tm-review-rejection-summary"
      data-testid="tm-review-rejection-summary"
      aria-label="Rejected evidence summary"
    >
      <h3 className="tm-section-heading">Rejected evidence summary</h3>
      {summary.has_rejections ? (
        <ul className="tm-review-rejection-list">
          <li data-testid="tm-review-rejection-evidence-unknown-local">
            Evidence — unknown local node:{" "}
            {summary.evidence_rejected_unknown_local}
          </li>
          <li data-testid="tm-review-rejection-evidence-unknown-remote">
            Evidence — unknown remote node:{" "}
            {summary.evidence_rejected_unknown_remote}
          </li>
          <li data-testid="tm-review-rejection-evidence-self-link">
            Evidence — self-link: {summary.evidence_rejected_self_link}
          </li>
          <li data-testid="tm-review-rejection-facts-unknown-node">
            Facts — unknown node: {summary.facts_rejected_unknown_node}
          </li>
          <li data-testid="tm-review-rejection-facts-self-link">
            Facts — self-link: {summary.facts_rejected_self_link}
          </li>
          <li data-testid="tm-review-rejection-facts-duplicate">
            Facts — collapsed duplicate: {summary.facts_collapsed_duplicate}
          </li>
        </ul>
      ) : (
        <p
          className="tm-muted"
          data-testid="tm-review-rejection-none"
        >
          No rejected evidence or facts in the current view.
        </p>
      )}
      <p className="tm-review-rejection-honesty">
        Rejected entries are counted by the topology engine. Per-entry
        rejected evidence is not retained in this view yet.
      </p>
    </section>
  );
}

function TopologyReviewSurface({
  model,
  sourceEdges,
  hasRejectedEvidence,
}: TopologyReviewSurfaceProps): JSX.Element {
  const [filters, setFilters] = useState<TopologyReviewFilterState>(
    DEFAULT_REVIEW_FILTERS,
  );
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const filteredRows = useMemo(
    () => filterTopologyReviewRows(model.rows, filters),
    [model.rows, filters],
  );
  const filteredEdges = useMemo<readonly TopologyEdge[]>(() => {
    const idSet = new Set(filteredRows.map((row) => row.edge_id));
    return sourceEdges.filter((e) => idSet.has(e.id));
  }, [filteredRows, sourceEdges]);

  const selectedRow = findSelectedTopologyEdge(model, selectedEdgeId);

  return (
    <section
      className="tm-review"
      data-testid="tm-review"
      aria-label="Topology edge review"
    >
      <header className="tm-review-header">
        <h3 className="tm-section-heading">Topology edge review</h3>
        <p
          className="tm-review-graph-ready-note"
          data-testid="tm-review-graph-ready-note"
        >
          {GRAPH_READY_DISPLAY_NOTE}
        </p>
      </header>
      <ReviewStatsStrip model={model} />
      <ReviewFilters
        filters={filters}
        onFiltersChange={setFilters}
        matchedCount={filteredRows.length}
        totalCount={model.rows.length}
      />
      <EdgeListTable
        edges={filteredEdges}
        hasRejectedEvidence={hasRejectedEvidence}
        selectedEdgeId={selectedEdgeId}
        onSelectEdge={setSelectedEdgeId}
        filteredFromTotal={model.rows.length}
      />
      <ReviewInspector row={selectedRow} />
      <ReviewRejectionSummary model={model} />
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
  onClearEvidence,
  onFetchEvidenceSummary,
  evidenceSummary,
  lastMutation,
  onPlanLiveCollection,
  onEvidenceImportEvent,
}: TopologyModeProps): JSX.Element {
  const [activeToolId, setActiveToolId] = useState<string>("graph_map");

  const renderGraphMap = (): ReactNode => (
    <>
      <div className="tm-source-row">
        <DataSourceTag state={topology.sourceState} />
      </div>
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
            onClearEvidence={onClearEvidence}
            onFetchEvidenceSummary={onFetchEvidenceSummary}
            evidenceSummary={evidenceSummary}
            lastMutation={lastMutation}
            onEvidenceImportEvent={onEvidenceImportEvent}
          />
          <LiveCollectionDryRunPanel
            environmentId={topology.environmentId}
            onPlan={onPlanLiveCollection}
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
            onClearEvidence={onClearEvidence}
            onFetchEvidenceSummary={onFetchEvidenceSummary}
            evidenceSummary={evidenceSummary}
            lastMutation={lastMutation}
            onEvidenceImportEvent={onEvidenceImportEvent}
          />

          <LiveCollectionDryRunPanel
            environmentId={topology.environmentId}
            onPlan={onPlanLiveCollection}
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

          <TopologyReviewSurface
            model={buildTopologyReviewModel(topology.view)}
            sourceEdges={topology.view.edges}
            hasRejectedEvidence={
              topology.evidenceStats
                ? topology.evidenceStats.evidence_total - topology.evidenceStats.accepted > 0
                : false
            }
          />

          {topology.view && (() => {
            const reviewModel = buildTopologyReviewModel(topology.view);
            // Determine data source honestly from topology state
            const dataSource: RenderGraphDataSource =
              topology.sourceState === "real"
                ? "imported"
                : topology.sourceState === "empty"
                  ? "unknown"
                  : topology.sourceState === "unavailable"
                    ? "unknown"
                    : "demo";
            return (
              <TopologyGraphPanel
                view={reviewModel.graph_ready}
                data_source={dataSource}
              />
            );
          })()}

          {topology.view && (
            <AdjacencyReadinessSection
              readiness={topology.view.adjacency_readiness}
            />
          )}
        </>
      )}
    </>
  );

  const renderEvidenceImport = (): ReactNode => (
    <>
      <EvidenceImportPanel
        environmentId={topology.environmentId}
        onImportEvidence={onImportEvidence}
        onImportRawNeighborOutput={onImportRawNeighborOutput}
        onClearEvidence={onClearEvidence}
        onFetchEvidenceSummary={onFetchEvidenceSummary}
        evidenceSummary={evidenceSummary}
        lastMutation={lastMutation}
      />
      {topology.evidenceStats &&
        topology.evidenceStats.evidence_total > 0 && (
          <EvidenceRejectionBanner
            accepted={topology.evidenceStats.accepted}
            total={topology.evidenceStats.evidence_total}
            rejectedUnknownLocal={topology.evidenceStats.rejected_unknown_local}
            rejectedUnknownRemote={topology.evidenceStats.rejected_unknown_remote}
            rejectedSelfLink={topology.evidenceStats.rejected_self_link}
          />
        )}
    </>
  );

  const renderCollectionPlan = (): ReactNode => (
    <LiveCollectionDryRunPanel
      environmentId={topology.environmentId}
      onPlan={onPlanLiveCollection}
      onImportRawNeighborOutput={onImportRawNeighborOutput}
    />
  );

  const renderReadiness = (): ReactNode =>
    topology.view ? (
      <AdjacencyReadinessSection
        readiness={topology.view.adjacency_readiness}
      />
    ) : (
      <section
        className="tm-body tm-body--unavailable"
        role="status"
        aria-label="Readiness unavailable"
        data-testid="tm-readiness-unavailable"
      >
        <p>Readiness is not available — topology source has no view yet.</p>
        <p className="tm-muted">{topology.message}</p>
      </section>
    );

  const tools: ModeTool[] = [
    {
      id: "graph_map",
      kind: "live",
      label: "Graph / Map",
      description:
        "Inspect topology nodes, projected edges, and the underlying source/empty/unavailable state.",
      group: "primary",
      status: "available",
      role: "engine_analysis",
      render: renderGraphMap,
    },
    {
      id: "evidence_import",
      kind: "live",
      label: "Evidence Import",
      description:
        "Import structured neighbour evidence or raw vendor output. No auto-import; no device contact.",
      group: "evidence",
      status: "available",
      role: "evidence",
      render: renderEvidenceImport,
    },
    {
      id: "collection_plan",
      kind: "live",
      label: "Collection Plan",
      description:
        "Plan a read-only live-collection dry run for the selected platform. No device contact.",
      group: "discovery",
      status: "preview",
      role: "live_collection",
      render: renderCollectionPlan,
    },
    {
      id: "readiness",
      kind: "live",
      label: "Readiness",
      description:
        "Adjacency readiness: which fact sources are connected and what edge kinds are accepted.",
      group: "validation",
      status: "preview",
      role: "validation",
      render: renderReadiness,
    },
    {
      id: "canvas_3d",
      kind: "deferred",
      label: "3D / Canvas",
      description:
        "Future visual canvas / mini topology / 3D view. No scene implemented yet.",
      group: "support",
      status: "deferred",
      role: "engine_analysis",
      deferred: {
        reason:
          "No 3D scene is implemented. Anthracite will not invent topology — the future canvas tool will consume the existing graph-ready topology view plus imported evidence; until that pipeline lands, no fake graph is shown here.",
        planned_controls: [
          "Layout mode",
          "Site / cluster view",
          "Link type filter",
          "Evidence overlay",
          "Drift / breach overlay",
        ],
      },
    },
  ];

  return (
    <div className="topology-mode">
      <ModeWorkbenchShell
        model={{
          title: "Topology",
          tagline: `Scope: ${topology.environmentId ?? "All environments"}`,
          tools,
          active_id: activeToolId,
          fallback_id: "graph_map",
        }}
        onSelectTool={setActiveToolId}
      />
    </div>
  );
}
