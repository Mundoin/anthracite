/**
 * D3A — NavigationTreeItem component.
 *
 * A single row in the navigation tree. Renders:
 *   - 6px status LED (color from child.state)
 *   - Expand/collapse caret (if child has children)
 *   - Icon (if child.iconId is present)
 *   - Label (with styling for deferred/blocked states)
 *   - Optional numeric badge
 *
 * Click on row activates; click on caret toggles expand (stops propagation).
 *
 * Obeys D3_NAV_SPEC §4 (context sidebar).
 */

import type { JSX } from "react";
import type { ModeChild } from "../../contracts/modeCatalogue";
import { AnthIcon } from "../icons/AnthIcon";

export interface NavigationTreeItemProps {
  /** The child node to render. */
  readonly child: ModeChild;
  /** Depth level (1 = top-level, 2 = nested). Controls indentation. */
  readonly depth: number;
  /** Whether this row is the currently active child. */
  readonly isActive: boolean;
  /** Whether this row's children are expanded (only meaningful if expandable). */
  readonly isExpanded: boolean;
  /** Called when the row is clicked to activate this child. */
  readonly onActivate: (childId: string) => void;
  /** Called when the caret is clicked to toggle expand. */
  readonly onToggle: (childId: string) => void;
}

const STATE_LED_CLASS: Record<string, string> = {
  available: "nav-led--available",
  partial: "nav-led--partial",
  deferred: "nav-led--deferred",
  blocked: "nav-led--blocked",
};

const isExpandable = (child: ModeChild): boolean => {
  return child.children !== undefined && child.children.length > 0;
};

export function NavigationTreeItem({
  child,
  depth,
  isActive,
  isExpanded,
  onActivate,
  onToggle,
}: NavigationTreeItemProps): JSX.Element {
  const expandable = isExpandable(child);
  const paddingLeft = 12 + (depth - 1) * 16;
  const ledClass = STATE_LED_CLASS[child.state];
  const rowClass = `nav-sidebar-row ${isActive ? "nav-sidebar-row--active" : ""} ${
    child.state === "deferred" ? "nav-row--deferred" : ""
  } ${child.state === "blocked" ? "nav-row--blocked" : ""}`.trim();

  const handleToggleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onToggle(child.id);
  };

  const handleRowClick = () => {
    onActivate(child.id);
  };

  const title =
    child.state === "deferred"
      ? child.deferredReason
      : child.state === "blocked"
        ? child.blockedReason
        : undefined;

  return (
    <div
      className={rowClass}
      role="treeitem"
      tabIndex={isActive ? 0 : -1}
      aria-selected={isActive}
      aria-expanded={expandable ? isExpanded : undefined}
      data-active={isActive ? "true" : undefined}
      data-testid={`nav-sidebar-row-${child.id}`}
      style={{ paddingLeft: `${paddingLeft}px` }}
      onClick={handleRowClick}
      title={title}
    >
      {/* Status LED */}
      <div className={`nav-led ${ledClass}`} aria-hidden="true" />

      {/* Expand/collapse caret */}
      {expandable && (
        <button
          type="button"
          className="nav-tree-toggle"
          onClick={handleToggleClick}
          aria-label={isExpanded ? "Collapse" : "Expand"}
          data-testid={`nav-tree-toggle-${child.id}`}
          tabIndex={-1}
        >
          <AnthIcon
            id={isExpanded ? "nav-caret-down" : "nav-caret-right"}
            size="sm"
          />
        </button>
      )}

      {/* Icon (if present) */}
      {child.iconId && <AnthIcon id={child.iconId} size="sm" />}

      {/* Label */}
      <span className="nav-sidebar-label">{child.label}</span>

      {/* Badge (if present) */}
      {typeof child.badge === "number" && child.badge > 0 && (
        <span className="nav-sidebar-badge">{child.badge}</span>
      )}
    </div>
  );
}
