/**
 * V1CD — Collection Receipts panel (preview / read-only).
 *
 * Renders the v0 receipt catalogue inside Topology mode. Read-only:
 * receipts are typed proofs of past imports / future live collections;
 * no contact runs here.
 */

import type { JSX } from "react";
import {
  listCollectionReceipts,
  validateCollectionReceiptCatalogue,
} from "../../engines/collectionReceiptCatalogue";
import type {
  CollectionEvidenceEntry,
  CollectionReceipt,
  CollectionReceiptValidationResult,
} from "../../types/collectionReceipt";
import "./CollectionReceiptsPanel.css";

export function CollectionReceiptsPanel(): JSX.Element {
  const receipts = listCollectionReceipts();
  const audit = validateCollectionReceiptCatalogue(receipts);
  const verdictIndex = new Map<string, CollectionReceiptValidationResult>(
    audit.per_receipt.map((p) => [p.id, p.result]),
  );

  return (
    <section
      className="cr-panel"
      data-testid="cr-panel"
      aria-label="Collection receipts (preview)"
    >
      <header className="cr-panel-head">
        <h3 className="cr-panel-title">Collection Receipts</h3>
        <span className="cr-panel-stub-tag">preview · v0</span>
      </header>
      <p className="cr-panel-sub">
        Typed proof of import and (future) live collection runs (V1CD). No live
        contact yet — receipts here describe what was attempted, what source /
        method was used, and what evidence was accepted, rejected, or failed.
      </p>
      <p className="cr-panel-audit" data-testid="cr-panel-audit">
        Catalogue: <strong>{audit.ok ? "valid" : "issues"}</strong> ·{" "}
        {receipts.length} receipt{receipts.length === 1 ? "" : "s"}
      </p>

      <ul className="cr-list" data-testid="cr-list">
        {receipts.map((r) => (
          <ReceiptCard
            key={r.id}
            receipt={r}
            verdict={verdictIndex.get(r.id) ?? { ok: true, issues: [] }}
          />
        ))}
      </ul>

      <footer className="cr-panel-foot">
        Receipts share id space with V1CC targets and align with V1BY source
        kinds. V1CE will produce live receipts behind the read-only contact
        policy; V1CI will surface per-evidence drilldown.
      </footer>
    </section>
  );
}

interface ReceiptCardProps {
  readonly receipt: CollectionReceipt;
  readonly verdict: CollectionReceiptValidationResult;
}

function ReceiptCard({ receipt, verdict }: ReceiptCardProps): JSX.Element {
  const c = receipt.counts;
  return (
    <li
      className="cr-card"
      data-testid={`cr-card-${receipt.id}`}
      data-source-kind={receipt.source_kind}
      data-freshness={receipt.freshness}
    >
      <header className="cr-card-head">
        <div className="cr-card-head-left">
          <h4 className="cr-card-title">{receipt.id}</h4>
          <span
            className="cr-card-pill"
            data-state={verdict.ok ? "ok" : "issues"}
            data-testid={`cr-card-verdict-${receipt.id}`}
          >
            {verdict.ok ? "valid" : `${verdict.issues.length} issue${verdict.issues.length === 1 ? "" : "s"}`}
          </span>
          <span
            className="cr-card-pill"
            data-source-kind={receipt.source_kind}
            data-testid={`cr-card-source-${receipt.id}`}
          >
            {receipt.source_kind}
          </span>
          <span className="cr-card-pill" data-freshness={receipt.freshness}>
            {receipt.freshness}
          </span>
        </div>
        <code className="cr-card-method">{receipt.method}</code>
      </header>

      {receipt.note && <p className="cr-card-note">{receipt.note}</p>}

      <dl className="cr-rows">
        <Row label="Target">
          {receipt.target_id ? (
            <code data-testid={`cr-card-target-${receipt.id}`}>
              {receipt.target_id}
            </code>
          ) : (
            <span className="cr-muted">— none —</span>
          )}
        </Row>
        <Row label="Run">
          {receipt.run_id ? <code>{receipt.run_id}</code> : <span className="cr-muted">—</span>}
        </Row>
        <Row label="Scope">
          {receipt.scope_attempted.length === 0 ? (
            <span className="cr-muted">—</span>
          ) : (
            receipt.scope_attempted.map((s) => (
              <span key={s} className="cr-chip">
                {s}
              </span>
            ))
          )}
        </Row>
        <Row label="Timing">
          <span className="cr-chip">started {receipt.started_at}</span>
          <span className="cr-chip">finished {receipt.finished_at}</span>
          {receipt.observed_at && (
            <span className="cr-chip">observed {receipt.observed_at}</span>
          )}
          {receipt.imported_at && (
            <span className="cr-chip">imported {receipt.imported_at}</span>
          )}
        </Row>
      </dl>

      <div className="cr-stats" data-testid={`cr-card-counts-${receipt.id}`}>
        <span className="cr-stat">
          <span className="cr-stat-label">Attempted</span>
          <span className="cr-stat-value">{c.attempted}</span>
        </span>
        <span className="cr-stat cr-stat--ok">
          <span className="cr-stat-label">Accepted</span>
          <span className="cr-stat-value">{c.accepted}</span>
        </span>
        <span className="cr-stat cr-stat--rej">
          <span className="cr-stat-label">Rejected</span>
          <span className="cr-stat-value">{c.rejected}</span>
        </span>
        <span className="cr-stat cr-stat--fail">
          <span className="cr-stat-label">Failed</span>
          <span className="cr-stat-value">{c.failed}</span>
        </span>
      </div>

      {receipt.evidence.length > 0 && (
        <EvidenceList entries={receipt.evidence} receiptId={receipt.id} />
      )}

      {receipt.warnings.length > 0 && (
        <ul className="cr-card-warns" data-testid={`cr-card-warnings-${receipt.id}`}>
          {receipt.warnings.map((w, idx) => (
            <li key={`w-${idx}`}>{w}</li>
          ))}
        </ul>
      )}
      {receipt.errors.length > 0 && (
        <ul className="cr-card-errs" data-testid={`cr-card-errors-${receipt.id}`}>
          {receipt.errors.map((e, idx) => (
            <li key={`e-${idx}`}>{e}</li>
          ))}
        </ul>
      )}

      {!verdict.ok && (
        <ul className="cr-card-issues" data-testid={`cr-card-issues-${receipt.id}`}>
          {verdict.issues.map((i, idx) => (
            <li key={`${i.field}-${idx}`}>
              <strong>{i.field}</strong> — {i.message}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function EvidenceList({
  entries,
  receiptId,
}: {
  readonly entries: readonly CollectionEvidenceEntry[];
  readonly receiptId: string;
}): JSX.Element {
  return (
    <details
      className="cr-evidence"
      data-testid={`cr-card-evidence-${receiptId}`}
    >
      <summary>Evidence ({entries.length})</summary>
      <ul>
        {entries.map((e) => (
          <li
            key={e.id}
            data-status={e.status}
            data-testid={`cr-evidence-${receiptId}-${e.id}`}
          >
            <span className="cr-evidence-status" data-status={e.status}>
              {e.status}
            </span>
            <code className="cr-evidence-id">{e.id}</code>
            <span className="cr-evidence-fact">{e.fact}</span>
            {e.source && <span className="cr-evidence-source">{e.source}</span>}
            {e.confidence !== null && (
              <span className="cr-evidence-conf">
                conf {(e.confidence * 100).toFixed(0)}%
              </span>
            )}
            {e.message && <span className="cr-evidence-message">{e.message}</span>}
          </li>
        ))}
      </ul>
    </details>
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
    <div className="cr-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
