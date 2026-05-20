/**
 * V1BM — HierarchyMode workbench.
 *
 * Exposes three tools:
 *   - Inventory (live, default): InventoryBrowser — list and detail devices
 *   - Coverage Map (live, preview): CoverageMapPanel — validation overlay
 *   - Inventory Diff (deferred): snapshot comparison (awaiting persistence layer)
 *
 * Wraps in ModeWorkbenchShell for consistent tool rail + tab switching.
 */

import { useState, type ReactNode } from "react";
import "./HierarchyMode.css";
import type { DiscoverySourceView } from "../../data/discoverySource";
import type { WorkbenchIntakeSummary } from "../../state/workbenchContextSummary";
import { InventoryBrowser } from "./InventoryBrowser";
import { CoverageMapPanel } from "./CoverageMapPanel";
import { ModeWorkbenchShell } from "../../components/workbench/ModeWorkbenchShell";
import type { ModeTool } from "../../components/workbench/types";

export interface HierarchyModeProps {
  discovery: DiscoverySourceView;
  intakeSummary?: WorkbenchIntakeSummary;
}

export function HierarchyMode({ discovery, intakeSummary }: HierarchyModeProps): JSX.Element {
  const [activeToolId, setActiveToolId] = useState<string>("inventory");

  const renderInventory = (): ReactNode => (
    <InventoryBrowser discovery={discovery} />
  );

  const renderCoverageMap = (): ReactNode => (
    <CoverageMapPanel discovery={discovery} intakeSummary={intakeSummary} />
  );

  const tools: ModeTool[] = [
    {
      id: "inventory",
      kind: "live",
      label: "Inventory",
      description: "Browse device records by environment, list and detail views.",
      group: "primary",
      status: "available",
      role: "engine_analysis",
      render: renderInventory,
    },
    {
      id: "coverage_map",
      kind: "live",
      label: "Coverage Map",
      description: "Validate device coverage across facts, layers, and vendor families.",
      group: "validation",
      status: "preview",
      role: "validation",
      render: renderCoverageMap,
    },
    {
      id: "inventory_diff",
      kind: "deferred",
      label: "Inventory Diff",
      description:
        "Compare device snapshots from different discovery runs to surface adds, removals, and field changes.",
      group: "support",
      status: "deferred",
      role: "engine_analysis",
      deferred: {
        reason:
          "No persisted snapshot store exists yet. Anthracite will not invent inventory deltas — once snapshots are saved per discovery run, this tool will diff a chosen baseline against a chosen comparison without any device contact.",
        planned_controls: [
          "Baseline snapshot",
          "Comparison snapshot",
          "Added devices",
          "Removed devices",
          "Changed fields",
        ],
      },
    },
  ];

  return (
    <div className="hierarchy-mode">
      <ModeWorkbenchShell
        model={{
          title: "Hierarchy",
          tagline: `Scope: ${discovery.environmentId ?? "All environments"}`,
          tools,
          active_id: activeToolId,
          fallback_id: "inventory",
        }}
        onSelectTool={setActiveToolId}
      />
    </div>
  );
}
