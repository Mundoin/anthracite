/**
 * D3A — NavigationTree component.
 *
 * Recursive tree root. Renders a list of children and recursively renders
 * their own children when expanded.
 *
 * D3C: threads `focusedPath` so the focused row gets DOM focus via the
 * roving tabIndex pattern.
 *
 * Obeys D3_NAV_SPEC §4 + §6 (keyboard).
 */

import type { JSX } from "react";
import type { ModeChild } from "../../contracts/modeCatalogue";
import { NavigationTreeItem } from "./NavigationTreeItem";

export interface NavigationTreeProps {
  readonly children: readonly ModeChild[];
  readonly activeChildPath: readonly string[];
  readonly openIds: ReadonlySet<string>;
  readonly onActivate: (path: readonly string[]) => void;
  readonly onToggle: (nodeId: string) => void;
  readonly depth?: number;
  readonly parentPath?: readonly string[];
  /** D3C — path to the row that currently owns sidebar focus. Empty = none. */
  readonly focusedPath?: readonly string[];
}

function isPathActive(
  activeChildPath: readonly string[],
  parentPath: readonly string[],
  childId: string,
): boolean {
  const fullPath = [...parentPath, childId];
  if (fullPath.length > activeChildPath.length) {
    return false;
  }
  for (let i = 0; i < fullPath.length; i += 1) {
    if (fullPath[i] !== activeChildPath[i]) {
      return false;
    }
  }
  return true;
}

function isPathExact(
  pathA: readonly string[],
  pathB: readonly string[],
): boolean {
  if (pathA.length !== pathB.length) return false;
  for (let i = 0; i < pathA.length; i += 1) {
    if (pathA[i] !== pathB[i]) return false;
  }
  return true;
}

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
  focusedPath = [],
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
        const isFocused = isPathExact(focusedPath, fullPath);

        return (
          <div key={child.id} className="nav-tree-item-wrapper">
            <NavigationTreeItem
              child={child}
              depth={depth}
              isActive={isActive}
              isExpanded={isExpanded && expandable}
              isFocused={isFocused}
              onActivate={() => onActivate(fullPath)}
              onToggle={onToggle}
            />

            {expandable && isExpanded && child.children && (
              <NavigationTree
                children={child.children}
                activeChildPath={activeChildPath}
                openIds={openIds}
                onActivate={onActivate}
                onToggle={onToggle}
                depth={depth + 1}
                parentPath={fullPath}
                focusedPath={focusedPath}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
