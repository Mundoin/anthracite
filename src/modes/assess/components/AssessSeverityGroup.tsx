/**
 * V1X — by-severity rendering.
 *
 * Regroups the same already-filtered visible findings under
 * severity headings. No new totals; per-row counts derive from the
 * passed group's `rows.length`.
 */

import type { JSX } from "react";

import type { SeverityGroup } from "../triage";
import { severityLabelShort } from "./AssessTriageHeader";

export interface AssessSeverityGroupProps {
  readonly group: SeverityGroup;
}

export function AssessSeverityGroup({
  group,
}: AssessSeverityGroupProps): JSX.Element {
  return (
    <section
      className={`assess-sev-group assess-sev-group--${group.severity}`}
      aria-label={`Severity ${group.severity}`}
    >
      <header className="assess-sev-group__header">
        <span
          className={`assess-sev-pill assess-sev-pill--${group.severity}`}
        >
          {severityLabelShort(group.severity)}
        </span>
        <span className="assess-sev-group__count intake-mono">
          {group.rows.length} finding{group.rows.length === 1 ? "" : "s"}
        </span>
      </header>
      <ul className="assess-sev-group__rows">
        {group.rows.map((row, i) => (
          <li
            key={`${row.identity.slice_id}__${row.finding.finding_key}__${i}`}
            className="assess-sev-row"
          >
            <span className="assess-sev-row__rule intake-mono">
              {row.finding.rule_id}
            </span>
            <span className="assess-sev-row__title">{row.finding.title}</span>
            <span className="assess-sev-row__device intake-muted">
              ←{" "}
              <span className="intake-mono">
                {row.identity.hostname ?? row.identity.slice_id}
              </span>
              {row.identity.platform_id && (
                <span className="intake-muted">
                  {" · "}
                  {row.identity.platform_id}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
