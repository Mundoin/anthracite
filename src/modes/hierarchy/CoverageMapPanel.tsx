/**
 * Coverage Map Panel — read-only field-coverage projection UI.
 *
 * Renders aggregate coverage counts per field, source kind, vendor.
 * No fetch, no async, no mutation. Pure consumption of DiscoverySourceView.
 *
 * Doctrine: docs/architecture/DISCOVERY_ENGINE_BOUNDARY.md (consuming records).
 * Stage: V1BM (Coverage Map).
 */

import { useMemo } from "react";
import type { DiscoverySourceView } from "../../data/discoverySource";
import { buildCoverageMap } from "./coverageMap";
import { DataSourceTag } from "../../components/shell/DataSourceTag";
import "./CoverageMapPanel.css";

export function CoverageMapPanel({
  discovery,
}: {
  discovery: DiscoverySourceView;
}): JSX.Element {
  const records = discovery.view?.records ?? [];

  const coverageModel = useMemo(() => {
    return buildCoverageMap(records);
  }, [records]);

  // Early exit: unavailable
  if (discovery.view === null) {
    return (
      <div className="cov-map" data-testid="coverage-map">
        <div className="cov-map__header">
          <DataSourceTag state={discovery.sourceState} />
        </div>
        <section className="cov-map__unavailable" data-testid="coverage-unavailable">
          <p className="cov-map__unavailable-message">{discovery.message}</p>
        </section>
      </div>
    );
  }

  // Early exit: empty
  if (records.length === 0) {
    return (
      <div className="cov-map" data-testid="coverage-map">
        <div className="cov-map__header">
          <DataSourceTag state={discovery.sourceState} />
        </div>
        <section className="cov-map__empty" data-testid="coverage-empty">
          <p className="cov-map__empty-message">
            No inventory records to project — import devices via INTAKE.
          </p>
        </section>
      </div>
    );
  }

  // Normal render with records
  return (
    <div className="cov-map" data-testid="coverage-map">
      <div className="cov-map__header">
        <div className="cov-map__header-row">
          <h2 className="cov-map__title">Field Coverage</h2>
        </div>
        <p className="cov-map__subtitle">
          Projection over {coverageModel.total_records} record
          {coverageModel.total_records === 1 ? "" : "s"}
        </p>
      </div>

      {/* Summary cell */}
      <div className="cov-map__summary">
        <div className="cov-map__summary-cell">
          <span className="cov-map__summary-label">Total Records</span>
          <span className="cov-map__summary-value">
            {coverageModel.total_records}
          </span>
        </div>
      </div>

      {/* Identity section */}
      <section className="cov-map__section">
        <div className="cov-map__section-header">
          <h3 className="cov-map__section-title">Identity</h3>
        </div>
        <CoverageTable rows={coverageModel.rows.filter((r) => r.category === "Identity")} />
      </section>

      {/* Platform section */}
      <section className="cov-map__section">
        <div className="cov-map__section-header">
          <h3 className="cov-map__section-title">Platform</h3>
        </div>
        <CoverageTable rows={coverageModel.rows.filter((r) => r.category === "Platform")} />
      </section>

      {/* Provenance section */}
      <section className="cov-map__section">
        <div className="cov-map__section-header">
          <h3 className="cov-map__section-title">Provenance</h3>
        </div>
        <CoverageTable rows={coverageModel.rows.filter((r) => r.category === "Provenance")} />
      </section>

      {/* Source Kind breakdown */}
      <section className="cov-map__section">
        <div className="cov-map__section-header">
          <h3 className="cov-map__section-title">Source Kind</h3>
        </div>
        <table className="cov-map__table">
          <thead>
            <tr>
              <th>Kind</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody data-testid="coverage-source-kind">
            {coverageModel.per_source_kind.map((entry) => (
              <tr key={entry.kind} data-kind={entry.kind}>
                <td className="cov-map__cell cov-map__cell--key">{entry.kind}</td>
                <td className="cov-map__cell cov-map__cell--count">{entry.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Vendor breakdown */}
      <section className="cov-map__section">
        <div className="cov-map__section-header">
          <h3 className="cov-map__section-title">Vendor</h3>
        </div>
        <table className="cov-map__table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody data-testid="coverage-vendor">
            {coverageModel.per_vendor.map((entry) => (
              <tr key={entry.vendor} data-vendor={entry.vendor}>
                <td
                  className={`cov-map__cell cov-map__cell--key ${
                    entry.vendor === "(unknown)" ? "cov-map__cell--unknown" : ""
                  }`}
                >
                  {entry.vendor}
                </td>
                <td className="cov-map__cell cov-map__cell--count">{entry.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

/**
 * CoverageTable — renders a section-level coverage table.
 * Helper component, not exported.
 */
function CoverageTable({
  rows,
}: {
  rows: Array<{
    field: string;
    populated: number;
    missing: number;
    populated_pct: number;
  }>;
}): JSX.Element {
  return (
    <table className="cov-map__table">
      <thead>
        <tr>
          <th>Field</th>
          <th>Populated</th>
          <th>Missing</th>
          <th>%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          // Create a stable key from the field; use it for data-testid
          const fieldKey = row.field.toLowerCase().replace(/\s+/g, "-");
          return (
            <tr key={row.field} data-testid={`coverage-row-${fieldKey}`}>
              <td className="cov-map__cell cov-map__cell--field">{row.field}</td>
              <td className="cov-map__cell cov-map__cell--count">{row.populated}</td>
              <td className="cov-map__cell cov-map__cell--count">{row.missing}</td>
              <td className="cov-map__cell cov-map__cell--pct">{row.populated_pct}%</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
