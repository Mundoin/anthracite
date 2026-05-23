/**
 * Environment Persistence Tests (Pure Serialization, Deserialization, Validation).
 *
 * Tests the core persistence module: no React, no I/O, pure transforms.
 */

import { describe, it, expect } from "vitest";
import type { EnvironmentLifecycleStoreState, LocalEnvironmentRecord } from "../../types/localEnvironment";
import type { PersistedSnapshot } from "../environmentPersistence";
import {
  PERSISTENCE_SCHEMA_VERSION,
  PERSISTENCE_STORAGE_KEY,
  serializeStore,
  deserializeSnapshot,
  migrateSnapshot,
  snapshotToJson,
  snapshotFromJson,
} from "../environmentPersistence";

// Helper: create a minimal valid environment record
function createTestEnvironment(overrides?: Partial<LocalEnvironmentRecord>): LocalEnvironmentRecord {
  return {
    environment_id: "env-test-001",
    name: "Test Environment",
    kind: "generated-lab",
    scenario_id: "micro-lab",
    scenario_name: "Micro Lab",
    scenario_seed: "seed-abc123",
    provenance: "generated-lab",
    status: "unknown",
    created_at: "2026-05-22T12:00:00Z",
    updated_at: "2026-05-22T12:00:00Z",
    source_summary: "Test environment — 2 devices, 1 link, 2 configs",
    device_count: 2,
    link_count: 1,
    config_count: 2,
    lab_payload: {
      environment_id: "env-test-001",
      scenario_id: "micro-lab",
      scenario_seed: "seed-abc123",
      capability_flags: { has_vlan: false, has_bgp: false, has_ospf: false },
      generator_version: "1.0",
      devices: [
        {
          device_id: "dev-001",
          device_type: "router",
          hostname: "R1",
          roles: ["edge"],
          configs: [{}, {}],
        } as any,
        {
          device_id: "dev-002",
          device_type: "switch",
          hostname: "SW1",
          roles: ["access"],
          configs: [],
        } as any,
      ],
      links: [{ link_id: "link-001" } as any],
    } as any,
    capability_flags: { has_vlan: false, has_bgp: false, has_ospf: false },
    generator_version: "1.0",
    lifecycle_state: "available",
    revision: 1,
    origin: "local",
    source_id: null,
    sync_state: "local-only",
    local_only: true,
    environment_uid: "uid-env-test-001",
    base_revision: 1,
    last_saved_at: null,
    last_loaded_at: null,
    updated_by: null,
    ...overrides,
  };
}

function createTestStore(overrides?: Partial<EnvironmentLifecycleStoreState>): EnvironmentLifecycleStoreState {
  return {
    environments: [createTestEnvironment()],
    active_environment_id: "env-test-001",
    schema_version: "1",
    store_revision: 1,
    storage_origin: "local",
    persistence_kind: "local-browser",
    last_saved_at: null,
    last_loaded_at: null,
    ...overrides,
  };
}

describe("Environment Persistence — Pure Module", () => {
  // ===== Constants =====

  it("PERSISTENCE_SCHEMA_VERSION is '1'", () => {
    expect(PERSISTENCE_SCHEMA_VERSION).toBe("1");
  });

  it("PERSISTENCE_STORAGE_KEY is 'anthracite.env-lifecycle.v1'", () => {
    expect(PERSISTENCE_STORAGE_KEY).toBe("anthracite.env-lifecycle.v1");
  });

  // ===== Serialization =====

  it("serializeStore produces snapshot with schema_version '1'", () => {
    const store = createTestStore();
    const snapshot = serializeStore(store, "2026-05-22T13:00:00Z");
    expect(snapshot.schema_version).toBe("1");
  });

  it("serializeStore preserves saved_at, store_revision, active_environment_id, environments_count, store", () => {
    const store = createTestStore();
    const savedAt = "2026-05-22T13:00:00Z";
    const snapshot = serializeStore(store, savedAt);

    expect(snapshot.saved_at).toBe(savedAt);
    expect(snapshot.store_revision).toBe(1);
    expect(snapshot.active_environment_id).toBe("env-test-001");
    expect(snapshot.environments_count).toBe(1);
    expect(snapshot.store).toEqual(store);
  });

  // ===== JSON Round-Trip =====

  it("snapshotToJson + snapshotFromJson round-trip preserves shape", () => {
    const store = createTestStore();
    const snapshot = serializeStore(store, "2026-05-22T13:00:00Z");
    const json = snapshotToJson(snapshot);
    const parsed = snapshotFromJson(json);

    expect(parsed.error).toBeNull();
    expect(parsed.snapshot).not.toBeNull();
    expect(parsed.snapshot!.schema_version).toBe("1");
    expect(parsed.snapshot!.store_revision).toBe(1);
    expect(parsed.snapshot!.environments_count).toBe(1);
  });

  it("snapshotFromJson on invalid JSON returns { snapshot: null, error: <string> }", () => {
    const result = snapshotFromJson("{invalid json");
    expect(result.snapshot).toBeNull();
    expect(result.error).toBeTruthy();
    expect(result.error).toContain("JSON parse error");
  });

  // ===== Deserialization & Validation =====

  it("deserializeSnapshot rejects null input", () => {
    const result = deserializeSnapshot(null);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.repaired_state).toBeNull();
  });

  it("deserializeSnapshot rejects array input", () => {
    const result = deserializeSnapshot([]);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deserializeSnapshot rejects schema_version mismatch", () => {
    const result = deserializeSnapshot({ schema_version: "2", store: {} });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("Schema version mismatch");
  });

  it("deserializeSnapshot rejects missing schema_version", () => {
    const result = deserializeSnapshot({ store: {} });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("Schema version mismatch");
  });

  it("deserializeSnapshot rejects missing store.environments", () => {
    const result = deserializeSnapshot({ schema_version: "1", store: {} });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("deserializeSnapshot rejects env record missing environment_id", () => {
    const input = {
      schema_version: "1",
      store: {
        environments: [
          {
            name: "Test",
            scenario_id: "micro-lab",
            lab_payload: { devices: [], links: [] },
          },
        ],
        active_environment_id: null,
        schema_version: "1",
        store_revision: 1,
        storage_origin: "local",
        persistence_kind: "local-browser",
        last_saved_at: null,
        last_loaded_at: null,
      },
    };

    const result = deserializeSnapshot(input);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("environment_id");
  });

  it("deserializeSnapshot rejects env record missing lab_payload", () => {
    const input = {
      schema_version: "1",
      store: {
        environments: [
          {
            environment_id: "env-001",
            name: "Test",
            scenario_id: "micro-lab",
          },
        ],
        active_environment_id: null,
        schema_version: "1",
        store_revision: 1,
        storage_origin: "local",
        persistence_kind: "local-browser",
        last_saved_at: null,
        last_loaded_at: null,
      },
    };

    const result = deserializeSnapshot(input);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("lab_payload");
  });

  it("deserializeSnapshot accepts valid snapshot from serializeStore output", () => {
    const store = createTestStore();
    const snapshot = serializeStore(store, "2026-05-22T13:00:00Z");
    const result = deserializeSnapshot(snapshot);

    expect(result.ok).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("deserializeSnapshot repairs active_environment_id when it references missing env", () => {
    const store = createTestStore({
      active_environment_id: "env-missing",
    });
    const snapshot = serializeStore(store, "2026-05-22T13:00:00Z");

    const result = deserializeSnapshot(snapshot);
    expect(result.ok).toBe(true);
    expect(result.repaired_state).not.toBeNull();
    expect(result.repaired_state!.active_environment_id).toBeNull();
  });

  it("deserializeSnapshot repairs active_environment_id when it references archived env", () => {
    const env = createTestEnvironment({ lifecycle_state: "archived" });
    const store = createTestStore({
      environments: [env],
      active_environment_id: "env-test-001",
    });
    const snapshot = serializeStore(store, "2026-05-22T13:00:00Z");

    const result = deserializeSnapshot(snapshot);
    expect(result.ok).toBe(true);
    expect(result.repaired_state).not.toBeNull();
    expect(result.repaired_state!.active_environment_id).toBeNull();
  });

  it("deserializeSnapshot recomputes device_count when mismatched with lab_payload", () => {
    const env = createTestEnvironment({
      device_count: 999, // Wrong count
    });
    const store = createTestStore({
      environments: [env],
    });
    const snapshot = serializeStore(store, "2026-05-22T13:00:00Z");

    const result = deserializeSnapshot(snapshot);
    expect(result.ok).toBe(true);
    expect(result.repaired_state).not.toBeNull();
    expect(result.repaired_state!.environments[0].device_count).toBe(2); // Correct count
  });

  it("deserializeSnapshot recomputes link_count when mismatched with lab_payload", () => {
    const env = createTestEnvironment({
      link_count: 888, // Wrong count
    });
    const store = createTestStore({
      environments: [env],
    });
    const snapshot = serializeStore(store, "2026-05-22T13:00:00Z");

    const result = deserializeSnapshot(snapshot);
    expect(result.ok).toBe(true);
    expect(result.repaired_state!.environments[0].link_count).toBe(1); // Correct count
  });

  it("deserializeSnapshot recomputes config_count when mismatched with lab_payload", () => {
    const env = createTestEnvironment({
      config_count: 777, // Wrong count
    });
    const store = createTestStore({
      environments: [env],
    });
    const snapshot = serializeStore(store, "2026-05-22T13:00:00Z");

    const result = deserializeSnapshot(snapshot);
    expect(result.ok).toBe(true);
    expect(result.repaired_state!.environments[0].config_count).toBe(2); // Correct count
  });

  // ===== Migration =====

  it("migrateSnapshot is identity for v1", () => {
    const store = createTestStore();
    const snapshot = serializeStore(store, "2026-05-22T13:00:00Z");
    const migrated = migrateSnapshot(snapshot);

    expect(migrated).toEqual(snapshot);
  });

  // ===== Complex Round-Trip =====

  it("JSON round-trip preserves env records exactly (device counts, lab_payload)", () => {
    // Create environment with counts matching the lab_payload
    const env = createTestEnvironment({
      environment_id: "env-complex-001",
      name: "Complex Environment",
      device_count: 2,  // Matches 2 devices in lab_payload
      link_count: 1,    // Matches 1 link in lab_payload
      config_count: 2,  // Matches 2 configs in lab_payload
    });

    const store = createTestStore({
      environments: [env],
      active_environment_id: "env-complex-001",
    });

    const snapshot = serializeStore(store, "2026-05-22T13:00:00Z");
    const json = snapshotToJson(snapshot);
    const parseResult = snapshotFromJson(json);

    expect(parseResult.error).toBeNull();
    const loaded = parseResult.snapshot!;

    expect(loaded.environments_count).toBe(1);
    expect(loaded.store.environments[0].environment_id).toBe("env-complex-001");
    expect(loaded.store.environments[0].name).toBe("Complex Environment");
    expect(loaded.store.environments[0].device_count).toBe(2);
    expect(loaded.store.environments[0].link_count).toBe(1);
    expect(loaded.store.environments[0].config_count).toBe(2);
  });

  it("multiple environments survive round-trip", () => {
    const env1 = createTestEnvironment({ environment_id: "env-001" });
    const env2 = createTestEnvironment({
      environment_id: "env-002",
      name: "Second Env",
    });

    const store = createTestStore({
      environments: [env1, env2],
      active_environment_id: "env-002",
    });

    const snapshot = serializeStore(store, "2026-05-22T13:00:00Z");
    const json = snapshotToJson(snapshot);
    const parseResult = snapshotFromJson(json);

    expect(parseResult.snapshot!.environments_count).toBe(2);
    expect(parseResult.snapshot!.store.environments.length).toBe(2);
    expect(parseResult.snapshot!.active_environment_id).toBe("env-002");
  });
});
