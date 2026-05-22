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
 * D3C — Keyboard:
 *   ↑/↓    walk visible rows
 *   Home   jump to first row
 *   End    jump to last row
 *   →      expand if collapsed; descend into first child if expanded
 *   ←      collapse if expanded; ascend to parent; from depth-1
 *          with no expansion, request rail focus (onRequestRailFocus)
 *   Space  toggle expandable node; otherwise activate
 *   Enter  activate row
 *   Esc    request rail focus
 *
 * Obeys D3_NAV_SPEC §4 + §6.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
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
import { flattenVisibleRows, findRowIndex, type VisibleRow } from "./visibleRows";
import "./ContextSidebar.css";

export interface ContextSidebarProps {
  readonly catalogue: ModeCatalogue;
  readonly activeMode: string;
  readonly activeChildPath: readonly string[];
  readonly openIds: ReadonlySet<string>;
  readonly onActivateChild: (path: readonly string[]) => void;
  readonly onToggleNode: (nodeId: string) => void;
  /** D3C — invoked when Left from depth-1 or Esc requests rail focus. */
  readonly onRequestRailFocus?: () => void;
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

const EMPTY_CHILDREN: readonly ModeChild[] = [];

export function ContextSidebar({
  catalogue,
  activeMode,
  activeChildPath,
  openIds,
  onActivateChild,
  onToggleNode,
  onRequestRailFocus,
}: ContextSidebarProps): JSX.Element | null {
  const mode = findModeEntry(catalogue, activeMode);

  const children = mode ? getModeChildren(catalogue, activeMode) : EMPTY_CHILDREN;
  const sections = useMemo(
    () => (mode ? groupChildrenForSidebar(children) : []),
    [mode, children],
  );
  const visibleRows = useMemo<readonly VisibleRow[]>(
    () => (mode ? flattenVisibleRows(children, openIds) : []),
    [mode, children, openIds],
  );
  const counts = useMemo(() => countDescendants(children), [children]);

  // Focused row state — defaults to active path or first row when sidebar opens.
  const [focusedPath, setFocusedPath] = useState<readonly string[]>(() => {
    if (activeChildPath.length > 0) return activeChildPath;
    return visibleRows.length > 0 ? visibleRows[0].path : [];
  });

  // When the mode changes, reset focus to active child or first visible row.
  // Guard against same-value updates to prevent re-render loops when callers
  // pass new array literals every render (e.g. activeChildPath={[]}).
  useEffect(() => {
    const nextPath: readonly string[] =
      activeChildPath.length > 0
        ? activeChildPath
        : visibleRows.length > 0
          ? visibleRows[0].path
          : [];
    setFocusedPath((prior) => {
      if (prior.length === nextPath.length) {
        let same = true;
        for (let i = 0; i < prior.length; i += 1) {
          if (prior[i] !== nextPath[i]) {
            same = false;
            break;
          }
        }
        if (same) return prior;
      }
      return nextPath;
    });
  }, [activeMode, activeChildPath, visibleRows]);

  const moveFocus = useCallback(
    (delta: number): void => {
      if (visibleRows.length === 0) return;
      const currentIdx = focusedPath.length === 0
        ? -1
        : findRowIndex(visibleRows, focusedPath);
      const startIdx = currentIdx === -1 ? 0 : currentIdx;
      const nextIdx = (startIdx + delta + visibleRows.length) % visibleRows.length;
      setFocusedPath(visibleRows[nextIdx].path);
    },
    [visibleRows, focusedPath],
  );

  const jumpFocus = useCallback(
    (where: "first" | "last"): void => {
      if (visibleRows.length === 0) return;
      const row = where === "first" ? visibleRows[0] : visibleRows[visibleRows.length - 1];
      setFocusedPath(row.path);
    },
    [visibleRows],
  );

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>): void => {
      if (visibleRows.length === 0 && e.key !== "Escape") return;

      const currentIdx = findRowIndex(visibleRows, focusedPath);
      const row = currentIdx >= 0 ? visibleRows[currentIdx] : undefined;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          moveFocus(1);
          return;
        case "ArrowUp":
          e.preventDefault();
          moveFocus(-1);
          return;
        case "Home":
          e.preventDefault();
          jumpFocus("first");
          return;
        case "End":
          e.preventDefault();
          jumpFocus("last");
          return;
        case "ArrowRight":
          if (!row) return;
          e.preventDefault();
          if (row.expandable && !row.expanded) {
            onToggleNode(row.child.id);
          } else if (row.expandable && row.expanded) {
            // Descend to first child if any
            const nextIdx = currentIdx + 1;
            if (nextIdx < visibleRows.length && visibleRows[nextIdx].depth > row.depth) {
              setFocusedPath(visibleRows[nextIdx].path);
            }
          }
          return;
        case "ArrowLeft":
          if (!row) {
            onRequestRailFocus?.();
            return;
          }
          e.preventDefault();
          if (row.expandable && row.expanded) {
            onToggleNode(row.child.id);
          } else if (row.depth > 1 && row.parentPath.length > 0) {
            setFocusedPath(row.parentPath);
          } else {
            onRequestRailFocus?.();
          }
          return;
        case " ":
          if (!row) return;
          e.preventDefault();
          if (row.expandable) {
            onToggleNode(row.child.id);
          } else {
            onActivateChild(row.path);
          }
          return;
        case "Enter":
          if (!row) return;
          e.preventDefault();
          onActivateChild(row.path);
          return;
        case "Escape":
          e.preventDefault();
          onRequestRailFocus?.();
          return;
        default:
          return;
      }
    },
    [visibleRows, focusedPath, moveFocus, jumpFocus, onToggleNode, onActivateChild, onRequestRailFocus],
  );

  if (!mode) return null;

  return (
    <div
      className="nav-sidebar"
      data-testid="nav-sidebar"
      onKeyDown={handleKeyDown}
    >
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
                focusedPath={focusedPath}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
