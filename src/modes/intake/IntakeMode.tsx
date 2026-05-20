/**
 * V1BN — IntakeMode workbench.
 *
 * Exposes five tools:
 *   - Single Config (live, default): IntakePanel — parse single device config
 *   - Archive Batch (deferred): batch parse flow
 *   - Platform Registry (deferred): vendor/platform coverage
 *   - Receipts / Export (deferred): parse receipt rendering and batch export
 *   - Parser Coverage (deferred): parser status projection
 *
 * Wraps in ModeWorkbenchShell for consistent tool rail + tab switching.
 */

import type { JSX, ReactNode } from "react";
import { useState } from "react";
import { ModeWorkbenchShell } from "../../components/workbench/ModeWorkbenchShell";
import type { ModeTool } from "../../components/workbench/types";
import { IntakePanel } from "./IntakePanel";
import "./IntakeMode.css";

export interface IntakeModeProps {
  readonly activeEnvironmentId?: string | null;
  readonly onDiscoveryImported?: () => void | Promise<void>;
}

export function IntakeMode({ activeEnvironmentId, onDiscoveryImported }: IntakeModeProps): JSX.Element {
  const [activeToolId, setActiveToolId] = useState<string>("single_config");

  const renderSingleConfig = (): ReactNode => (
    <IntakePanel
      activeEnvironmentId={activeEnvironmentId}
      onDiscoveryImported={onDiscoveryImported}
    />
  );

  const tools: ModeTool[] = [
    {
      id: "single_config",
      kind: "live",
      label: "Single Config",
      description: "Paste or open a single device config — detect platform, parse, project receipt, import to Discovery.",
      group: "primary",
      status: "available",
      role: "operator_choice",
      render: renderSingleConfig,
    },
    {
      id: "archive_batch",
      kind: "deferred",
      label: "Archive Batch",
      description: "Open an archive (zip/tar) of configs and run a batched parse + import flow.",
      group: "primary",
      status: "preview",
      role: "operator_choice",
      deferred: {
        reason: "Archive batch flow is presently embedded inside Single Config (open archive, batch run, export). The first pass surfaces it as a separate workbench tool route so future work can split the panel cleanly — for now, use the archive controls inside Single Config.",
        planned_controls: ["Open archive", "Batch run", "Export markdown / JSON", "Per-file receipts"],
        route_hint: { label: "Single Config → Open archive" },
      },
    },
    {
      id: "platform_registry",
      kind: "deferred",
      label: "Platform Registry",
      description: "Inspect registered platforms / vendor coverage already known to the frontend.",
      group: "validation",
      status: "preview",
      role: "validation",
      deferred: {
        reason: "Platform registry surface is not yet split out of Single Config. Manual platform override is currently exposed inside the Single Config detect/parse flow. No parser engine changes are made in this pass.",
        planned_controls: ["Vendor list", "Platform list", "Coverage badges", "Manual override default"],
        route_hint: { label: "Single Config → Detect / override" },
      },
    },
    {
      id: "receipts_export",
      kind: "deferred",
      label: "Receipts / Export",
      description: "Surface parse receipts and batch export controls (markdown / JSON copy and save).",
      group: "evidence",
      status: "preview",
      role: "evidence",
      deferred: {
        reason: "Receipt rendering and batch export controls live inside the existing Single Config flow today. A dedicated Receipts / Export tool will surface them centrally without changing how the underlying receipts are built. No new file-system behavior in this pass.",
        planned_controls: ["Per-device receipt", "Batch receipt", "Copy Markdown", "Copy JSON", "Save to file"],
        route_hint: { label: "Single Config → Receipt / Batch summary" },
      },
    },
    {
      id: "parser_coverage",
      kind: "deferred",
      label: "Parser Coverage",
      description: "Honest summary of parser / platform coverage already known to the frontend.",
      group: "validation",
      status: "preview",
      role: "validation",
      deferred: {
        reason: "No parser-coverage projection exists yet. Anthracite will not invent maturity claims — once a deterministic local projection over the vendor/platform registry is available, this tool will summarise per-platform parser status (supported / partial / unsupported) without touching the parser engine.",
        planned_controls: ["Per-vendor coverage", "Per-platform parser status", "Known limitations note"],
      },
    },
  ];

  return (
    <div className="intake-mode">
      <ModeWorkbenchShell
        model={{
          title: "Intake",
          tagline: "Parse configs, project receipts, import to Discovery — no device contact.",
          tools,
          active_id: activeToolId,
          fallback_id: "single_config",
        }}
        onSelectTool={setActiveToolId}
      />
    </div>
  );
}
