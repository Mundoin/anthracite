/**
 * D4C — Frontend-only active fabricated environment selection.
 *
 * This is NOT backed by Rust. It does NOT call setActiveEnvironment().
 * It is a pure frontend selection signal used to drive fabricated topology
 * into the canvas path when no live environment is active.
 *
 * Separation:
 *   Rust-backed selection: invoke("set_active_environment", { id }) — persisted
 *   Fabricated selection:  activeFabricatorEnvironment state — frontend-only, ephemeral
 *
 * D4D wires this into a React context or hook. D4C just defines the shape.
 */

export interface ActiveFabricatorEnvironmentState {
  readonly active: boolean;
  readonly environment_id: "env-fab-demo" | null;
}

export const FABRICATOR_INACTIVE: ActiveFabricatorEnvironmentState = {
  active: false,
  environment_id: null,
} as const;

export const FABRICATOR_ACTIVE: ActiveFabricatorEnvironmentState = {
  active: true,
  environment_id: "env-fab-demo",
} as const;

export function isActiveFabricatorEnvironment(
  state: ActiveFabricatorEnvironmentState,
): boolean {
  return state.active && state.environment_id === "env-fab-demo";
}

export function activateFabricatorEnvironment(): ActiveFabricatorEnvironmentState {
  return FABRICATOR_ACTIVE;
}

export function deactivateFabricatorEnvironment(): ActiveFabricatorEnvironmentState {
  return FABRICATOR_INACTIVE;
}
