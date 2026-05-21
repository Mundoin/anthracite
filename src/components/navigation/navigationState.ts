/**
 * D3A — Navigation state reducer + types.
 *
 * Pure reducer for sidebar navigation state:
 *   - activeMode: current mode id
 *   - activeChildPath: path to active child (resets when mode changes)
 *   - sidebarOpenIds: which tree nodes are expanded
 *   - railCollapsed: whether the mode rail is collapsed
 *
 * Obeys D3_NAV_SPEC §4 (context sidebar) + §6 (keyboard).
 */

export interface NavigationState {
  readonly activeMode: string;
  readonly activeChildPath: readonly string[];
  readonly sidebarOpenIds: ReadonlySet<string>;
  readonly railCollapsed: boolean;
}

export type NavigationAction =
  | { type: "set-mode"; modeId: string }
  | { type: "set-child"; modeId: string; childPath: readonly string[] }
  | { type: "toggle-node"; nodeId: string }
  | { type: "expand-node"; nodeId: string }
  | { type: "collapse-node"; nodeId: string }
  | { type: "set-rail-collapsed"; collapsed: boolean };

/**
 * Create the initial navigation state for a given mode.
 *
 * @param modeId The initial active mode id.
 * @returns A new NavigationState with activeMode set and all other fields empty/false.
 */
export function createInitialNavigationState(modeId: string): NavigationState {
  return {
    activeMode: modeId,
    activeChildPath: [],
    sidebarOpenIds: new Set(),
    railCollapsed: false,
  };
}

/**
 * Pure reducer for navigation state. Returns a new state only when changed;
 * returns the same object (identity-stable) if no change occurs.
 *
 * Rules:
 *   - set-mode: changes activeMode, resets activeChildPath to [].
 *   - set-child: sets activeChildPath only if modeId matches current activeMode.
 *   - toggle-node: adds nodeId to sidebarOpenIds if absent, removes if present.
 *   - expand-node: adds nodeId to sidebarOpenIds (idempotent).
 *   - collapse-node: removes nodeId from sidebarOpenIds (idempotent).
 *   - set-rail-collapsed: sets the railCollapsed boolean.
 *
 * @param state The current navigation state.
 * @param action The action to dispatch.
 * @returns A new NavigationState if changed; the same state if unchanged.
 */
export function navigationReducer(
  state: NavigationState,
  action: NavigationAction,
): NavigationState {
  switch (action.type) {
    case "set-mode": {
      if (state.activeMode === action.modeId && state.activeChildPath.length === 0) {
        return state; // no change
      }
      return {
        activeMode: action.modeId,
        activeChildPath: [],
        sidebarOpenIds: state.sidebarOpenIds,
        railCollapsed: state.railCollapsed,
      };
    }

    case "set-child": {
      // Only set if the mode matches the current active mode.
      if (action.modeId !== state.activeMode) {
        return state; // no change
      }
      // Check if path is the same (by comparison, not reference).
      if (pathsEqual(state.activeChildPath, action.childPath)) {
        return state; // no change
      }
      return {
        activeMode: state.activeMode,
        activeChildPath: action.childPath,
        sidebarOpenIds: state.sidebarOpenIds,
        railCollapsed: state.railCollapsed,
      };
    }

    case "toggle-node": {
      const newOpen = new Set(state.sidebarOpenIds);
      if (newOpen.has(action.nodeId)) {
        newOpen.delete(action.nodeId);
      } else {
        newOpen.add(action.nodeId);
      }
      // Check if the set actually changed.
      if (setsEqual(state.sidebarOpenIds, newOpen)) {
        return state; // no change
      }
      return {
        activeMode: state.activeMode,
        activeChildPath: state.activeChildPath,
        sidebarOpenIds: newOpen,
        railCollapsed: state.railCollapsed,
      };
    }

    case "expand-node": {
      if (state.sidebarOpenIds.has(action.nodeId)) {
        return state; // already open, no change
      }
      const newOpen = new Set(state.sidebarOpenIds);
      newOpen.add(action.nodeId);
      return {
        activeMode: state.activeMode,
        activeChildPath: state.activeChildPath,
        sidebarOpenIds: newOpen,
        railCollapsed: state.railCollapsed,
      };
    }

    case "collapse-node": {
      if (!state.sidebarOpenIds.has(action.nodeId)) {
        return state; // already closed, no change
      }
      const newOpen = new Set(state.sidebarOpenIds);
      newOpen.delete(action.nodeId);
      return {
        activeMode: state.activeMode,
        activeChildPath: state.activeChildPath,
        sidebarOpenIds: newOpen,
        railCollapsed: state.railCollapsed,
      };
    }

    case "set-rail-collapsed": {
      if (state.railCollapsed === action.collapsed) {
        return state; // no change
      }
      return {
        activeMode: state.activeMode,
        activeChildPath: state.activeChildPath,
        sidebarOpenIds: state.sidebarOpenIds,
        railCollapsed: action.collapsed,
      };
    }

    default:
      return state;
  }
}

/**
 * Compare two path arrays for equality.
 */
function pathsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Compare two ReadonlySet<string> for equality.
 */
function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}
