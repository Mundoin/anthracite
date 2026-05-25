/**
 * V1CF — Single-Device Read-Only Collector preview panel.
 *
 * Mounts under Topology → Collection Plan, below V1CE Dry-Run.
 * Renders one deterministic fixture-backed run against the V1CC
 * demo target. No field contact.
 */

import type { JSX } from "react";
import { buildDemoSingleDeviceRun } from "../../engines/singleDeviceCollector";
import type { SingleDeviceCollectionRun } from "../../types/singleDeviceCollection";
import type { CollectionEvidenceEntry } from "../../types/collectionReceipt";
import "./SingleDeviceCollectorPanel.css";

export function SingleDeviceCollectorPanel(): JSX.Element {
  const run = buildDemoSingleDeviceRun();

  return (
    <section
      className="sd-panel"
      data-testid="sd-panel"
      aria-label="Single-device collector preview"
    >
      <header className="sd-panel-head">
        <h3 className="sd-panel-title">
          Single Device Collector Preview (V1CF)
        </h3>
        <span className="sd-panel-stub-tag">v0 · fixture-backed · no field contact</span>
      </header>
      <p className="sd-panel-sub">
        Deterministic fixture-backed runner. Consumes a V1CC target, emits a
        V1CD CollectionReceipt. <strong>No field contact runs here.</strong>{" "}
        Real read-only SSH/SNMP runs land in later stages.
      </p>

      <RunCard run={run} />

      <footer className="sd-panel-foot">
        Receipt source_kind is <code>demo</code> at v0 because facts come from a
        fixture, not the device. A future stage that replays real captures can
        promote it to <code>live</code> honestly.
      </footer>
    </section>
  );
}

function RunCard({ run }: { readonly run: SingleDeviceCollectionRun }): JSX.Element {
  const targetId = run.target_id;
  return (
    <article
      className="sd-card"
      data-testid={`sd-card-${targetId}`}
      data-status={run.status}
    >
      <header className="sd-card-head">
        <div className="sd-card-head-left">
          <h4 className="sd-card-title">{targetId}</h4>
          <span
            className="sd-card-pill"
            data-status={run.status}
            data-testid={`sd-card-status-${targetId}`}
          >
            {run.status}
          </span>
          <span className="sd-card-pill" data-state="no-contact">no field contact</span>
          {run.fixture_id && (
            <span
              className="sd-card-pill"
              data-state="fixture"
              data-testid={`sd-card-fixture-${targetId}`}
            >
              {run.fixture_id}
            </span>
          )}
        </div>
        <code className="sd-card-method">
          {run.receipt?.method ?? "—"}
        </code>
      </header>

      <p
        className="sd-card-reason"
        data-testid={`sd-card-reason-${targetId}`}
      >
        {run.reason}
      </p>

      {run.warnings.length > 0 && (
        <ul className="sd-card-warns" data-testid={`sd-card-warnings-${targetId}`}>
          {run.warnings.map((w, i) => <li key={`w-${i}`}>{w}</li>)}
        </ul>
      )}
      {run.errors.length > 0 && (
        <ul className="sd-card-errs" data-testid={`sd-card-errors-${targetId}`}>
          {run.errors.map((e, i) => <li key={`e-${i}`}>{e}</li>)}
        </ul>
      )}

      {run.receipt ? (
        <ReceiptBlock targetId={targetId} receipt={run.receipt} />
      ) : (
        <p
          className="sd-no-receipt"
          data-testid={`sd-card-no-receipt-${targetId}`}
        >
          No receipt emitted.
        </p>
      )}
    </article>
  );
}

interface ReceiptBlockProps {
  readonly targetId: string;
  readonly receipt: SingleDeviceCollectionRun["receipt"] & object;
}

function ReceiptBlock({ targetId, receipt }: ReceiptBlockProps): JSX.Element {
  return (
    <section
      className="sd-receipt"
      data-testid={`sd-card-receipt-${targetId}`}
      aria-label="Emitted receipt"
    >
      <header className="sd-receipt-head">
        <h5 className="sd-receipt-title">Emitted V1CD receipt</h5>
        <code
          className="sd-receipt-id"
          data-testid={`sd-card-receipt-id-${targetId}`}
        >
          {receipt.id}
        </code>
      </header>
      <div className="sd-receipt-stats" data-testid={`sd-card-counts-${targetId}`}>
        <span className="sd-stat">
          <span className="sd-stat-label">Attempted</span>
          <span className="sd-stat-value">{receipt.counts.attempted}</span>
        </span>
        <span className="sd-stat sd-stat--ok">
          <span className="sd-stat-label">Accepted</span>
          <span className="sd-stat-value">{receipt.counts.accepted}</span>
        </span>
        <span className="sd-stat sd-stat--rej">
          <span className="sd-stat-label">Rejected</span>
          <span className="sd-stat-value">{receipt.counts.rejected}</span>
        </span>
        <span className="sd-stat sd-stat--fail">
          <span className="sd-stat-label">Failed</span>
          <span className="sd-stat-value">{receipt.counts.failed}</span>
        </span>
      </div>
      <ul className="sd-receipt-evidence">
        {receipt.evidence.map((e: CollectionEvidenceEntry) => (
          <li
            key={e.id}
            data-status={e.status}
            data-testid={`sd-evidence-${targetId}-${e.fact}`}
          >
            <span className="sd-evidence-status" data-status={e.status}>
              {e.status}
            </span>
            <span className="sd-evidence-fact">{e.fact}</span>
            {e.message && (
              <span className="sd-evidence-message">{e.message}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
