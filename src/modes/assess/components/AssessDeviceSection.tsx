/**
 * V1X — collapsible per-device section.
 *
 * Header always renders: hostname/slice/platform chips + finding
 * count + highest-severity pill. Body (FindingsPanel + filtered
 * report) renders only when expanded.
 *
 * V1Y: the wire-type-to-canonical adapter that previously lived
 * inline was moved to `src/modes/assess/displayAdapter.ts` per
 * `FINDINGS_DISPLAY_CONTRACT.md` F6.
 */

import type { JSX } from "react";

import { FindingsPanel } from "../../intake/components/FindingsPanel";
import type {
  BatchRunExportDevice,
  BatchRunExportFinding,
} from "../../../types/batchRunExport";
import { exportReportAsValidationReport } from "../displayAdapter";
import type { DeviceIdentity } from "../triage";
import { severityLabelShort } from "./AssessTriageHeader";

export interface AssessDeviceSectionProps {
  readonly device: BatchRunExportDevice;
  readonly identity: DeviceIdentity;
  readonly visibleFindings: ReadonlyArray<BatchRunExportFinding>;
  readonly expanded: boolean;
  readonly onToggleExpand: () => void;
  readonly filtersActive: boolean;
}

export function AssessDeviceSection(
  props: AssessDeviceSectionProps,
): JSX.Element {
  const {
    device,
    identity,
    visibleFindings,
    expanded,
    onToggleExpand,
    filtersActive,
  } = props;
  const displayName = identity.hostname ?? identity.slice_id;
  const platformLabel =
    identity.platform_id ??
    (identity.vendor ? identity.vendor : null);

  return (
    <article
      className={
        "assess-device" + (expanded ? " assess-device--expanded" : "")
      }
      data-sev={identity.highestSeverity ?? "none"}
      data-clean={identity.isClean ? "true" : "false"}
      data-skipped={identity.hasSkippedRules ? "true" : "false"}
      aria-label={`Device ${identity.slice_id}`}
    >
      <header className="assess-device__header">
        <button
          type="button"
          className="assess-device__toggle"
          aria-expanded={expanded}
          aria-controls={`assess-device-body-${identity.slice_id}`}
          onClick={onToggleExpand}
        >
          <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
          <span className="assess-device__name intake-mono">
            {displayName}
          </span>
        </button>
        <span className="intake-muted">{identity.slice_id}</span>
        {platformLabel && (
          <span className="assess-platform-chip" aria-label="Platform">
            {platformLabel}
          </span>
        )}
        <span className="assess-device__stage intake-muted">
          {identity.stage_status}
        </span>
        <span className="assess-device__counts intake-mono">
          {filtersActive
            ? `${visibleFindings.length} / ${identity.findingCount}`
            : `${identity.findingCount}`}{" "}
          finding{identity.findingCount === 1 ? "" : "s"}
        </span>
        {identity.highestSeverity && (
          <span
            className={`assess-sev-pill assess-sev-pill--${identity.highestSeverity}`}
            aria-label="Highest severity present"
          >
            {severityLabelShort(identity.highestSeverity)}
          </span>
        )}
        {identity.isClean && (
          <span className="assess-sev-pill assess-sev-pill--clean">CLEAN</span>
        )}
        {identity.hasSkippedRules && (
          <span className="assess-sev-pill assess-sev-pill--skipped">
            SKIP
          </span>
        )}
      </header>
      {expanded && (
        <div
          id={`assess-device-body-${identity.slice_id}`}
          className="assess-device__body"
        >
          {device.validation_report ? (
            <FindingsPanel
              report={exportReportAsValidationReport(
                device.validation_report,
                visibleFindings,
              )}
            />
          ) : (
            <div className="intake-muted assess-device__no-report">
              no validation report
            </div>
          )}
        </div>
      )}
    </article>
  );
}
