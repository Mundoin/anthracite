import type { JSX } from "react";
import { useState } from "react";
import { ModeWorkbenchShell } from "../../components/workbench/ModeWorkbenchShell";
import type { ModeTool } from "../../components/workbench/types";
import "./BuildMode.css";

export const BUILD_DEFAULT_TOOL_ID = "builder";

export const BUILD_TOOL_META = [
  { id: "builder", label: "Builder" },
  { id: "quick_tools", label: "Quick Tools" },
  { id: "p2p", label: "P2P" },
  { id: "compare", label: "Compare" },
  { id: "fabricator", label: "Fabricator" },
  { id: "deploy_rollback", label: "Deploy / Rollback" },
] as const;

export interface BuildModeProps {
  readonly activeToolId?: string;
  readonly onToolChange?: (toolId: string) => void;
}

export function BuildMode({ activeToolId, onToolChange }: BuildModeProps = {}): JSX.Element {
  const [internalActiveToolId, setInternalActiveToolId] = useState<string>(BUILD_DEFAULT_TOOL_ID);
  const isControlled = activeToolId !== undefined && onToolChange !== undefined;
  const resolvedActiveId = isControlled ? activeToolId : internalActiveToolId;
  const handleSelect = (id: string): void => {
    if (isControlled) onToolChange(id);
    else setInternalActiveToolId(id);
  };

  const tools: ModeTool[] = [
    {
      id: "builder",
      kind: "deferred",
      label: "Builder",
      description:
        "Multi-vendor blueprint engine — architect network configs once, render per-platform.",
      group: "primary",
      status: "deferred",
      role: "operator_choice",
      deferred: {
        reason:
          "Multi-vendor blueprint engine — two-pass pipeline: Discover (registry models frozen) → Render (vendor-specific CLI per platform). Blueprint declares AAA, routing, L2, VPN, security, hardening once; render emits per-device candidate config. No blueprint engine wired in this pass.",
        planned_inputs: [
          "Blueprint YAML (or visual editor)",
          "Target device list (platform auto-detected)",
          "Render options (passive / active / dry-run)",
          "Vendor pair",
          "Site / environment",
        ],
      },
    },
    {
      id: "quick_tools",
      kind: "deferred",
      label: "Quick Tools",
      description:
        "Pre-built templates and snippets for common hardening, AAA, QoS, and VPN patterns.",
      group: "primary",
      status: "deferred",
      role: "operator_choice",
      deferred: {
        reason:
          "Pre-built templates and snippets for common tasks — enable TACACS+, harden SSH, deploy QoS policy. Operator selects template, fills device-specific values, imports into blueprint. Speeds up common patterns. No template engine in this pass.",
        planned_controls: [
          "Template category (hardening / AAA / QoS / VPN)",
          "Device platform (vendor auto-filter)",
          "Variable overrides (hostname, community)",
          "Snippet import target",
        ],
      },
    },
    {
      id: "p2p",
      kind: "deferred",
      label: "P2P",
      description:
        "Peer-to-peer link builder — emit paired side-A / side-B candidate configs.",
      group: "primary",
      status: "deferred",
      role: "operator_choice",
      deferred: {
        reason:
          "Peer-to-peer link builder — emit paired side-A / side-B candidate config for a planned link. Pulls running configs from both sides and computes block-level diff. No generator in this pass.",
        planned_inputs: [
          "Side A device + interface",
          "Side B device + interface",
          "Addressing plan",
          "Routing protocol",
          "Vendor pair",
        ],
      },
    },
    {
      id: "compare",
      kind: "deferred",
      label: "Compare",
      description:
        "Structured diff: intended blueprint render vs running config. Block-level changes with severity ranking.",
      group: "validation",
      status: "deferred",
      role: "validation",
      deferred: {
        reason:
          "Structured diff: intended blueprint render vs running config. Block-level changes with severity ranking (critical / warn / info ordered). Vendor-aware normalization. No diff engine in this pass.",
        planned_controls: [
          "Intended source (blueprint render)",
          "Running source (live pull)",
          "Vendor-aware normalization",
          "Side-by-side diff view",
          "Ignore-list (comments / timestamps)",
        ],
      },
    },
    {
      id: "fabricator",
      kind: "deferred",
      label: "Fabricator",
      description:
        "Synthetic topology generator for scale testing — bypasses live transport.",
      group: "support",
      status: "deferred",
      role: "operator_choice",
      deferred: {
        reason:
          "Synthetic topology generator for scale testing — bypasses live transport, produces validated topology objects. Downstream pipeline cannot distinguish fabricated from live state. Dev-key gated in the old codebase; not wired here.",
        planned_controls: [
          "Scenario name (metro_core / branch_ring / etc.)",
          "Site count and device topology",
          "Fault injection (STP block / BGP loss / link down / CPU spike)",
          "License / dev key gate",
          "Synthetic badge",
        ],
      },
    },
    {
      id: "deploy_rollback",
      kind: "deferred",
      label: "Deploy / Rollback",
      description: "Deploy and rollback to live devices — intentionally blocked.",
      group: "support",
      status: "blocked",
      role: "operator_choice",
      deferred: {
        reason:
          "Deploy and rollback to live devices are intentionally blocked in this pass. Old foundation: pre-change snapshot → deploy → post-deploy verification → tiered rollback (native vendor rollback / negate inverse config / manual_only operator intervention). Future will require explicit operator confirmation, written rollback plan, dry-run preview, and per-device blast radius.",
        planned_controls: [
          "Dry-run preview",
          "Rollback plan (required)",
          "Operator confirmation gate",
          "Credential / session scope",
          "Per-device blast radius",
          "Change ticket ID (audit trail)",
        ],
      },
    },
  ];

  return (
    <div className="build-mode">
      <ModeWorkbenchShell
        model={{
          title: "Build",
          tagline:
            "Architect's Desk — multi-vendor blueprint engine + compare + deploy. Skeleton pass.",
          tools,
          active_id: resolvedActiveId,
          fallback_id: BUILD_DEFAULT_TOOL_ID,
        }}
        onSelectTool={handleSelect}
        noToolbar={isControlled}
      />
    </div>
  );
}
