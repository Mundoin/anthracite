/**
 * D3A — ContextSidebar component.
 *
 * Top-level sidebar that renders the active mode's children organized
 * by kind (workflows, tools, surfaces, groups, deferred, blocked).
 *
 * Structure:
 *   - Header: mode icon + label + state chip + item count
 *   - Body: kind sections, each with NavigationTree
 *   - Empty state: when mode has no children
 *
 * Obeys D3_NAV_SPEC §4 (context sidebar) + §11 (component split).
 */

import type { JSX } from "react";
import type { ModeCatalogue } from "../../contracts/modeCatalogue";
import {
  findModeEntry,
  getModeChildren,
  groupChildrenForSidebar,
} from "../../contracts/modeCatalogue";
import { AnthIcon } from "../icons/AnthIcon";
import { NavigationTree } from "./NavigationTree";
import type { CatalogueState } from "../../contracts/modeCatalogue";

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

/**
 * Get a human-readable state label for the header chip.
 */
function getStateLabel(state: CatalogueState): string {
  switch (state) {
    case "available":
      return "Available";
    case "partial":
      return "Partial";
    case "deferred":
      return "Deferred";
    case "blocked":
      return "Blocked";
    default:
      return "";
  }
}

/**
 * Compute the total count of items in the mode (including descendants).
 */
function computeItemCount(children: readonly any[]): number {
  let count = 0;
  const walk = (c: readonly any[]) => {
    for (const item of c) {
      count += 1;
      if (item.children) {
        walk(item.children);
      }
    }
  };
  walk(children);
  return count;
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
  const itemCount = computeItemCount(children);

  return (
    <div className="nav-sidebar" data-testid="nav-sidebar">
      {/* Header */}
      <div className="nav-sidebar__header">
        <AnthIcon id={mode.iconId} size="md" />
        <span className="nav-sidebar__title">{mode.label}</span>
        <span className={`nav-sidebar__state-chip nav-sidebar__state-chip--${mode.state}`}>
          {getStateLabel(mode.state)}
        </span>
        <span className="nav-sidebar__item-count">· {itemCount}</span>
      </div>

      {/* Body or empty state */}
      {children.length === 0 ? (
        <div className="nav-sidebar__empty" role="status">
          This mode has no sub-tools. Work happens directly in the canvas.
        </div>
      ) : (
        <div className="nav-sidebar__body">
          {sections.map((section) => (
            <div
              key={section.key}
              className="nav-sidebar__section"
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
