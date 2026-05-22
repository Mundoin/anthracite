/**
 * D3C — Visible-row flattening for the ContextSidebar tree.
 *
 * Walks the sidebar sections + recursive children in render order,
 * skipping collapsed branches, so the keyboard handler can move
 * focus across rows by index.
 *
 * Pure. No React. No I/O.
 */

import type { ModeChild } from "../../contracts/modeCatalogue";
import {
  groupChildrenForSidebar,
  type SidebarSection,
} from "../../contracts/modeCatalogue";

export interface VisibleRow {
  readonly child: ModeChild;
  readonly depth: number;             // 1 = top-level, 2 = nested
  readonly parentPath: readonly string[];
  readonly path: readonly string[];   // parentPath + [child.id]
  readonly sectionKey: SidebarSection["key"];
  readonly expandable: boolean;
  readonly expanded: boolean;         // expandable AND openIds.has(child.id)
}

function walk(
  children: readonly ModeChild[],
  openIds: ReadonlySet<string>,
  depth: number,
  parentPath: readonly string[],
  sectionKey: SidebarSection["key"],
  out: VisibleRow[],
): void {
  for (const child of children) {
    const path = [...parentPath, child.id];
    const expandable = child.children !== undefined && child.children.length > 0;
    const expanded = expandable && openIds.has(child.id);
    out.push({
      child,
      depth,
      parentPath,
      path,
      sectionKey,
      expandable,
      expanded,
    });
    if (expanded && child.children) {
      walk(child.children, openIds, depth + 1, path, sectionKey, out);
    }
  }
}

/**
 * Flatten the children for a mode into the ordered list of rows the
 * ContextSidebar renders, respecting kind sections and openIds.
 *
 * Rows are emitted section-by-section (workflows → tools → surfaces →
 * groups → deferred → blocked), matching what the renderer produces.
 */
export function flattenVisibleRows(
  modeChildren: readonly ModeChild[],
  openIds: ReadonlySet<string>,
): readonly VisibleRow[] {
  const sections = groupChildrenForSidebar(modeChildren);
  const out: VisibleRow[] = [];
  for (const section of sections) {
    walk(section.entries, openIds, 1, [], section.key, out);
  }
  return out;
}

/** Locate a row by full path. Returns the index or -1. */
export function findRowIndex(
  rows: readonly VisibleRow[],
  path: readonly string[],
): number {
  for (let i = 0; i < rows.length; i += 1) {
    const rowPath = rows[i].path;
    if (rowPath.length !== path.length) continue;
    let same = true;
    for (let j = 0; j < rowPath.length; j += 1) {
      if (rowPath[j] !== path[j]) {
        same = false;
        break;
      }
    }
    if (same) return i;
  }
  return -1;
}
