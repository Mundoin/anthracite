/**
 * Environment Lifecycle Store (D4E/D4F).
 *
 * Pure reducer-style state management for locally-instantiated environments.
 * No React, no side effects beyond Date/identity stamps (injected for testability).
 * All operations return new state; inputs are never mutated.
 */

import type { LocalEnvironmentRecord, EnvironmentLifecycleStoreState } from "../types/localEnvironment";
import type { Environment } from "../types/environment";
import { requireScenarioById } from "../data/scenarioCatalogue";
import { generateLabEnvironment } from "../engines/networkLabEngine";
import { toFabricatorView } from "../engines/labProjections";
import type { FabricatorEnvironment } from "../types/fabricator";
import type { LabEnvironment } from "../types/labEnvironment";

/**
 * Lifecycle Clock — injectable time and identity source.
 * Enables deterministic testing and decoupling from system time.
 */
export interface LifecycleClock {
  now(): string; // ISO 8601 timestamp
  nextId(scenarioId: string): string; // Generate next environment ID
}

/**
 * Default production clock using system time and randomized IDs.
 */
export const DEFAULT_LIFECYCLE_CLOCK: LifecycleClock = {
  now(): string {
    return new Date().toISOString();
  },
  nextId(scenarioId: string): string {
    // Generate short random ID using crypto.getRandomValues if available, else Math.random
    const randomBytes = new Uint8Array(4);
    if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(randomBytes);
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < 4; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }
    const hex = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    return `env-${scenarioId}-${hex}`;
  },
};

/**
 * Test clock factory for deterministic testing.
 * Supplies fixed now() and a sequence of pre-defined IDs.
 */
export function createTestClock(opts: {
  readonly now: string;
  readonly idSequence: readonly string[];
}): LifecycleClock {
  let idIndex = 0;
  return {
    now(): string {
      return opts.now;
    },
    nextId(): string {
      if (idIndex >= opts.idSequence.length) {
        throw new Error(`Test clock exhausted: requested ID #${idIndex}, but only ${opts.idSequence.length} provided`);
      }
      return opts.idSequence[idIndex++];
    },
  };
}

/**
 * Create an empty store with no environments.
 */
export function createEmptyStore(): EnvironmentLifecycleStoreState {
  return {
    environments: [],
    active_environment_id: null,
  };
}

/**
 * Create initial store with built-in Micro Lab auto-instance.
 * The auto-instance uses environment_id "env-fab-demo" for legacy compat.
 */
export function createInitialStore(clock?: LifecycleClock): EnvironmentLifecycleStoreState {
  const c = clock ?? DEFAULT_LIFECYCLE_CLOCK;
  const scenario = requireScenarioById("micro-lab");
  const lab = generateLabEnvironment({
    scenario_id: "micro-lab",
    environment_id: "env-fab-demo",
    environment_name: "Micro Lab",
  });

  const microLabRecord: LocalEnvironmentRecord = {
    environment_id: "env-fab-demo",
    name: "Micro Lab",
    kind: "generated-lab",
    scenario_id: "micro-lab",
    scenario_name: scenario.name,
    scenario_seed: lab.scenario_seed,
    provenance: "generated-lab",
    status: "unknown",
    created_at: c.now(),
    updated_at: c.now(),
    source_summary: `${scenario.name} (lab) — ${lab.device_count} devices, ${lab.link_count} links, ${lab.config_count} configs`,
    device_count: lab.device_count,
    link_count: lab.link_count,
    config_count: lab.config_count,
    lab_payload: lab,
    capability_flags: lab.capability_flags,
    generator_version: lab.generator_version,
    lifecycle_state: "available",
    revision: 1,
    origin: "local",
    source_id: null,
    sync_state: "local-only",
    local_only: true,
  };

  return {
    environments: [microLabRecord],
    active_environment_id: "env-fab-demo",
  };
}

/**
 * Create a new environment from a scenario.
 * Auto-suffixes duplicate names ("Branch Office 2", "Branch Office 3", etc.).
 * Does NOT change active_environment_id.
 *
 * @throws Error if scenario_id does not exist
 */
export function createEnvironmentFromScenario(
  state: EnvironmentLifecycleStoreState,
  scenarioId: string,
  options?: { readonly name?: string; readonly clock?: LifecycleClock },
): EnvironmentLifecycleStoreState {
  const c = options?.clock ?? DEFAULT_LIFECYCLE_CLOCK;
  const scenario = requireScenarioById(scenarioId);

  const environmentId = c.nextId(scenarioId);
  let name = options?.name ?? scenario.name;

  // Check for duplicate names in non-archived environments
  const nonArchivedNames = state.environments
    .filter((env) => env.lifecycle_state !== "archived")
    .map((env) => env.name);

  if (nonArchivedNames.includes(name)) {
    let suffix = 2;
    let candidateName = `${name} ${suffix}`;
    while (nonArchivedNames.includes(candidateName)) {
      suffix++;
      candidateName = `${name} ${suffix}`;
    }
    name = candidateName;
  }

  const lab = generateLabEnvironment({
    scenario_id: scenarioId,
    environment_id: environmentId,
    environment_name: name,
  });

  const newRecord: LocalEnvironmentRecord = {
    environment_id: environmentId,
    name,
    kind: "generated-lab",
    scenario_id: scenarioId,
    scenario_name: scenario.name,
    scenario_seed: lab.scenario_seed,
    provenance: "generated-lab",
    status: "unknown",
    created_at: c.now(),
    updated_at: c.now(),
    source_summary: `${scenario.name} (lab) — ${lab.device_count} devices, ${lab.link_count} links, ${lab.config_count} configs`,
    device_count: lab.device_count,
    link_count: lab.link_count,
    config_count: lab.config_count,
    lab_payload: lab,
    capability_flags: lab.capability_flags,
    generator_version: lab.generator_version,
    lifecycle_state: "available",
    revision: 1,
    origin: "local",
    source_id: null,
    sync_state: "local-only",
    local_only: true,
  };

  return {
    ...state,
    environments: [...state.environments, newRecord],
  };
}

/**
 * List environments, optionally filtering out archived ones.
 */
export function listEnvironments(
  state: EnvironmentLifecycleStoreState,
  options?: { readonly includeArchived?: boolean },
): readonly LocalEnvironmentRecord[] {
  if (options?.includeArchived) {
    return state.environments;
  }
  return state.environments.filter((env) => env.lifecycle_state !== "archived");
}

/**
 * Get a single environment by ID, or undefined if not found.
 */
export function getEnvironmentById(
  state: EnvironmentLifecycleStoreState,
  id: string,
): LocalEnvironmentRecord | undefined {
  return state.environments.find((env) => env.environment_id === id);
}

/**
 * Get the currently active environment, or null if none.
 * Returns null if active_environment_id points to an archived environment.
 */
export function getActiveEnvironment(state: EnvironmentLifecycleStoreState): LocalEnvironmentRecord | null {
  if (!state.active_environment_id) {
    return null;
  }
  const env = getEnvironmentById(state, state.active_environment_id);
  if (!env || env.lifecycle_state === "archived") {
    return null;
  }
  return env;
}

/**
 * Select an environment as active.
 * Pass id === null to clear active selection.
 * Throws if id is provided but not found or archived.
 */
export function selectActiveEnvironment(
  state: EnvironmentLifecycleStoreState,
  id: string | null,
): EnvironmentLifecycleStoreState {
  if (id === null) {
    return { ...state, active_environment_id: null };
  }

  const env = getEnvironmentById(state, id);
  if (!env) {
    throw new Error(`Environment not found: ${id}`);
  }
  if (env.lifecycle_state === "archived") {
    throw new Error(`Cannot activate archived environment: ${id}`);
  }

  return { ...state, active_environment_id: id };
}

/**
 * Rename an environment.
 * Throws if environment not found or archived.
 * Bumps revision and updated_at.
 */
export function renameEnvironment(
  state: EnvironmentLifecycleStoreState,
  id: string,
  newName: string,
  options?: { readonly clock?: LifecycleClock },
): EnvironmentLifecycleStoreState {
  const c = options?.clock ?? DEFAULT_LIFECYCLE_CLOCK;
  const env = getEnvironmentById(state, id);

  if (!env) {
    throw new Error(`Environment not found: ${id}`);
  }
  if (env.lifecycle_state === "archived") {
    throw new Error(`Cannot rename archived environment: ${id}`);
  }

  const updatedEnv: LocalEnvironmentRecord = {
    ...env,
    name: newName,
    revision: env.revision + 1,
    updated_at: c.now(),
  };

  return {
    ...state,
    environments: state.environments.map((e) => (e.environment_id === id ? updatedEnv : e)),
  };
}

/**
 * Duplicate an environment.
 * Creates a new environment with the same scenario but a new ID and auto-suffixed name.
 * Regenerates the lab payload so internal IDs are fresh.
 * Throws if source environment not found or archived.
 */
export function duplicateEnvironment(
  state: EnvironmentLifecycleStoreState,
  id: string,
  options?: { readonly clock?: LifecycleClock },
): EnvironmentLifecycleStoreState {
  const c = options?.clock ?? DEFAULT_LIFECYCLE_CLOCK;
  const source = getEnvironmentById(state, id);

  if (!source) {
    throw new Error(`Environment not found: ${id}`);
  }
  if (source.lifecycle_state === "archived") {
    throw new Error(`Cannot duplicate archived environment: ${id}`);
  }

  const newEnvironmentId = c.nextId(source.scenario_id);
  let newName = source.name;

  // Auto-suffix to avoid collisions
  const nonArchivedNames = state.environments
    .filter((env) => env.lifecycle_state !== "archived")
    .map((env) => env.name);

  if (nonArchivedNames.includes(newName)) {
    let suffix = 2;
    let candidateName = `${newName} ${suffix}`;
    while (nonArchivedNames.includes(candidateName)) {
      suffix++;
      candidateName = `${newName} ${suffix}`;
    }
    newName = candidateName;
  }

  // Regenerate lab payload with new environment ID
  const lab = generateLabEnvironment({
    scenario_id: source.scenario_id,
    environment_id: newEnvironmentId,
    environment_name: newName,
  });

  const newRecord: LocalEnvironmentRecord = {
    environment_id: newEnvironmentId,
    name: newName,
    kind: "generated-lab",
    scenario_id: source.scenario_id,
    scenario_name: source.scenario_name,
    scenario_seed: lab.scenario_seed,
    provenance: "generated-lab",
    status: "unknown",
    created_at: c.now(),
    updated_at: c.now(),
    source_summary: `${source.scenario_name} (lab) — ${lab.device_count} devices, ${lab.link_count} links, ${lab.config_count} configs`,
    device_count: lab.device_count,
    link_count: lab.link_count,
    config_count: lab.config_count,
    lab_payload: lab,
    capability_flags: lab.capability_flags,
    generator_version: lab.generator_version,
    lifecycle_state: "available",
    revision: 1,
    origin: "local",
    source_id: null,
    sync_state: "local-only",
    local_only: true,
  };

  return {
    ...state,
    environments: [...state.environments, newRecord],
  };
}

/**
 * Archive an environment.
 * If archived environment is currently active, clears active_environment_id to the next available,
 * or null if none exist.
 * Throws if environment not found.
 */
export function archiveEnvironment(
  state: EnvironmentLifecycleStoreState,
  id: string,
  options?: { readonly clock?: LifecycleClock },
): EnvironmentLifecycleStoreState {
  const c = options?.clock ?? DEFAULT_LIFECYCLE_CLOCK;
  const env = getEnvironmentById(state, id);

  if (!env) {
    throw new Error(`Environment not found: ${id}`);
  }

  const archivedEnv: LocalEnvironmentRecord = {
    ...env,
    lifecycle_state: "archived",
    revision: env.revision + 1,
    updated_at: c.now(),
  };

  const updatedEnvironments = state.environments.map((e) =>
    e.environment_id === id ? archivedEnv : e,
  );

  let newActiveId = state.active_environment_id;

  // If archived env was active, find next available or clear
  if (state.active_environment_id === id) {
    const nextAvailable = updatedEnvironments.find(
      (env) => env.lifecycle_state !== "archived",
    );
    newActiveId = nextAvailable?.environment_id ?? null;
  }

  return {
    environments: updatedEnvironments,
    active_environment_id: newActiveId,
  };
}

/**
 * Restore an archived environment to available state.
 * Does NOT auto-activate.
 * Throws if environment not found or not archived.
 */
export function restoreEnvironment(
  state: EnvironmentLifecycleStoreState,
  id: string,
  options?: { readonly clock?: LifecycleClock },
): EnvironmentLifecycleStoreState {
  const c = options?.clock ?? DEFAULT_LIFECYCLE_CLOCK;
  const env = getEnvironmentById(state, id);

  if (!env) {
    throw new Error(`Environment not found: ${id}`);
  }
  if (env.lifecycle_state !== "archived") {
    throw new Error(`Cannot restore non-archived environment: ${id}`);
  }

  const restoredEnv: LocalEnvironmentRecord = {
    ...env,
    lifecycle_state: "available",
    revision: env.revision + 1,
    updated_at: c.now(),
  };

  return {
    ...state,
    environments: state.environments.map((e) => (e.environment_id === id ? restoredEnv : e)),
  };
}

/**
 * Convert a LocalEnvironmentRecord to the legacy Environment shape
 * for consumption by hierarchy and other legacy systems.
 */
export function toEnvironmentEntry(record: LocalEnvironmentRecord): Environment {
  return {
    id: record.environment_id,
    name: record.name,
    kind: record.kind,
    device_count: record.device_count,
    status: "unknown",
    updated_at: record.updated_at,
    summary: record.source_summary,
  };
}

/**
 * Get the active lab environment payload, or null if no active environment.
 */
export function getActiveLabEnvironment(state: EnvironmentLifecycleStoreState): LabEnvironment | null {
  const active = getActiveEnvironment(state);
  return active ? active.lab_payload : null;
}

/**
 * Get the active lab environment as a FabricatorEnvironment view, or null if no active environment.
 */
export function getActiveFabricatorView(state: EnvironmentLifecycleStoreState): FabricatorEnvironment | null {
  const labEnv = getActiveLabEnvironment(state);
  return labEnv ? toFabricatorView(labEnv) : null;
}
