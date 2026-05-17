/**
 * V1X — ASSESS triage header.
 *
 * Search box + severity chip row + rule-id chip row + view-mode
 * toggle. All controls are purely view-level; toggling them
 * dispatches setters owned by `AssessLoadedView`.
 */

import type { ChangeEvent, JSX } from "react";

import type {
  SeverityChip,
  SeverityChipCounts,
} from "../triage";
import type { Severity } from "../../../types/validator";

export type AssessViewMode = "by_device" | "by_severity";

export interface AssessTriageHeaderProps {
  readonly search: string;
  readonly onSearchChange: (next: string) => void;
  readonly viewMode: AssessViewMode;
  readonly onViewModeChange: (next: AssessViewMode) => void;
  readonly severityChips: ReadonlyArray<SeverityChip>;
  readonly selectedSeverities: ReadonlySet<SeverityChip>;
  readonly onToggleSeverity: (chip: SeverityChip) => void;
  readonly severityCounts: SeverityChipCounts;
  readonly ruleIds: ReadonlyArray<string>;
  readonly selectedRuleIds: ReadonlySet<string>;
  readonly onToggleRuleId: (ruleId: string) => void;
  readonly ruleCounts: ReadonlyMap<string, number>;
  readonly onClearFilters: () => void;
  readonly filtersActive: boolean;
  readonly visibleDeviceCount: number;
  readonly totalDeviceCount: number;
}

export function AssessTriageHeader(
  props: AssessTriageHeaderProps,
): JSX.Element {
  const {
    search,
    onSearchChange,
    viewMode,
    onViewModeChange,
    severityChips,
    selectedSeverities,
    onToggleSeverity,
    severityCounts,
    ruleIds,
    selectedRuleIds,
    onToggleRuleId,
    ruleCounts,
    onClearFilters,
    filtersActive,
    visibleDeviceCount,
    totalDeviceCount,
  } = props;

  return (
    <section
      className="assess-triage-header"
      aria-label="Assessment triage controls"
    >
      <div className="assess-triage-header__row">
        <label className="assess-triage-header__search">
          <span className="assess-triage-header__search-label">Search</span>
          <input
            type="search"
            className="assess-triage-header__search-input"
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onSearchChange(e.target.value)
            }
            placeholder="hostname, slice, platform, rule…"
            aria-label="Search devices and findings"
          />
        </label>

        <div
          className="assess-triage-header__view-toggle"
          role="group"
          aria-label="View mode"
        >
          <button
            type="button"
            className={
              "intake-btn intake-btn--tiny" +
              (viewMode === "by_device" ? " assess-toggle--active" : "")
            }
            aria-pressed={viewMode === "by_device"}
            onClick={() => onViewModeChange("by_device")}
          >
            By device
          </button>
          <button
            type="button"
            className={
              "intake-btn intake-btn--tiny" +
              (viewMode === "by_severity" ? " assess-toggle--active" : "")
            }
            aria-pressed={viewMode === "by_severity"}
            onClick={() => onViewModeChange("by_severity")}
          >
            By severity
          </button>
        </div>

        <div className="assess-triage-header__visible-count intake-muted intake-mono">
          {filtersActive
            ? `visible ${visibleDeviceCount} / ${totalDeviceCount} devices`
            : `${totalDeviceCount} device${totalDeviceCount === 1 ? "" : "s"}`}
        </div>

        {filtersActive && (
          <button
            type="button"
            className="intake-btn intake-btn--tiny"
            onClick={onClearFilters}
            aria-label="Clear filters"
          >
            Clear filters
          </button>
        )}
      </div>

      {severityChips.length > 0 && (
        <div
          className="assess-triage-header__chips"
          role="group"
          aria-label="Filter by severity"
        >
          <span className="assess-triage-header__chips-label intake-muted">
            Severity:
          </span>
          {severityChips.map((s) => (
            <ChipButton
              key={s}
              label={severityChipLabel(s)}
              count={severityCounts.get(s) ?? 0}
              active={selectedSeverities.has(s)}
              kind={severityChipKind(s)}
              onToggle={() => onToggleSeverity(s)}
            />
          ))}
        </div>
      )}

      {ruleIds.length > 0 && (
        <div
          className="assess-triage-header__chips"
          role="group"
          aria-label="Filter by rule"
        >
          <span className="assess-triage-header__chips-label intake-muted">
            Rule:
          </span>
          {ruleIds.map((r) => (
            <ChipButton
              key={r}
              label={r}
              count={ruleCounts.get(r) ?? 0}
              active={selectedRuleIds.has(r)}
              kind="neutral"
              onToggle={() => onToggleRuleId(r)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface ChipButtonProps {
  readonly label: string;
  readonly count: number;
  readonly active: boolean;
  readonly kind: "fault" | "warn" | "neutral";
  readonly onToggle: () => void;
}

function ChipButton({
  label,
  count,
  active,
  kind,
  onToggle,
}: ChipButtonProps): JSX.Element {
  const cls = [
    "assess-chip",
    `assess-chip--${kind}`,
    active ? "assess-chip--active" : "",
  ]
    .join(" ")
    .trim();
  return (
    <button
      type="button"
      className={cls}
      aria-pressed={active}
      onClick={onToggle}
    >
      <span className="assess-chip__label">{label}</span>
      <span className="assess-chip__count">{count}</span>
    </button>
  );
}

function severityChipLabel(s: SeverityChip): string {
  switch (s) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    case "info":
      return "Info";
    case "clean":
      return "Clean";
    case "skipped":
      return "Skipped";
  }
}

function severityChipKind(s: SeverityChip): "fault" | "warn" | "neutral" {
  if (s === "critical" || s === "high") return "fault";
  if (s === "medium" || s === "low") return "warn";
  return "neutral";
}

export function severityLabelShort(s: Severity): string {
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
