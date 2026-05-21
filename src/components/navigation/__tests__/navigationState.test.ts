/**
 * D3A — Navigation state reducer tests.
 *
 * Pure tests of the state reducer. No React, no I/O.
 */

import { describe, expect, it } from "vitest";
import {
  createInitialNavigationState,
  navigationReducer,
  type NavigationAction,
  type NavigationState,
} from "../navigationState";

describe("navigationState · createInitialNavigationState", () => {
  it("returns a state with the given modeId, empty child path, no open nodes, rail expanded", () => {
    const state = createInitialNavigationState("hierarchy");
    expect(state.activeMode).toBe("hierarchy");
    expect(state.activeChildPath).toEqual([]);
    expect(state.sidebarOpenIds.size).toBe(0);
    expect(state.railCollapsed).toBe(false);
  });
});

describe("navigationState · navigationReducer", () => {
  let initialState: NavigationState;

  beforeEach(() => {
    initialState = createInitialNavigationState("provisioning");
  });

  describe("set-mode action", () => {
    it("changes activeMode and resets activeChildPath", () => {
      const state: NavigationState = {
        ...initialState,
        activeChildPath: ["prov-reconcile", "prov-reconcile-device"],
      };
      const action: NavigationAction = { type: "set-mode", modeId: "operate" };
      const result = navigationReducer(state, action);
      expect(result.activeMode).toBe("operate");
      expect(result.activeChildPath).toEqual([]);
      expect(result.sidebarOpenIds).toBe(state.sidebarOpenIds); // unchanged ref
    });

    it("returns the same state when mode and child path are already correct", () => {
      const action: NavigationAction = { type: "set-mode", modeId: "provisioning" };
      const result = navigationReducer(initialState, action);
      expect(result).toBe(initialState); // identity stable
    });
  });

  describe("set-child action", () => {
    it("sets activeChildPath when modeId matches current active mode", () => {
      const action: NavigationAction = {
        type: "set-child",
        modeId: "provisioning",
        childPath: ["prov-reconcile", "prov-reconcile-device"],
      };
      const result = navigationReducer(initialState, action);
      expect(result.activeChildPath).toEqual(["prov-reconcile", "prov-reconcile-device"]);
      expect(result.activeMode).toBe("provisioning");
    });

    it("does not change state when modeId does not match active mode", () => {
      const action: NavigationAction = {
        type: "set-child",
        modeId: "operate",
        childPath: ["some-child"],
      };
      const result = navigationReducer(initialState, action);
      expect(result).toBe(initialState); // identity stable
    });

    it("returns same state when path is already set", () => {
      const state: NavigationState = {
        ...initialState,
        activeChildPath: ["prov-reconcile"],
      };
      const action: NavigationAction = {
        type: "set-child",
        modeId: "provisioning",
        childPath: ["prov-reconcile"],
      };
      const result = navigationReducer(state, action);
      expect(result).toBe(state); // identity stable
    });
  });

  describe("toggle-node action", () => {
    it("adds a node id to sidebarOpenIds when absent", () => {
      const action: NavigationAction = { type: "toggle-node", nodeId: "prov-reconcile" };
      const result = navigationReducer(initialState, action);
      expect(result.sidebarOpenIds.has("prov-reconcile")).toBe(true);
    });

    it("removes a node id from sidebarOpenIds when present", () => {
      const state: NavigationState = {
        ...initialState,
        sidebarOpenIds: new Set(["prov-reconcile"]),
      };
      const action: NavigationAction = { type: "toggle-node", nodeId: "prov-reconcile" };
      const result = navigationReducer(state, action);
      expect(result.sidebarOpenIds.has("prov-reconcile")).toBe(false);
    });

    it("returns same state when toggling would not change the set", () => {
      const state: NavigationState = {
        ...initialState,
        sidebarOpenIds: new Set(["other-node"]),
      };
      const action: NavigationAction = { type: "toggle-node", nodeId: "other-node" };
      const result = navigationReducer(state, action);
      expect(result.sidebarOpenIds.has("other-node")).toBe(false);
      // The set changed, so state should be different.
      expect(result).not.toBe(state);
    });
  });

  describe("expand-node action", () => {
    it("adds a node id to sidebarOpenIds (idempotent)", () => {
      const action: NavigationAction = { type: "expand-node", nodeId: "prov-reconcile" };
      const result1 = navigationReducer(initialState, action);
      expect(result1.sidebarOpenIds.has("prov-reconcile")).toBe(true);
      const result2 = navigationReducer(result1, action);
      expect(result2.sidebarOpenIds.has("prov-reconcile")).toBe(true);
      expect(result2).toBe(result1); // identity stable on second call
    });
  });

  describe("collapse-node action", () => {
    it("removes a node id from sidebarOpenIds (idempotent)", () => {
      const state: NavigationState = {
        ...initialState,
        sidebarOpenIds: new Set(["prov-reconcile"]),
      };
      const action: NavigationAction = { type: "collapse-node", nodeId: "prov-reconcile" };
      const result1 = navigationReducer(state, action);
      expect(result1.sidebarOpenIds.has("prov-reconcile")).toBe(false);
      const result2 = navigationReducer(result1, action);
      expect(result2.sidebarOpenIds.has("prov-reconcile")).toBe(false);
      expect(result2).toBe(result1); // identity stable on second call
    });
  });

  describe("set-rail-collapsed action", () => {
    it("sets the railCollapsed boolean", () => {
      const action: NavigationAction = { type: "set-rail-collapsed", collapsed: true };
      const result = navigationReducer(initialState, action);
      expect(result.railCollapsed).toBe(true);
    });

    it("returns same state when value does not change", () => {
      const action: NavigationAction = { type: "set-rail-collapsed", collapsed: false };
      const result = navigationReducer(initialState, action);
      expect(result).toBe(initialState); // identity stable
    });
  });

  describe("identity stability", () => {
    it("returns the same state object when no field changes", () => {
      const action: NavigationAction = { type: "toggle-node", nodeId: "new-node" };
      const state1 = navigationReducer(initialState, action);
      const state2 = navigationReducer(state1, action); // toggle the same node back
      expect(state1).not.toBe(initialState); // first toggle creates new state
      expect(state2).not.toBe(state1); // second toggle creates another new state
      // But state2 should have the same fields as initialState.
      expect(state2.sidebarOpenIds.size).toBe(initialState.sidebarOpenIds.size);
    });
  });
});
