/**
 * V1W-R + V1X — ASSESS loaded view.
 *
 * V1W-R: render a successfully loaded `BatchRunExport` artifact
 * read-only via `FindingsPanel` + `RunSummaryStrip`.
 *
 * V1X: layer in operator-triage affordances on top of the same
 * artifact — search, severity chips, rule-id chips, by-device vs
 * by-severity view mode, and per-device collapse/expand. All
 * affordances are view-only and stateless (A4 still binds: closing
 * the assessment forgets every filter and expansion state).
 *
 * Contract clauses A1–A8 (V1W-R) and X1–X6 (V1X) are enforced
 * here:
 *   - Whole-artifact totals come from `artifact.summary.*` via
 *     `RunSummaryStrip`.
 *   - Per-chip counts, per-device counts, and grouping all flow
 *     through pure helpers in `triage.ts`.
 *   - Filtering hides rows but does not transform finding content.
 *   - The loaded artifact object is never mutated.
 */

import { useCallback, useMemo, useReducer, useState, type JSX } from "react";

import { RunSummaryStrip } from "../../intake/components/RunSummaryStrip";
import type {
  BatchRun,
  BatchRunDevice,
} from "../../../types/batchRun";
import type {
  BatchRunExport,
  BatchRunExportDevice,
} from "../../../types/batchRunExport";
import {
  applyTriage,
  defaultExpandedSliceIds,
  deviceIdentity,
  distinctRuleIds,
  EMPTY_FILTERS,
  filtersAreActive,
  groupBySeverity,
  presentSeverityChips,
  ruleIdCounts,
  severityChipCounts,
  type SeverityChip,
  type TriageFilters,
} from "../triage";
import { AssessDeviceSection } from "./AssessDeviceSection";
import { AssessSeverityGroup } from "./AssessSeverityGroup";
import {
  AssessTriageHeader,
  type AssessViewMode,
} from "./AssessTriageHeader";

export interface AssessLoadedViewProps {
  readonly artifact: BatchRunExport;
  readonly filename: string;
  readonly onClose: () => void;
}

// -----------------------------------------------------------------------------
// Local triage state
// -----------------------------------------------------------------------------

interface TriageState {
  readonly filters: TriageFilters;
  readonly viewMode: AssessViewMode;
}

type TriageAction =
  | { readonly type: "SetSearch"; readonly value: string }
  | { readonly type: "ToggleSeverity"; readonly chip: SeverityChip }
  | { readonly type: "ToggleRuleId"; readonly ruleId: string }
  | { readonly type: "SetViewMode"; readonly mode: AssessViewMode }
  | { readonly type: "ClearFilters" };

function triageReducer(state: TriageState, action: TriageAction): TriageState {
  switch (action.type) {
    case "SetSearch":
      return {
        ...state,
        filters: { ...state.filters, search: action.value },
      };
    case "ToggleSeverity": {
      const next = new Set(state.filters.severities);
      if (next.has(action.chip)) next.delete(action.chip);
      else next.add(action.chip);
      return { ...state, filters: { ...state.filters, severities: next } };
    }
    case "ToggleRuleId": {
      const next = new Set(state.filters.ruleIds);
      if (next.has(action.ruleId)) next.delete(action.ruleId);
      else next.add(action.ruleId);
      return { ...state, filters: { ...state.filters, ruleIds: next } };
    }
    case "SetViewMode":
      return { ...state, viewMode: action.mode };
    case "ClearFilters":
      return { ...state, filters: EMPTY_FILTERS };
  }
}

const INITIAL_TRIAGE: TriageState = {
  filters: EMPTY_FILTERS,
  viewMode: "by_device",
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function AssessLoadedView({
  artifact,
  filename,
  onClose,
}: AssessLoadedViewProps): JSX.Element {
  const [triage, dispatch] = useReducer(triageReducer, INITIAL_TRIAGE);

  // Default-expansion seed: devices with findings start expanded.
  // Operator toggles override this seed individually; computing the
  // seed once per artifact identity is correct because closing &
  // re-loading another artifact remounts the component (the parent
  // panel only renders this view when state.kind === "loaded").
  const defaultExpanded = useMemo(
    () => defaultExpandedSliceIds(artifact),
    [artifact],
  );
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(
    () => new Map(),
  );

  const isExpanded = useCallback(
    (slice_id: string): boolean => {
      if (overrides.has(slice_id)) return overrides.get(slice_id)!;
      return defaultExpanded.has(slice_id);
    },
    [defaultExpanded, overrides],
  );

  const toggleExpanded = useCallback(
    (slice_id: string): void => {
      setOverrides((prev) => {
        const cur = prev.has(slice_id)
          ? prev.get(slice_id)!
          : defaultExpanded.has(slice_id);
        const next = new Map(prev);
        next.set(slice_id, !cur);
        return next;
      });
    },
    [defaultExpanded],
  );

  const sevChips = useMemo(() => presentSeverityChips(artifact), [artifact]);
  const sevCounts = useMemo(() => severityChipCounts(artifact), [artifact]);
  const ruleIds = useMemo(() => distinctRuleIds(artifact), [artifact]);
  const ruleCountsMap = useMemo(() => ruleIdCounts(artifact), [artifact]);

  const visible = useMemo(
    () => applyTriage(artifact, triage.filters),
    [artifact, triage.filters],
  );
  const sevGroups = useMemo(() => groupBySeverity(visible), [visible]);
  const filtersActive = filtersAreActive(triage.filters);

  const syntheticBatchRun = useMemo(() => toBatchRun(artifact), [artifact]);
  const noop = useCallback((): void => {
    /* viewer-only: no orchestration callbacks */
  }, []);

  return (
    <section className="assess-loaded" aria-label="Loaded assessment">
      <header className="assess-loaded__header">
        <div className="assess-loaded__title">
          <span className="assess-loaded__heading">Assessment</span>
          <span className="intake-muted">
            {" · Loaded from "}
            <span className="intake-mono">{filename}</span>
          </span>
        </div>
        <button
          type="button"
          className="intake-btn"
          onClick={onClose}
          aria-label="Close assessment"
        >
          Close assessment
        </button>
      </header>

      <div className="assess-loaded__summary">
        <RunSummaryStrip
          batchRun={syntheticBatchRun}
          onAnalyse={noop}
          onReRun={noop}
          disabled={true}
        />
      </div>

      <AssessTriageHeader
        search={triage.filters.search}
        onSearchChange={(value) => dispatch({ type: "SetSearch", value })}
        viewMode={triage.viewMode}
        onViewModeChange={(mode) => dispatch({ type: "SetViewMode", mode })}
        severityChips={sevChips}
        selectedSeverities={triage.filters.severities}
        onToggleSeverity={(chip) =>
          dispatch({ type: "ToggleSeverity", chip })
        }
        severityCounts={sevCounts}
        ruleIds={ruleIds}
        selectedRuleIds={triage.filters.ruleIds}
        onToggleRuleId={(ruleId) =>
          dispatch({ type: "ToggleRuleId", ruleId })
        }
        ruleCounts={ruleCountsMap}
        onClearFilters={() => dispatch({ type: "ClearFilters" })}
        filtersActive={filtersActive}
        visibleDeviceCount={visible.length}
        totalDeviceCount={artifact.devices.length}
      />

      {artifact.devices.length === 0 ? (
        <div className="intake-muted assess-loaded__empty-devices">
          No devices in this batch run.
        </div>
      ) : visible.length === 0 ? (
        <div className="intake-muted assess-loaded__empty-devices">
          No devices match the current filters.
        </div>
      ) : triage.viewMode === "by_device" ? (
        <div className="assess-loaded__devices">
          {visible.map((v) => (
            <AssessDeviceSection
              key={v.identity.slice_id}
              device={v.device}
              identity={v.identity}
              visibleFindings={v.visibleFindings}
              expanded={isExpanded(v.identity.slice_id)}
              onToggleExpand={() => toggleExpanded(v.identity.slice_id)}
              filtersActive={filtersActive}
            />
          ))}
        </div>
      ) : (
        <div className="assess-loaded__severity-groups">
          {sevGroups.length === 0 ? (
            <div className="intake-muted assess-loaded__empty-devices">
              No findings match the current filters.
            </div>
          ) : (
            sevGroups.map((g) => (
              <AssessSeverityGroup key={g.severity} group={g} />
            ))
          )}
        </div>
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
// V1W-R adapter (preserved): BatchRunExport → synthetic BatchRun
// -----------------------------------------------------------------------------

function toBatchRun(artifact: BatchRunExport): BatchRun {
  const devices: ReadonlyArray<BatchRunDevice> = artifact.devices.map((d) =>
    toBatchRunDevice(d),
  );
  return {
    source: artifact.source,
    devices,
    summary: artifact.summary,
    status: artifact.batch_run_status,
    epoch: 0,
  };
}

function toBatchRunDevice(d: BatchRunExportDevice): BatchRunDevice {
  // Identity-only fields are copied straight across; the strip only
  // reads `summary` and `status`, but a stable per-device shape
  // keeps any future strip consumers honest.
  const _id = deviceIdentity(d);
  void _id;
  return {
    slice_id: d.slice_id,
    hostname_hint: d.hostname_hint,
    source_provenance: d.source_provenance,
    stage_status: d.stage_status,
    detection_result: null,
    selected_platform: d.selected_platform,
    is_manual_override: d.is_manual_override,
    device_model: null,
    receipt: null,
    validation_report: null,
    stage_error: d.stage_error,
  };
}
