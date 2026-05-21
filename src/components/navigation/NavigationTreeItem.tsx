/**
 * D3A — NavigationTreeItem component.
 *
 * A single row in the navigation tree. Renders:
 *   - 6 px status LED (color from child.state)
 *   - Expand/collapse caret (or hidden placeholder when leaf)
 *   - Optional kind icon
 *   - Label
 *   - Optional numeric badge
 *
 * Click on row activates; click on caret toggles expand (stops propagation).
 *
 * Obeys D3_NAV_SPEC §4 (context sidebar anatomy).
 */

import type { JSX, MouseEvent } from "react";
import type { CatalogueState, ChildKind, ModeChild } from "../../contracts/modeCatalogue";
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

const STATE_LED_CLASS: Record<CatalogueState, string> = {
  available: "nav-led--available",
  partial: "nav-led--partial",
  deferred: "nav-led--deferred",
  blocked: "nav-led--blocked",
};

function isExpandable(child: ModeChild): boolean {
  return child.children !== undefined && child.children.length > 0;
}

function rowClassName(child: ModeChild, isActive: boolean): string {
  const parts = ["nav-sidebar-row"];
  if (isActive) parts.push("nav-sidebar-row--active");
  if (child.state === "deferred") parts.push("nav-row--deferred");
  if (child.state === "blocked") parts.push("nav-row--blocked");
  return parts.join(" ");
}

function pickKind(kind: ChildKind): ChildKind {
  return kind;
}

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

  const handleToggleClick = (e: MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    onToggle(child.id);
  };

  const handleRowClick = (): void => {
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
      className={rowClassName(child, isActive)}
      role="treeitem"
      tabIndex={isActive ? 0 : -1}
      aria-selected={isActive}
      aria-expanded={expandable ? isExpanded : undefined}
      data-active={isActive ? "true" : undefined}
      data-kind={pickKind(child.kind)}
      data-state={child.state}
      data-testid={`nav-sidebar-row-${child.id}`}
      style={{ paddingLeft: `${paddingLeft}px` }}
      onClick={handleRowClick}
      title={title}
    >
      {/* Status LED */}
      <span className={`nav-led ${ledClass}`} aria-hidden="true" />

      {/* Expand caret or hidden placeholder (keeps labels aligned) */}
      {expandable ? (
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
      ) : (
        <span className="nav-tree-toggle nav-tree-toggle--placeholder" aria-hidden="true" />
      )}

      {/* Kind icon (when child carries one) */}
      {child.iconId && (
        <span className="nav-sidebar-row__icon" aria-hidden="true">
          <AnthIcon id={child.iconId} size="sm" />
        </span>
      )}

      {/* Label */}
      <span className="nav-sidebar-label">{child.label}</span>

      {/* Numeric badge */}
      {typeof child.badge === "number" && child.badge > 0 && (
        <span className="nav-sidebar-badge">{child.badge}</span>
      )}
    </div>
  );
}
