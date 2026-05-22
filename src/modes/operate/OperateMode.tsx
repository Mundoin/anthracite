import type { JSX } from "react";
import { useState } from "react";
import { ModeWorkbenchShell } from "../../components/workbench/ModeWorkbenchShell";
import type { ModeTool } from "../../components/workbench/types";
import { OperateOverviewPanel } from "./OperateOverviewPanel";
import type { OperateOverviewInputs } from "./operateOverview";
import type { AssessmentReadiness } from "../../state/assessmentReadiness";
import { DashboardGrid } from "../../components/dashboard/DashboardGrid";
import type { DashboardCardContract } from "../../state/designHandoffContract";
import type { DashboardSpineBundle } from "../../components/dashboard/cardMetricResolver";
import "./OperateMode.css";

export const OPERATE_TOOL_META = [
  { id: "dashboard", label: "Dashboard" },
  { id: "live_overview", label: "Live Overview" },
  { id: "topology_operations", label: "Topology Operations" },
  { id: "polling_snmp", label: "Polling / SNMP" },
  { id: "baselines_drift", label: "Baselines / Drift" },
  { id: "sentinel", label: "Sentinel" },
  { id: "events", label: "Events" },
] as const;

export const OPERATE_DEFAULT_TOOL_ID = "dashboard";

export interface OperateModeProps {
  readonly operateOverviewInputs?: OperateOverviewInputs;
  readonly assessmentReadiness?: AssessmentReadiness;
  /** V1CG dashboard card contracts to render in the new primary tool. */
  readonly dashboardCards?: readonly DashboardCardContract[];
  /** Live spines for dashboard metric resolution. */
  readonly dashboardSpines?: DashboardSpineBundle;
  /** D3T-P2A — Controlled tool tabs hosted in AppShell subnav. */
  readonly activeToolId?: string;
  readonly onToolChange?: (toolId: string) => void;
}

export function OperateMode({
  operateOverviewInputs,
  assessmentReadiness,
  dashboardCards,
  dashboardSpines,
  activeToolId,
  onToolChange,
}: OperateModeProps): JSX.Element {
  const hasDashboard =
    dashboardCards !== undefined &&
    dashboardSpines !== undefined &&
    dashboardCards.length > 0;
  const defaultId = hasDashboard ? "dashboard" : "live_overview";
  const [internalActiveToolId, setInternalActiveToolId] = useState<string>(defaultId);
  const isControlled = activeToolId !== undefined && onToolChange !== undefined;
  const resolvedActiveId = isControlled ? activeToolId : internalActiveToolId;
  const handleSelect = (id: string): void => {
    if (isControlled) onToolChange(id);
    else setInternalActiveToolId(id);
  };

  const tools: ModeTool[] = [];

  if (hasDashboard) {
    tools.push({
      id: "dashboard",
      kind: "live",
      label: "Dashboard",
      description:
        "Operator dashboard cards from the V1CG design handoff contract. Live metrics from local App-owned spines.",
      group: "primary",
      status: "available",
      role: "engine_analysis",
      render: () => (
        <DashboardGrid cards={dashboardCards} spines={dashboardSpines} />
      ),
    });
  }

  tools.push(
    {
      id: "live_overview",
      kind: "live",
      label: "Live Overview",
      description:
        "Local War Room readiness — staged seeds, preview frontier, evidence/topology summary. No live polling.",
      group: "primary",
      status: "available",
      role: "engine_analysis",
      render: () => <OperateOverviewPanel inputs={operateOverviewInputs} readiness={assessmentReadiness} />,
    },
    {
      id: "topology_operations",
      kind: "deferred",
      label: "Topology Operations",
      description:
        "Operate-side overlays on the topology canvas — path-isolate, show-link, find-by-device, failure-domain.",
      group: "primary",
      status: "preview",
      role: "engine_analysis",
      deferred: {
        reason:
          "Operate-side overlays on the topology canvas — path-isolate, show-link, find-by-device, failure-domain. Ghost overlay (Alt) restores opacity for clarity. The current Topology mode already exposes a Graph / Map tool — visit it for the live graph today.",
        planned_controls: [
          "Path overlay",
          "Isolate / show / find",
          "Failure-domain overlay",
          "Ghost overlay toggle",
        ],
        route_hint: { label: "Topology → Graph / Map" },
      },
    },
    {
      id: "polling_snmp",
      kind: "deferred",
      label: "Polling / SNMP",
      description:
        "SNMP foundation — hardware inventory, runtime metrics, interface counters, uptime.",
      group: "discovery",
      status: "deferred",
      role: "live_collection",
      deferred: {
        reason:
          "SNMP foundation — hardware inventory (serial, model, firmware), runtime metrics (CPU, memory, temperature), interface counters, uptime. Old codebase uses PySNMP. No SNMP transport or polling engine wired in this pass.",
        planned_controls: [
          "SNMP version (v2c community / v3 credentials)",
          "Target devices",
          "Poll interval (default 60s)",
          "Metric scope (inventory / metrics / both)",
          "Counter set",
        ],
      },
    },
    {
      id: "baselines_drift",
      kind: "deferred",
      label: "Baselines / Drift",
      description:
        "Golden Baseline evaluation engine — resolves applicable profiles per device, evaluates collected metrics against declared expectations.",
      group: "validation",
      status: "deferred",
      role: "validation",
      deferred: {
        reason:
          "Golden Baseline evaluation engine — resolves applicable profiles per device, evaluates collected metrics against declared expectations, emits BaselineFindings. Pure function, deterministic. No baseline engine in this pass.",
        planned_controls: [
          "Baseline profile (existing or new)",
          "Target device or role",
          "Config drift",
          "State drift",
          "Compliance drift",
          "Drift line per device",
        ],
      },
    },
    {
      id: "sentinel",
      kind: "deferred",
      label: "Sentinel",
      description:
        "Real-time alerting — CPU spike, link flap, configuration change, drift detected.",
      group: "support",
      status: "deferred",
      role: "engine_analysis",
      deferred: {
        reason:
          "Real-time alerting — CPU spike, link flap, configuration change, drift detected. Operator configures thresholds per metric. Old codebase: Sentinel feeds events to Operate canvas and Diagnose cases. No Sentinel engine; no breach detection shipped here.",
        planned_controls: [
          "Breach overlay",
          "Hotspot overlay",
          "Capacity state",
          "Blast-radius framing",
          "Alert rule (metric, threshold, severity)",
        ],
      },
    },
    {
      id: "events",
      kind: "deferred",
      label: "Events",
      description:
        "Time-ordered event log: sentinel alerts, config-change events, collection status changes.",
      group: "support",
      status: "preview",
      role: "engine_analysis",
      deferred: {
        reason:
          "Time-ordered event log: sentinel alerts, config-change events, collection status changes. Time-machine replays topology at any logged timestamp. No event source wired in this pass.",
        planned_controls: [
          "Time window (last hour / day / week)",
          "Severity filter (critical / warn / info)",
          "Source filter (device, sentinel, config-change)",
          "Event type filter (CPU, interface, config, discovery)",
        ],
      },
    },
  );

  return (
    <div className="operate-mode">
      <ModeWorkbenchShell
        model={{
          title: "Operate",
          tagline: "War Room — live operations workbench. Skeleton pass.",
          tools,
          active_id: resolvedActiveId,
          fallback_id: defaultId,
        }}
        onSelectTool={handleSelect}
        noToolbar={isControlled}
      />
    </div>
  );
}
