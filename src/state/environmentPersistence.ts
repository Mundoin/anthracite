/**
 * Pure Persistence Module — Serialization, Deserialization, Validation, and Migration.
 *
 * No React, no I/O, no side effects. All functions are pure transforms.
 * Input is unknown (e.g., from JSON.parse); output is always validated.
 */

import type { EnvironmentLifecycleStoreState, LocalEnvironmentRecord } from "../types/localEnvironment";

export const PERSISTENCE_SCHEMA_VERSION = "1" as const;
export const PERSISTENCE_STORAGE_KEY = "anthracite.env-lifecycle.v1" as const;

export interface PersistedSnapshot {
  readonly schema_version: "1";
  readonly saved_at: string;
  readonly store_revision: number;
  readonly active_environment_id: string | null;
  readonly environments_count: number;
  readonly store: EnvironmentLifecycleStoreState;
}

export type PersistenceLoadStatus =
  | "ok"
  | "no-snapshot"
  | "schema-mismatch"
  | "invalid-shape"
  | "parse-error"
  | "fallback-default";

export interface PersistenceLoadResult {
  readonly status: PersistenceLoadStatus;
  readonly state: EnvironmentLifecycleStoreState;
  readonly warnings: readonly string[];
  readonly source: "snapshot" | "default";
}

export interface PersistenceValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
  readonly repaired_state: EnvironmentLifecycleStoreState | null;
}

/**
 * Serialize a store to a snapshot ready for storage.
 */
export function serializeStore(
  state: EnvironmentLifecycleStoreState,
  savedAt: string,
): PersistedSnapshot {
  return {
    schema_version: "1",
    saved_at: savedAt,
    store_revision: state.store_revision,
    active_environment_id: state.active_environment_id,
    environments_count: state.environments.length,
    store: state,
  };
}

/**
 * Deserialize and validate a snapshot from unknown input.
 *
 * Attempts auto-repair for:
 * - active_environment_id pointing to missing or archived env (clear to null)
 * - device_count/link_count/config_count mismatched with lab_payload (recompute)
 *
 * Marks unrepaired if missing required fields:
 * - environment_id, name, scenario_id, lab_payload on any env record
 * - store.environments array
 */
export function deserializeSnapshot(snapshot: unknown): PersistenceValidationResult {
  const errors: string[] = [];
  const repairs: string[] = [];

  // Check input is object
  if (snapshot === null || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return {
      ok: false,
      errors: ["Snapshot is not an object"],
      repaired_state: null,
    };
  }

  const obj = snapshot as Record<string, unknown>;

  // Check schema version
  if (obj.schema_version !== "1") {
    return {
      ok: false,
      errors: [`Schema version mismatch: expected "1", got ${JSON.stringify(obj.schema_version)}`],
      repaired_state: null,
    };
  }

  // Check store object exists
  if (!obj.store || typeof obj.store !== "object" || Array.isArray(obj.store)) {
    errors.push("Missing or invalid store object");
    return {
      ok: false,
      errors,
      repaired_state: null,
    };
  }

  const store = obj.store as Record<string, unknown>;

  // Check environments array
  if (!Array.isArray(store.environments)) {
    errors.push("Missing or invalid store.environments array");
    return {
      ok: false,
      errors,
      repaired_state: null,
    };
  }

  // Validate each environment record
  const validatedEnvironments: LocalEnvironmentRecord[] = [];

  for (let i = 0; i < (store.environments as unknown[]).length; i++) {
    const env = (store.environments as unknown[])[i];

    if (!env || typeof env !== "object" || Array.isArray(env)) {
      errors.push(`Environment record #${i} is not an object`);
      return {
        ok: false,
        errors,
        repaired_state: null,
      };
    }

    const envObj = env as Record<string, unknown>;

    // Check required string fields
    if (typeof envObj.environment_id !== "string") {
      errors.push(`Environment record #${i} missing or invalid environment_id`);
      return {
        ok: false,
        errors,
        repaired_state: null,
      };
    }

    if (typeof envObj.name !== "string") {
      errors.push(`Environment record #${i} missing or invalid name`);
      return {
        ok: false,
        errors,
        repaired_state: null,
      };
    }

    if (typeof envObj.scenario_id !== "string") {
      errors.push(`Environment record #${i} missing or invalid scenario_id`);
      return {
        ok: false,
        errors,
        repaired_state: null,
      };
    }

    // Check lab_payload
    if (!envObj.lab_payload || typeof envObj.lab_payload !== "object" || Array.isArray(envObj.lab_payload)) {
      errors.push(`Environment record #${i} missing or invalid lab_payload`);
      return {
        ok: false,
        errors,
        repaired_state: null,
      };
    }

    const labPayload = envObj.lab_payload as Record<string, unknown>;
    if (!Array.isArray(labPayload.devices)) {
      errors.push(`Environment record #${i} lab_payload.devices is not an array`);
      return {
        ok: false,
        errors,
        repaired_state: null,
      };
    }

    if (!Array.isArray(labPayload.links)) {
      errors.push(`Environment record #${i} lab_payload.links is not an array`);
      return {
        ok: false,
        errors,
        repaired_state: null,
      };
    }

    // Recompute counts if mismatched
    const expectedDeviceCount = (labPayload.devices as unknown[]).length;
    const expectedLinkCount = (labPayload.links as unknown[]).length;
    const expectedConfigCount = (labPayload.devices as Record<string, unknown>[]).reduce(
      (sum, d) => sum + (Array.isArray(d.configs) ? d.configs.length : 0),
      0,
    );

    const actualDeviceCount = typeof envObj.device_count === "number" ? envObj.device_count : null;
    const actualLinkCount = typeof envObj.link_count === "number" ? envObj.link_count : null;
    const actualConfigCount = typeof envObj.config_count === "number" ? envObj.config_count : null;

    const hasCountRepairs =
      actualDeviceCount !== expectedDeviceCount ||
      actualLinkCount !== expectedLinkCount ||
      actualConfigCount !== expectedConfigCount;

    if (hasCountRepairs) {
      if (actualDeviceCount !== expectedDeviceCount) {
        repairs.push(`Environment ${envObj.environment_id}: recomputed device_count from ${actualDeviceCount} to ${expectedDeviceCount}`);
      }

      if (actualLinkCount !== expectedLinkCount) {
        repairs.push(`Environment ${envObj.environment_id}: recomputed link_count from ${actualLinkCount} to ${expectedLinkCount}`);
      }

      if (actualConfigCount !== expectedConfigCount) {
        repairs.push(`Environment ${envObj.environment_id}: recomputed config_count from ${actualConfigCount} to ${expectedConfigCount}`);
      }

      // Apply repairs to create corrected record
      const repairedEnv: LocalEnvironmentRecord = {
        ...(envObj as unknown as LocalEnvironmentRecord),
        device_count: expectedDeviceCount,
        link_count: expectedLinkCount,
        config_count: expectedConfigCount,
      };
      validatedEnvironments.push(repairedEnv);
    } else {
      // Construct validated record (casting since we validated required fields)
      validatedEnvironments.push(envObj as unknown as LocalEnvironmentRecord);
    }
  }

  // Validate active_environment_id
  let activeEnvironmentId = typeof store.active_environment_id === "string" ? store.active_environment_id : null;

  if (activeEnvironmentId !== null) {
    const activeEnv = validatedEnvironments.find((e) => e.environment_id === activeEnvironmentId);
    if (!activeEnv) {
      repairs.push(`active_environment_id ${activeEnvironmentId} references missing environment; clearing to null`);
      activeEnvironmentId = null;
    } else if (activeEnv.lifecycle_state === "archived") {
      repairs.push(`active_environment_id ${activeEnvironmentId} references archived environment; clearing to null`);
      activeEnvironmentId = null;
    }
  }

  // Construct repaired store
  const repairedStore: EnvironmentLifecycleStoreState = {
    environments: validatedEnvironments as readonly LocalEnvironmentRecord[],
    active_environment_id: activeEnvironmentId,
    schema_version: "1",
    store_revision: typeof store.store_revision === "number" ? store.store_revision : 1,
    storage_origin: "local",
    persistence_kind: (typeof store.persistence_kind === "string" &&
    ["local-browser", "local-file", "memory"].includes(store.persistence_kind)
      ? store.persistence_kind
      : "local-browser") as "local-browser" | "local-file" | "memory",
    last_saved_at: typeof store.last_saved_at === "string" ? store.last_saved_at : null,
    last_loaded_at: typeof store.last_loaded_at === "string" ? store.last_loaded_at : null,
  };

  // If there were repairs, return the repaired state
  const hasRepairs = repairs.length > 0;

  // If there were errors, return failed with repaired state if possible
  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      repaired_state: hasRepairs ? repairedStore : null,
    };
  }

  // No errors, but may have repairs
  return {
    ok: true,
    errors: [],
    repaired_state: hasRepairs ? repairedStore : null,
  };
}

/**
 * Migrate snapshot to a newer schema version.
 * Currently no-op for v1; future-proofs the API.
 */
export function migrateSnapshot(snapshot: PersistedSnapshot): PersistedSnapshot {
  // v1 → v1 migration is identity
  return snapshot;
}

/**
 * Serialize snapshot to JSON string with stable key order.
 */
export function snapshotToJson(snapshot: PersistedSnapshot): string {
  return JSON.stringify(
    {
      schema_version: snapshot.schema_version,
      saved_at: snapshot.saved_at,
      store_revision: snapshot.store_revision,
      active_environment_id: snapshot.active_environment_id,
      environments_count: snapshot.environments_count,
      store: snapshot.store,
    },
    null,
    2,
  );
}

/**
 * Parse JSON string and return snapshot + error.
 * Never throws; wraps JSON.parse + deserializeSnapshot.
 */
export function snapshotFromJson(json: string): { readonly snapshot: PersistedSnapshot | null; readonly error: string | null } {
  try {
    const parsed = JSON.parse(json);

    // Check schema version first
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      (parsed as Record<string, unknown>).schema_version !== "1"
    ) {
      const schemaVer = (parsed as Record<string, unknown>).schema_version;
      return {
        snapshot: null,
        error: `Schema version mismatch: expected "1", got ${JSON.stringify(schemaVer)}`,
      };
    }

    const validation = deserializeSnapshot(parsed);

    if (!validation.ok) {
      const errorList = validation.errors.join("; ");
      return {
        snapshot: null,
        error: `Deserialization failed: ${errorList}`,
      };
    }

    // If validation passed, construct snapshot
    const snapshot: PersistedSnapshot = {
      schema_version: "1",
      saved_at: (parsed as Record<string, unknown>).saved_at as string,
      store_revision: (parsed as Record<string, unknown>).store_revision as number,
      active_environment_id: (parsed as Record<string, unknown>).active_environment_id as string | null,
      environments_count: (parsed as Record<string, unknown>).environments_count as number,
      store: validation.repaired_state ?? (parsed as Record<string, unknown>).store as EnvironmentLifecycleStoreState,
    };

    return {
      snapshot,
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      snapshot: null,
      error: `JSON parse error: ${msg}`,
    };
  }
}
