/**
 * V1BH — Mode Workbench Tool Architecture.
 *
 * Generic contract every mode workbench (Discovery, Topology, Diagnose,
 * Build…) consumes. Each mode declares a list of `ModeTool` entries and
 * hands them to <ModeWorkbenchShell />, which renders a tool rail + the
 * active tool's body. Lets a mode expose many tools without becoming a
 * single long page.
 *
 * No engine coupling. No data-fetching here. Pure UI contract.
 */

import type { ReactNode } from "react";

/** Operational state of a tool. */
export type ModeToolStatus =
  | "available" // ready to use, no deferral
  | "preview" // visible, partial/preview wiring
  | "deferred" // visible but not yet implemented; explains future scope
  | "blocked"; // disabled because of unmet prerequisite

/** Risk/role marker for a tool. Used by the rail to surface intent. */
export type ModeToolRole =
  | "neutral"
  | "engine_analysis"
  | "operator_choice"
  | "live_collection"
  | "evidence"
  | "validation";

/** Coarse grouping; rail can render groups as separators. */
export type ModeToolGroup =
  | "primary"
  | "discovery"
  | "evidence"
  | "validation"
  | "support";

/**
 * Tool entry. Discriminated by `kind`:
 * - `live`: render via the supplied component
 * - `deferred`: declarative deferred-state body (`reason` + optional planned controls)
 */
export type ModeTool =
  | {
      id: string;
      kind: "live";
      label: string;
      description: string;
      group: ModeToolGroup;
      status: ModeToolStatus;
      role?: ModeToolRole;
      badge?: number | string;
      render: () => ReactNode;
    }
  | {
      id: string;
      kind: "deferred";
      label: string;
      description: string;
      group: ModeToolGroup;
      status: ModeToolStatus;
      role?: ModeToolRole;
      badge?: number | string;
      deferred: {
        reason: string;
        planned_inputs?: ReadonlyArray<string>;
        planned_controls?: ReadonlyArray<string>;
        route_hint?: { label: string; href?: string };
      };
    };

export interface ModeWorkbenchModel {
  /** Localized title shown above the rail. */
  title: string;
  /** Optional one-line tagline beneath the title. */
  tagline?: string;
  /** Tools in display order. */
  tools: ReadonlyArray<ModeTool>;
  /** Currently active tool id. */
  active_id: string;
  /** Optional default if `active_id` is unknown. */
  fallback_id?: string;
}

/** Returns the active tool entry or the fallback. */
export function resolveActiveTool(
  model: ModeWorkbenchModel,
): ModeTool | undefined {
  const direct = model.tools.find((t) => t.id === model.active_id);
  if (direct) return direct;
  if (model.fallback_id) {
    return model.tools.find((t) => t.id === model.fallback_id);
  }
  return model.tools[0];
}

/** Maps status to a short uppercase chip label. */
export function statusChipLabel(status: ModeToolStatus): string {
  switch (status) {
    case "available":
      return "READY";
    case "preview":
      return "PREVIEW";
    case "deferred":
      return "DEFERRED";
    case "blocked":
      return "BLOCKED";
  }
}

/** Maps status to a CSS modifier suffix (ok/info/warn/idle). */
export function statusChipMod(status: ModeToolStatus): string {
  switch (status) {
    case "available":
      return "ok";
    case "preview":
      return "info";
    case "deferred":
      return "warn";
    case "blocked":
      return "idle";
  }
}
