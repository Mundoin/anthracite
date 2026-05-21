/**
 * D3A — NavigationTree component.
 *
 * Recursive tree root. Renders a list of children and recursively renders
 * their own children when expanded.
 *
 * Props:
 *   - children: the set of ModeChild nodes to render at this level.
 *   - activeChildPath: the full path to the currently active node
 *     (e.g., ["prov-reconcile", "prov-reconcile-device"]).
 *   - openIds: the set of node ids that are currently expanded.
 *   - onActivate: callback with the full path from mode root.
 *   - onToggle: callback with a node id to toggle expand.
 *   - depth: current depth (1 = root, 2 = children, etc.).
 *   - parentPath: the path from mode root to this level.
 *
 * Active detection: a child is active when activeChildPath matches the
 * full path (parentPath + [child.id]).
 *
 * Obeys D3_NAV_SPEC §4 (context sidebar) + §11 (component split).
 */

import type { JSX } from "react";
import type { ModeChild } from "../../contracts/modeCatalogue";
import { NavigationTreeItem } from "./NavigationTreeItem";

export interface NavigationTreeProps {
  /** The children to render at this level. */
  readonly children: readonly ModeChild[];
  /** The full path to the currently active child. */
  readonly activeChildPath: readonly string[];
  /** The set of node ids that are expanded. */
  readonly openIds: ReadonlySet<string>;
  /** Called when a row is clicked to activate. Receives the full path. */
  readonly onActivate: (path: readonly string[]) => void;
  /** Called when a caret is clicked to toggle. Receives the node id. */
  readonly onToggle: (nodeId: string) => void;
  /** Current depth (default: 1). */
  readonly depth?: number;
  /** The path from mode root to this level (default: []). */
  readonly parentPath?: readonly string[];
}

/**
 * Check if a node is active given a full active path and its position.
 *
 * @param activeChildPath The full active path (e.g., ["a", "b", "c"]).
 * @param parentPath The path up to this level (e.g., ["a"]).
 * @param childId The id of the current child (e.g., "b").
 * @returns true if this child is on the active path.
 */
function isPathActive(
  activeChildPath: readonly string[],
  parentPath: readonly string[],
  childId: string,
): boolean {
  const fullPath = [...parentPath, childId];
  // Active if the active path starts with our full path.
  if (fullPath.length > activeChildPath.length) {
    return false;
  }
  for (let i = 0; i < fullPath.length; i++) {
    if (fullPath[i] !== activeChildPath[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Check if this child should have its children rendered (recursively).
 * This is true when the child id is in openIds.
 */
function isExpandable(child: ModeChild): boolean {
  return child.children !== undefined && child.children.length > 0;
}

export function NavigationTree({
  children,
  activeChildPath,
  openIds,
  onActivate,
  onToggle,
  depth = 1,
  parentPath = [],
}: NavigationTreeProps): JSX.Element {
  const role = depth === 1 ? "tree" : "group";
  const className = depth === 1 ? "nav-tree" : "nav-tree nav-tree--nested";

  return (
    <div role={role} className={className}>
      {children.map((child) => {
        const fullPath = [...parentPath, child.id];
        const isActive = isPathActive(activeChildPath, parentPath, child.id);
        const isExpanded = openIds.has(child.id);
        const expandable = isExpandable(child);

        return (
          <div key={child.id} className="nav-tree-item-wrapper">
            <NavigationTreeItem
              child={child}
              depth={depth}
              isActive={isActive}
              isExpanded={isExpanded && expandable}
              onActivate={() => onActivate(fullPath)}
              onToggle={onToggle}
            />

            {/* Recursively render children if expandable and open */}
            {expandable && isExpanded && child.children && (
              <NavigationTree
                children={child.children}
                activeChildPath={activeChildPath}
                openIds={openIds}
                onActivate={onActivate}
                onToggle={onToggle}
                depth={depth + 1}
                parentPath={fullPath}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
