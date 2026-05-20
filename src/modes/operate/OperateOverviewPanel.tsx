/**
 * V1BL — Operate Overview Panel.
 *
 * War Room readiness dashboard. Renders:
 * - Readiness chip (semantic color)
 * - Metric strip (5 metrics, label : value sub)
 * - Next-action callout (copper border, warn tint)
 * - Lanes table (label, status chip, note)
 * - Copy Markdown button
 * - Markdown preview in collapsed details
 *
 * Props are injectable for tests.
 */

import type { JSX } from "react";
import { useMemo, useState } from "react";
import {
  buildOperateOverview,
  toOperateOverviewMarkdown,
  type OperateOverviewInputs,
} from "./operateOverview";
import "./OperateOverviewPanel.css";

export interface OperateOverviewClock {
  /** Returns an ISO 8601 timestamp. Injectable for tests. */
  now(): string;
}

export interface OperateOverviewClipboard {
  /** Promise-based clipboard write. Injectable for tests. */
  writeText(text: string): Promise<void>;
}

const DEFAULT_CLOCK: OperateOverviewClock = {
  now: () => new Date().toISOString(),
};

const DEFAULT_CLIPBOARD: OperateOverviewClipboard = {
  writeText: (t) => navigator.clipboard.writeText(t),
};

export interface OperateOverviewPanelProps {
  readonly inputs?: OperateOverviewInputs;
  readonly clock?: OperateOverviewClock;
  readonly clipboard?: OperateOverviewClipboard;
}

export function OperateOverviewPanel({
  inputs: inputsProp,
  clock = DEFAULT_CLOCK,
  clipboard = DEFAULT_CLIPBOARD,
}: OperateOverviewPanelProps): JSX.Element {
  const inputs: OperateOverviewInputs = inputsProp || {
    staged_seed_count: 0,
    crawl_frontier_count: 0,
    evidence_import_count: 0,
    topology_node_count: 0,
    topology_edge_count: 0,
    intake_parsed_device_count: 0,
    intake_finding_count: 0,
    intake_current_platform_id: null,
  };

  const [copied, setCopied] = useState(false);

  const summary = useMemo(
    () => buildOperateOverview(inputs, clock.now()),
    [inputs, clock],
  );

  const markdown = useMemo(
    () => toOperateOverviewMarkdown(summary),
    [summary],
  );

  const handleCopy = async (): Promise<void> => {
    try {
      await clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard write failed — surface visibly without throwing.
      setCopied(false);
    }
  };

  const readinessColorClass = (): string => {
    switch (summary.readiness) {
      case "no_sources":
        return "op-overview-readiness--idle";
      case "seeds_staged":
        return "op-overview-readiness--info";
      case "crawl_preview_ready":
        return "op-overview-readiness--info";
      case "evidence_available":
        return "op-overview-readiness--ok";
      case "live_pipeline_deferred":
        return "op-overview-readiness--ok";
    }
  };

  return (
    <div className="op-overview" data-testid="operate-overview">
      {/* ── Readiness Chip ──────────────────────────────────────── */}
      <section className="op-overview-readiness-section">
        <div className={`op-overview-readiness ${readinessColorClass()}`}>
          <span className="op-overview-readiness-label">
            {summary.readiness}
          </span>
        </div>
      </section>

      {/* ── Metric Strip ────────────────────────────────────────── */}
      <section className="op-overview-metrics" data-testid="operate-overview-metrics">
        <h3 className="op-overview-section-title">Metrics</h3>
        <div className="op-overview-metric-strip">
          {summary.metrics.map((metric) => (
            <div
              key={metric.id}
              className="op-overview-metric"
              data-testid={`operate-metric-${metric.id}`}
            >
              <div className="op-overview-metric-label">{metric.label}</div>
              <div className="op-overview-metric-value">{metric.value}</div>
              <div className="op-overview-metric-sub">{metric.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Intake Context Row ──────────────────────────────────── */}
      {(inputs.intake_current_platform_id !== null || (inputs.intake_finding_count ?? 0) > 0 || (inputs.intake_parsed_device_count ?? 0) > 0) && (
        <section className="op-overview-intake-context" data-testid="operate-intake-context">
          <p>
            Intake context: platform=
            <span className="op-overview-intake-platform">
              {inputs.intake_current_platform_id ?? "—"}
            </span>
            {" "}· findings=
            <span className="op-overview-intake-findings">
              {inputs.intake_finding_count ?? 0}
            </span>
          </p>
        </section>
      )}

      {/* ── Next Action Callout ────────────────────────────────── */}
      <section className="op-overview-next-action" data-testid="operate-overview-next-action">
        <h3 className="op-overview-section-title">Next Action</h3>
        <div className="op-overview-callout">
          <div className="op-overview-callout-title">
            {summary.next_action}
          </div>
          <p className="op-overview-callout-text">
            {summary.next_action === "stage_discovery_seeds"
              ? "No discovery seeds staged. Go to Discovery mode to declare your first seed (device IP or CIDR range)."
              : summary.next_action === "build_crawl_preview"
                ? "Crawl preview not yet built. Click 'Build Crawl Preview' in Discovery to generate the frontier."
                : summary.next_action === "import_evidence"
                  ? "Preview frontier ready. Import evidence into Topology to create the initial node/edge graph."
                  : summary.next_action === "review_topology"
                    ? "Evidence imported. Review the Topology graph to validate node placement and link assertions."
                    : "Topology complete. Live polling and Sentinel rules are deferred; future version will wire SNMP polling and alerting."}
          </p>
        </div>
      </section>

      {/* ── Lanes Table ────────────────────────────────────────── */}
      <section className="op-overview-lanes" data-testid="operate-overview-lanes">
        <h3 className="op-overview-section-title">Operational Lanes</h3>
        <div className="op-overview-table-wrapper">
          <table className="op-overview-lanes-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Status</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {summary.lanes.map((lane) => (
                <tr key={lane.id} data-testid={`operate-lane-${lane.id}`}>
                  <td className="op-overview-lane-label">{lane.label}</td>
                  <td className="op-overview-lane-status">
                    <span className={`op-overview-status-chip op-overview-status-chip--${lane.status}`}>
                      {lane.status}
                    </span>
                  </td>
                  <td className="op-overview-lane-note">{lane.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Copy Button ────────────────────────────────────────── */}
      <section className="op-overview-actions">
        <button
          onClick={handleCopy}
          className="op-overview-btn"
          data-testid="operate-overview-copy-btn"
        >
          {copied ? "Copied" : "Copy Operate Overview Markdown"}
        </button>
      </section>

      {/* ── Markdown Preview ────────────────────────────────────── */}
      <details className="op-overview-markdown-preview" data-testid="operate-overview-markdown-preview">
        <summary className="op-overview-preview-summary">
          Markdown Preview
        </summary>
        <pre className="op-overview-markdown-code">{markdown}</pre>
      </details>

      {/* ── Honesty Footer ──────────────────────────────────────── */}
      <footer className="op-overview-footer">
        <p>
          Local readiness summary only — no live polling, no SNMP, no fabricated metrics.
        </p>
      </footer>
    </div>
  );
}
