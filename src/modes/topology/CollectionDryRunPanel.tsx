/**
 * V1CE — Collection Dry-Run Preview panel.
 *
 * Operator-visible preview of what Anthracite WOULD collect from a
 * V1CC target. No live contact. Renders the V1CC demo target by
 * default; sits alongside the existing LiveCollectionDryRunPanel in
 * the Topology → Collection Plan tab.
 */

import type { JSX } from "react";
import { buildDemoCollectionDryRun } from "../../engines/collectionDryRunBuilder";
import {
  validateCollectionDryRun,
  type CollectionDryRunResult,
} from "../../types/collectionDryRun";
import type { CollectionReceipt } from "../../types/collectionReceipt";
import "./CollectionDryRunPanel.css";

export function CollectionDryRunPanel(): JSX.Element {
  const result = buildDemoCollectionDryRun();
  const audit = validateCollectionDryRun(result);

  return (
    <section
      className="cd-panel"
      data-testid="cd-panel"
      aria-label="Collection dry-run preview"
    >
      <header className="cd-panel-head">
        <h3 className="cd-panel-title">Dry-Run Preview (V1CE)</h3>
        <span className="cd-panel-stub-tag">preview · v0 · no contact</span>
      </header>
      <p className="cd-panel-sub">
        Operator-triggered preview of what Anthracite would collect from a V1CC
        target. <strong>No live contact runs here.</strong> Plan + V1CD-style
        receipt preview only.
      </p>

      <DryRunCard result={result} valid={audit.ok} />

      <footer className="cd-panel-foot">
        Real read-only collection lands in V1CF (single-device collector). V1CE
        validates safety + emits the receipt shape a future runner will produce.
      </footer>
    </section>
  );
}

interface DryRunCardProps {
  readonly result: CollectionDryRunResult;
  readonly valid: boolean;
}

function DryRunCard({ result, valid }: DryRunCardProps): JSX.Element {
  const { plan, verdict, reason, warnings, errors, receipt_preview } = result;
  return (
    <article
      className="cd-card"
      data-testid={`cd-card-${plan.target_id}`}
      data-verdict={verdict}
    >
      <header className="cd-card-head">
        <div className="cd-card-head-left">
          <h4 className="cd-card-title">{plan.target_name}</h4>
          <span
            className="cd-card-pill"
            data-verdict={verdict}
            data-testid={`cd-card-verdict-${plan.target_id}`}
          >
            {verdict}
          </span>
          <span className="cd-card-pill" data-state="no-contact">no contact</span>
          {valid ? (
            <span className="cd-card-pill" data-state="ok">validated</span>
          ) : (
            <span className="cd-card-pill" data-state="issues">issues</span>
          )}
        </div>
        <code className="cd-card-id">{plan.target_id}</code>
      </header>

      <p className="cd-card-reason" data-testid={`cd-card-reason-${plan.target_id}`}>
        {reason}
      </p>

      <dl className="cd-rows">
        <Row label="Methods">
          {plan.access_methods.map((m) => (
            <span key={m} className="cd-chip">{m}</span>
          ))}
        </Row>
        <Row label="Scope">
          {plan.scope_attempted.map((s) => (
            <span key={s} className="cd-chip">{s}</span>
          ))}
        </Row>
        <Row label="Policy">
          <code data-testid={`cd-card-policy-${plan.target_id}`}>
            {plan.contact_policy_summary}
          </code>
        </Row>
        <Row label="Expected source">
          <span className="cd-chip" data-source-kind={plan.expected_source_kind}>
            {plan.expected_source_kind}
          </span>
        </Row>
      </dl>

      {warnings.length > 0 && (
        <ul
          className="cd-card-warns"
          data-testid={`cd-card-warnings-${plan.target_id}`}
        >
          {warnings.map((w, i) => <li key={`w-${i}`}>{w}</li>)}
        </ul>
      )}
      {errors.length > 0 && (
        <ul
          className="cd-card-errs"
          data-testid={`cd-card-errors-${plan.target_id}`}
        >
          {errors.map((e, i) => <li key={`e-${i}`}>{e}</li>)}
        </ul>
      )}

      {receipt_preview ? (
        <ReceiptPreview receipt={receipt_preview} targetId={plan.target_id} />
      ) : (
        <p
          className="cd-no-preview"
          data-testid={`cd-card-no-preview-${plan.target_id}`}
        >
          Blocked — no receipt preview emitted.
        </p>
      )}
    </article>
  );
}

interface ReceiptPreviewProps {
  readonly receipt: CollectionReceipt;
  readonly targetId: string;
}

function ReceiptPreview({ receipt, targetId }: ReceiptPreviewProps): JSX.Element {
  return (
    <section
      className="cd-preview"
      data-testid={`cd-card-preview-${targetId}`}
      aria-label="Receipt preview"
    >
      <header className="cd-preview-head">
        <h5 className="cd-preview-title">V1CD receipt preview</h5>
        <code className="cd-preview-id">{receipt.id}</code>
      </header>
      <div className="cd-preview-stats">
        <span className="cd-stat">
          <span className="cd-stat-label">Attempted</span>
          <span className="cd-stat-value">{receipt.counts.attempted}</span>
        </span>
        <span className="cd-stat cd-stat--ok">
          <span className="cd-stat-label">Accepted</span>
          <span className="cd-stat-value">{receipt.counts.accepted}</span>
        </span>
        <span className="cd-stat cd-stat--rej">
          <span className="cd-stat-label">Rejected</span>
          <span className="cd-stat-value">{receipt.counts.rejected}</span>
        </span>
        <span className="cd-stat cd-stat--fail">
          <span className="cd-stat-label">Failed</span>
          <span className="cd-stat-value">{receipt.counts.failed}</span>
        </span>
      </div>
      <ul className="cd-preview-evidence">
        {receipt.evidence.map((e) => (
          <li
            key={e.id}
            data-status={e.status}
            data-testid={`cd-preview-evidence-${targetId}-${e.fact}`}
          >
            <span className="cd-evidence-fact">{e.fact}</span>
            <span className="cd-evidence-source">{e.source}</span>
            {e.message && <span className="cd-evidence-message">{e.message}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="cd-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
