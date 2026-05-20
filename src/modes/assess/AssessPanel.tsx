/**
 * V1W-R — ASSESS orchestrator panel.
 *
 * Owns the four-state reducer (empty / loading / loaded / error)
 * and dispatches to the FSA `loadBatchRunJson` helper. The picker
 * call lives at the panel level (not inside the reducer) — the
 * reducer remains pure.
 *
 * V1BJ: Wrapped in ModeWorkbenchShell with 5 tools (viewer live,
 * pipeline/compliance/report_export/evidence_receipts deferred).
 *
 * Tests inject the loader via `loader` prop so the FSA picker
 * never fires in unit tests.
 */

import { useCallback, useReducer, useState, type JSX, type ReactNode } from "react";
import { ModeWorkbenchShell } from "../../components/workbench/ModeWorkbenchShell";
import type { ModeTool } from "../../components/workbench/types";

import { AssessEmptyState } from "./components/AssessEmptyState";
import { AssessErrorView } from "./components/AssessErrorView";
import { AssessLoadedView } from "./components/AssessLoadedView";
import { AssessPipelinePlannerPanel } from "./AssessPipelinePlannerPanel";
import { assessReducer } from "./assessReducer";
import { initialAssessState } from "./assessTypes";
import { loadBatchRunJson, type LoadResult } from "./loadBatchRunJson";

import "./assess.css";

export interface AssessPanelProps {
  /** Injectable loader for tests. Defaults to the real FSA picker. */
  readonly loader?: () => Promise<LoadResult>;
}

export function AssessPanel({
  loader = loadBatchRunJson,
}: AssessPanelProps = {}): JSX.Element {
  const [state, dispatch] = useReducer(assessReducer, initialAssessState);
  const [activeToolId, setActiveToolId] = useState<string>("viewer");

  const runLoader = useCallback(async (): Promise<void> => {
    const result = await loader();
    if (result.kind === "cancelled") {
      dispatch({ type: "LoadCancelled" });
      return;
    }
    if (result.kind === "error") {
      dispatch({
        type: "LoadFailed",
        reason: result.reason,
        message: result.message,
      });
      return;
    }
    dispatch({
      type: "LoadSucceeded",
      artifact: result.artifact,
      filename: result.filename,
    });
  }, [loader]);

  const onOpen = useCallback((): void => {
    dispatch({ type: "OpenRequested" });
    void runLoader();
  }, [runLoader]);

  const onRetry = useCallback((): void => {
    dispatch({ type: "RetryRequested" });
    void runLoader();
  }, [runLoader]);

  const onClose = useCallback((): void => {
    dispatch({ type: "CloseRequested" });
  }, []);

  const renderViewer = (): ReactNode => (
    <>
      {state.kind === "empty" && <AssessEmptyState onOpen={onOpen} />}
      {state.kind === "loading" && (
        <AssessEmptyState onOpen={onOpen} disabled={true} />
      )}
      {state.kind === "loaded" && (
        <AssessLoadedView
          artifact={state.artifact}
          filename={state.filename}
          onClose={onClose}
        />
      )}
      {state.kind === "error" && (
        <AssessErrorView
          reason={state.reason}
          message={state.message}
          onRetry={onRetry}
          onClose={onClose}
        />
      )}
    </>
  );

  const tools: ReadonlyArray<ModeTool> = [
    {
      id: "viewer",
      kind: "live",
      label: "Assessment Viewer",
      description: "Inspect a loaded batch-run assessment with metadata, findings, and triage.",
      group: "primary",
      status: "available",
      role: "validation",
      render: renderViewer,
    },
    {
      id: "pipeline",
      kind: "live",
      label: "Run Pipeline",
      description: "Local assessment pipeline planner — Discovery → SNMP → Config Pull → Compliance → Topology → Anomaly → Report. No live execution.",
      group: "primary",
      status: "available",
      role: "validation",
      render: () => <AssessPipelinePlannerPanel />,
    },
    {
      id: "compliance",
      kind: "deferred",
      label: "Compliance",
      description: "Rule-pack run results filtered by severity, vendor, platform.",
      group: "validation",
      status: "preview",
      role: "validation",
      deferred: {
        reason: "Future compliance workbench: rule-pack run results filtered by severity, vendor, platform. Today's loaded assessment surfaces findings inside the Viewer tool.",
        planned_controls: [
          "Rule pack",
          "Severity filter",
          "Vendor / platform scope",
        ],
      },
    },
    {
      id: "report_export",
      kind: "deferred",
      label: "Report Export",
      description: "PDF export of executive summary, inventory, topology, findings, and recommendations.",
      group: "validation",
      status: "deferred",
      role: "validation",
      deferred: {
        reason: "Future PDF export of executive summary, inventory, topology map, findings, and recommendations. No PDF generator wired in this pass.",
        planned_controls: [
          "Executive summary",
          "Inventory section",
          "Topology map section",
          "Findings",
          "Recommendations",
          "PDF render",
        ],
      },
    },
    {
      id: "evidence_receipts",
      kind: "deferred",
      label: "Evidence / Receipts",
      description: "Receipt browser for assessment runs: metadata, rule-pack version, fixture hashes, run timestamps.",
      group: "evidence",
      status: "preview",
      role: "evidence",
      deferred: {
        reason: "Future receipt browser for assessment runs: input metadata, rule-pack version, fixture hashes, run timestamps. Today's metadata header surfaces the loaded run; receipt browsing across runs is deferred.",
        planned_controls: [
          "Assessment run list",
          "Metadata inspector",
          "Rule-pack version",
          "Fixture hash viewer",
          "Timestamp timeline",
        ],
      },
    },
  ];

  return (
    <div className="assess-root">
      <ModeWorkbenchShell
        model={{
          title: "Assess",
          tagline: "Load a batch run assessment and validate compliance.",
          tools,
          active_id: activeToolId,
          fallback_id: "viewer",
        }}
        onSelectTool={setActiveToolId}
      />
    </div>
  );
}
