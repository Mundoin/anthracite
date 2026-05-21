/**
 * V1BW — Diagnose Evidence Triage panel.
 *
 * Minimal display surface over the DiagnoseTriage projection. Reuses the
 * existing Diagnose CSS chips for severity/category. No selection state,
 * no controls — read-only triage list.
 */

import type { JSX } from "react";
import type {
  DiagnoseTriage,
  DiagnoseTriageFinding,
  TriageCategory,
  TriageSeverity,
} from "./diagnoseTriage";
import "./DiagnoseMode.css";

const SEVERITY_LABELS: Record<TriageSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

const CATEGORY_LABELS: Record<TriageCategory, string> = {
  discovery: "Discovery",
  topology: "Topology",
  evidence: "Evidence",
  intake: "Intake",
  assess: "Assess",
  activity: "Activity",
};

export interface DiagnoseTriagePanelProps {
  readonly triage: DiagnoseTriage;
}

export function DiagnoseTriagePanel({
  triage,
}: DiagnoseTriagePanelProps): JSX.Element {
  return (
    <div className="dx-triage" data-testid="dx-triage">
      <section className="dx-summary" data-testid="dx-triage-summary">
        <span className="dx-summary-cell" data-testid="dx-triage-total">
          <span className="dx-summary-label">Total findings</span>
          <span className="dx-summary-value">{triage.total_count}</span>
        </span>
        <span className="dx-summary-cell" data-testid="dx-triage-critical">
          <span className="dx-summary-label">Critical</span>
          <span className="dx-summary-value dx-summary-value--critical">
            {triage.critical_count}
          </span>
        </span>
        <span className="dx-summary-cell" data-testid="dx-triage-warning">
          <span className="dx-summary-label">Warning</span>
          <span className="dx-summary-value dx-summary-value--warning">
            {triage.warning_count}
          </span>
        </span>
        <span className="dx-summary-cell" data-testid="dx-triage-info">
          <span className="dx-summary-label">Info</span>
          <span className="dx-summary-value dx-summary-value--info">
            {triage.info_count}
          </span>
        </span>
      </section>

      {triage.findings.length === 0 ? (
        <section
          className="dx-body dx-body--clean"
          role="status"
          aria-label="No triage findings"
          data-testid="dx-triage-clean"
        >
          <p>No triage findings from current context.</p>
          <p className="dx-muted">
            Triage runs deterministic rules over Workbench Context Summary,
            Assessment Readiness, and the Operator Activity Ledger. Add
            seeds, import evidence, or generate readiness to surface
            inspection targets.
          </p>
        </section>
      ) : (
        <ul
          className="dx-list"
          data-testid="dx-triage-list"
          aria-label="Triage findings"
        >
          {triage.findings.map((f) => (
            <TriageRow key={f.id} finding={f} />
          ))}
        </ul>
      )}
    </div>
  );
}

interface TriageRowProps {
  readonly finding: DiagnoseTriageFinding;
}

function TriageRow({ finding }: TriageRowProps): JSX.Element {
  return (
    <li className="dx-card" data-testid={`dx-triage-${finding.id}`}>
      <header className="dx-card-header">
        <span
          className={`dx-chip dx-chip--${finding.severity}`}
          data-testid={`dx-triage-severity-${finding.id}`}
        >
          {SEVERITY_LABELS[finding.severity]}
        </span>
        <span
          className="dx-chip dx-chip--category"
          data-testid={`dx-triage-category-${finding.id}`}
        >
          {CATEGORY_LABELS[finding.category]}
        </span>
      </header>
      <h3 className="dx-card-title">{finding.title}</h3>
      <p
        className="dx-card-why"
        data-testid={`dx-triage-action-${finding.id}`}
      >
        {finding.recommended_action}
      </p>
      <p className="dx-card-sub" data-testid={`dx-triage-reason-${finding.id}`}>
        <code>{finding.reason_code}</code>
      </p>
    </li>
  );
}
