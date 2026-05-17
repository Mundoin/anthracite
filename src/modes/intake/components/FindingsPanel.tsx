/**
 * V1P FindingsPanel — sibling-of-receipt projection.
 *
 * Renders a `ValidationReport` verbatim. Honesty rules (binding):
 *   - Counts come from `report.findings.filter(...)`, never from
 *     props or memoised projections.
 *   - Severity strings render from `finding.severity` directly.
 *   - No conditional severity escalation.
 *   - No grouping into "issues".
 *   - No filter UI, no bulk actions, no acknowledge / dismiss.
 *   - Clean and skipped rules visible-but-collapsed via `<details>`.
 *
 * Per `INTAKE_SURFACE_CONTRACT.md` §"Findings panel (V1P overlay)",
 * the panel renders ABOVE `ReceiptDisplay` in the single-device
 * intake and drilled-in slice views. It is NOT rendered in
 * `BatchSummaryView`.
 */

/**
 * V1Y shared display surface.
 *
 * As of V1Y, `FindingsPanel` is a shared display component consumed
 * by both INTAKE (author mode) and ASSESS (viewer mode):
 *
 *   - INTAKE renders the live `ValidationReport` from a successful
 *     parse.
 *   - ASSESS renders a `ValidationReport` reshaped from
 *     `BatchRunExportValidationReport` by the ASSESS-owned
 *     `displayAdapter` (see `src/modes/assess/displayAdapter.ts`).
 *
 * The component itself remains mode-agnostic: it renders a
 * `ValidationReport`. Any change to its props requires coordinated
 * review per `docs/architecture/FINDINGS_DISPLAY_CONTRACT.md`.
 */

import type { JSX } from "react";

import type {
  Evidence,
  Finding,
  Severity,
  SkippedRule,
  ValidationReport,
} from "../../../types/validator";

export interface FindingsPanelProps {
  readonly report: ValidationReport;
}

const SEVERITY_ORDER: ReadonlyArray<Severity> = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

export function FindingsPanel({ report }: FindingsPanelProps): JSX.Element {
  const total = report.findings.length;
  const counts: Record<Severity, number> = {
    critical: report.findings.filter((f) => f.severity === "critical").length,
    high: report.findings.filter((f) => f.severity === "high").length,
    medium: report.findings.filter((f) => f.severity === "medium").length,
    low: report.findings.filter((f) => f.severity === "low").length,
    info: report.findings.filter((f) => f.severity === "info").length,
  };

  return (
    <section
      className="intake-findings"
      aria-label="Validation findings"
    >
      <header className="intake-findings__header">
        <div className="intake-findings__title">FINDINGS</div>
        <div className="intake-findings__version">
          validator v{report.validator_version} · pack v{report.rule_pack_version}
        </div>
      </header>

      <div className="intake-findings__counts">
        {SEVERITY_ORDER.filter(
          (s) => s !== "critical" || counts.critical > 0,
        ).map((s) => (
          <span
            key={s}
            className={`intake-findings__count intake-findings__count--${s}`}
          >
            {labelSeverity(s)} {counts[s]}
          </span>
        ))}
        <span className="intake-findings__count-total">
          total {total}
        </span>
      </div>

      {total === 0 ? (
        <div className="intake-findings__empty">No findings.</div>
      ) : (
        <ul className="intake-findings__list">
          {report.findings.map((f) => (
            <FindingRow key={f.finding_key} finding={f} />
          ))}
        </ul>
      )}

      <footer className="intake-findings__footer">
        <details className="intake-findings__group">
          <summary>
            Clean: {report.clean_rules.length} rule(s)
          </summary>
          {report.clean_rules.length === 0 ? (
            <div className="intake-empty">(none)</div>
          ) : (
            <ul className="intake-findings__rules-list">
              {report.clean_rules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </details>
        <details className="intake-findings__group">
          <summary>
            Skipped: {report.skipped_rules.length} rule(s)
          </summary>
          {report.skipped_rules.length === 0 ? (
            <div className="intake-empty">(none)</div>
          ) : (
            <ul className="intake-findings__rules-list">
              {report.skipped_rules.map((s) => (
                <SkippedRow key={s.rule_id} skipped={s} />
              ))}
            </ul>
          )}
        </details>
      </footer>
    </section>
  );
}

interface FindingRowProps {
  readonly finding: Finding;
}

function FindingRow({ finding }: FindingRowProps): JSX.Element {
  return (
    <li
      className={`intake-findings__row intake-findings__row--${finding.severity}`}
    >
      <details>
        <summary>
          <span
            className={`intake-findings__sev intake-findings__sev--${finding.severity}`}
          >
            {labelSeverity(finding.severity)}
          </span>{" "}
          <span className="intake-findings__rule-id">{finding.rule_id}</span>{" "}
          <span className="intake-findings__finding-title">
            {finding.title}
          </span>
        </summary>
        <div className="intake-findings__details">
          {finding.evidence.length > 0 && (
            <div className="intake-findings__evidence">
              <div className="intake-findings__details-label">Evidence</div>
              <ul>
                {finding.evidence.map((e, i) => (
                  <EvidenceRow key={i} evidence={e} />
                ))}
              </ul>
            </div>
          )}
          {finding.recommendation && (
            <div className="intake-findings__recommendation">
              <div className="intake-findings__details-label">
                Recommendation
              </div>
              <div>{finding.recommendation}</div>
            </div>
          )}
          <div className="intake-findings__meta">
            <span>{finding.rule_id}</span>
            <span> · rule v{finding.rule_version}</span>
            <span> · area: {finding.affected_area}</span>
          </div>
        </div>
      </details>
    </li>
  );
}

interface EvidenceRowProps {
  readonly evidence: Evidence;
}

function EvidenceRow({ evidence }: EvidenceRowProps): JSX.Element {
  const lineRange =
    evidence.line_start !== null && evidence.line_end !== null
      ? `lines ${evidence.line_start}-${evidence.line_end}`
      : evidence.line_start !== null
        ? `line ${evidence.line_start}`
        : null;
  return (
    <li className="intake-findings__evidence-row">
      {evidence.model_path && (
        <span className="intake-mono">{evidence.model_path}</span>
      )}
      {lineRange && (
        <span className="intake-muted"> · {lineRange}</span>
      )}
      {evidence.note && (
        <span className="intake-muted"> · {evidence.note}</span>
      )}
      {evidence.raw_excerpt && (
        <code className="intake-findings__raw">{evidence.raw_excerpt}</code>
      )}
    </li>
  );
}

interface SkippedRowProps {
  readonly skipped: SkippedRule;
}

function SkippedRow({ skipped }: SkippedRowProps): JSX.Element {
  return (
    <li>
      {skipped.rule_id}
      <span className="intake-muted">
        {" · "}
        {labelSkipReason(skipped.reason)}
        {skipped.area && ` · ${skipped.area}`}
      </span>
    </li>
  );
}

function labelSeverity(s: Severity): string {
  switch (s) {
    case "critical":
      return "CRIT";
    case "high":
      return "HIGH";
    case "medium":
      return "MED";
    case "low":
      return "LOW";
    case "info":
      return "INFO";
  }
}

function labelSkipReason(reason: SkippedRule["reason"]): string {
  switch (reason) {
    case "area_not_in_scope":
      return "area not in scope";
    case "area_absent":
      return "area absent";
    case "insufficient_data":
      return "insufficient data";
  }
}
