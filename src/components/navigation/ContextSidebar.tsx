/**
 * D3A — ContextSidebar component.
 *
 * Top-level sidebar that renders the active mode's children organized
 * by kind (workflows, tools, surfaces, groups, deferred, blocked).
 *
 * Structure:
 *   - Header: mode icon + label + state chip
 *   - Subheader: items count + propagated deferred/blocked counts
 *   - Body: kind sections, each with NavigationTree
 *   - Empty state: when mode has no children
 *
 * Obeys D3_NAV_SPEC §4 (context sidebar) + §11 (component split).
 */

import type { JSX } from "react";
import type {
  CatalogueState,
  ModeChild,
  ModeCatalogue,
} from "../../contracts/modeCatalogue";
import {
  findModeEntry,
  getModeChildren,
  groupChildrenForSidebar,
} from "../../contracts/modeCatalogue";
import { AnthIcon } from "../icons/AnthIcon";
import { NavigationTree } from "./NavigationTree";
import "./ContextSidebar.css";

export interface ContextSidebarProps {
  /** The mode catalogue (single source of truth). */
  readonly catalogue: ModeCatalogue;
  /** The currently active mode id. */
  readonly activeMode: string;
  /** The path to the currently active child (e.g., ["prov-reconcile", "prov-reconcile-device"]). */
  readonly activeChildPath: readonly string[];
  /** The set of expanded node ids in the tree. */
  readonly openIds: ReadonlySet<string>;
  /** Called when a child row is clicked to activate. Receives the full path. */
  readonly onActivateChild: (path: readonly string[]) => void;
  /** Called when a caret is clicked to toggle expand. */
  readonly onToggleNode: (nodeId: string) => void;
}

interface DescendantCounts {
  readonly total: number;
  readonly deferred: number;
  readonly blocked: number;
  readonly partial: number;
}

function countDescendants(children: readonly ModeChild[]): DescendantCounts {
  let total = 0;
  let deferred = 0;
  let blocked = 0;
  let partial = 0;
  const walk = (nodes: readonly ModeChild[]): void => {
    for (const node of nodes) {
      total += 1;
      if (node.state === "deferred") deferred += 1;
      else if (node.state === "blocked") blocked += 1;
      else if (node.state === "partial") partial += 1;
      if (node.children) walk(node.children);
    }
  };
  walk(children);
  return { total, deferred, blocked, partial };
}

function stateLabel(state: CatalogueState): string {
  switch (state) {
    case "available": return "Available";
    case "partial":   return "Partial";
    case "deferred":  return "Deferred";
    case "blocked":   return "Blocked";
  }
}

export function ContextSidebar({
  catalogue,
  activeMode,
  activeChildPath,
  openIds,
  onActivateChild,
  onToggleNode,
}: ContextSidebarProps): JSX.Element | null {
  const mode = findModeEntry(catalogue, activeMode);
  if (!mode) {
    return null;
  }

  const children = getModeChildren(catalogue, activeMode);
  const sections = groupChildrenForSidebar(children);
  const counts = countDescendants(children);

  return (
    <div className="nav-sidebar" data-testid="nav-sidebar">
      {/* Header — mode identity + state */}
      <div className="nav-sidebar__header">
        <span className="nav-sidebar__header-icon">
          <AnthIcon id={mode.iconId} size="md" />
        </span>
        <span className="nav-sidebar__title">{mode.label}</span>
        <span
          className={`nav-sidebar__state-chip nav-sidebar__state-chip--${mode.state}`}
        >
          {stateLabel(mode.state)}
        </span>
      </div>

      {/* Subheader — counts (only when children exist) */}
      {children.length > 0 && (
        <div className="nav-sidebar__subheader" aria-live="polite">
          <span className="nav-sidebar__count">
            <span className="nav-sidebar__count--em">{counts.total}</span> items
          </span>
          {counts.partial > 0 && (
            <>
              <span className="nav-sidebar__count-sep">·</span>
              <span className="nav-sidebar__count">{counts.partial} partial</span>
            </>
          )}
          {counts.deferred > 0 && (
            <>
              <span className="nav-sidebar__count-sep">·</span>
              <span className="nav-sidebar__count">{counts.deferred} deferred</span>
            </>
          )}
          {counts.blocked > 0 && (
            <>
              <span className="nav-sidebar__count-sep">·</span>
              <span className="nav-sidebar__count">{counts.blocked} blocked</span>
            </>
          )}
        </div>
      )}

      {/* Body or empty state */}
      {children.length === 0 ? (
        <div className="nav-sidebar__empty" role="status">
          <span className="nav-sidebar__empty-icon" aria-hidden="true">
            <AnthIcon id="status-info" size="md" />
          </span>
          <span className="nav-sidebar__empty-title">No sub-tools</span>
          <span className="nav-sidebar__empty-body">
            Work happens directly in the canvas for this mode.
          </span>
        </div>
      ) : (
        <div className="nav-sidebar__body">
          {sections.map((section) => (
            <div
              key={section.key}
              className={`nav-sidebar__section nav-sidebar__section--${section.key}`}
              data-testid={`nav-sidebar-section-${section.key}`}
            >
              <div className="nav-sidebar__section-heading">{section.heading}</div>
              <NavigationTree
                children={section.entries}
                activeChildPath={activeChildPath}
                openIds={openIds}
                onActivate={onActivateChild}
                onToggle={onToggleNode}
                depth={1}
                parentPath={[]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
