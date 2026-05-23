/**
 * Environment Persistence I/O Tests.
 *
 * Tests the high-level orchestrator: save/load with fallback, error recovery, repair reporting.
 */

import { describe, it, expect } from "vitest";
import type { EnvironmentLifecycleStoreState, LocalEnvironmentRecord } from "../../types/localEnvironment";
import { MemoryStorageAdapter } from "../environmentPersistenceAdapter";
import { saveStoreToAdapter, loadStoreFromAdapter, clearStoreFromAdapter } from "../environmentPersistenceIO";

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

describe("Environment Persistence I/O Orchestrator", () => {
  // ===== Save =====

  it("saveStoreToAdapter writes snapshot to adapter", () => {
    const adapter = new MemoryStorageAdapter();
    const store = createTestStore();

    saveStoreToAdapter(store, adapter, { now: "2026-05-22T13:00:00Z" });

    const raw = adapter.read("anthracite.env-lifecycle.v1");
    expect(raw).not.toBeNull();
    expect(raw).toContain("schema_version");
  });

  it("saveStoreToAdapter returns { ok: true } on success", () => {
    const adapter = new MemoryStorageAdapter();
    const store = createTestStore();

    const result = saveStoreToAdapter(store, adapter, { now: "2026-05-22T13:00:00Z" });

    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
  });

  it("saveStoreToAdapter returns { ok: false, error } when adapter throws", () => {
    const adapter = {
      kind: "memory" as const,
      read: () => null,
      write: () => {
        throw new Error("Write failed");
      },
      remove: () => {},
    };

    const store = createTestStore();
    const result = saveStoreToAdapter(store, adapter, { now: "2026-05-22T13:00:00Z" });

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.error).toContain("Write failed");
  });

  // ===== Load =====

  it("loadStoreFromAdapter returns 'no-snapshot' when adapter empty", () => {
    const adapter = new MemoryStorageAdapter();
    const fallback = () => createTestStore();

    const result = loadStoreFromAdapter(adapter, fallback);

    expect(result.status).toBe("no-snapshot");
    expect(result.source).toBe("default");
    expect(result.state).toEqual(fallback());
  });

  it("loadStoreFromAdapter returns 'parse-error' on invalid JSON", () => {
    const adapter = {
      kind: "memory" as const,
      read: () => "{invalid json",
      write: () => {},
      remove: () => {},
    };

    const fallback = () => createTestStore();
    const result = loadStoreFromAdapter(adapter, fallback);

    expect(result.status).toBe("parse-error");
    expect(result.source).toBe("default");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("loadStoreFromAdapter returns 'schema-mismatch' on wrong schema version", () => {
    const adapter = {
      kind: "memory" as const,
      read: () =>
        JSON.stringify({
          schema_version: "2",
          saved_at: "2026-05-22T13:00:00Z",
          store_revision: 1,
          active_environment_id: null,
          environments_count: 0,
          store: createTestStore(),
        }),
      write: () => {},
      remove: () => {},
    };

    const fallback = () => createTestStore();
    const result = loadStoreFromAdapter(adapter, fallback);

    expect(result.status).toBe("schema-mismatch");
    expect(result.source).toBe("default");
  });

  it("loadStoreFromAdapter returns 'ok' on valid snapshot", () => {
    const adapter = new MemoryStorageAdapter();
    const store = createTestStore();

    // Save first
    saveStoreToAdapter(store, adapter, { now: "2026-05-22T13:00:00Z" });

    // Load
    const fallback = () => createTestStore();
    const result = loadStoreFromAdapter(adapter, fallback);

    expect(result.status).toBe("ok");
    expect(result.source).toBe("snapshot");
    expect(result.state.environments.length).toBe(1);
  });

  it("loadStoreFromAdapter calls fallback() when no snapshot", () => {
    const adapter = new MemoryStorageAdapter();
    let fallbackCalled = false;

    const fallback = () => {
      fallbackCalled = true;
      return createTestStore();
    };

    loadStoreFromAdapter(adapter, fallback);

    expect(fallbackCalled).toBe(true);
  });

  it("loadStoreFromAdapter calls fallback() on parse error", () => {
    const adapter = {
      kind: "memory" as const,
      read: () => "{bad json",
      write: () => {},
      remove: () => {},
    };

    let fallbackCalled = false;

    const fallback = () => {
      fallbackCalled = true;
      return createTestStore();
    };

    loadStoreFromAdapter(adapter, fallback);

    expect(fallbackCalled).toBe(true);
  });

  // ===== Round-Trip =====

  it("round trip: save then load returns equivalent state", () => {
    const adapter = new MemoryStorageAdapter();
    const originalStore = createTestStore({
      store_revision: 42,
      active_environment_id: "env-test-001",
    });

    // Save
    saveStoreToAdapter(originalStore, adapter, { now: "2026-05-22T13:00:00Z" });

    // Load
    const fallback = () => createTestStore();
    const result = loadStoreFromAdapter(adapter, fallback);

    expect(result.status).toBe("ok");
    expect(result.state.store_revision).toBe(42);
    expect(result.state.active_environment_id).toBe("env-test-001");
    expect(result.state.environments.length).toBe(1);
  });

  // ===== Clear =====

  it("clearStoreFromAdapter removes key", () => {
    const adapter = new MemoryStorageAdapter();
    const store = createTestStore();

    // Save
    saveStoreToAdapter(store, adapter, { now: "2026-05-22T13:00:00Z" });
    expect(adapter.read("anthracite.env-lifecycle.v1")).not.toBeNull();

    // Clear
    clearStoreFromAdapter(adapter);

    expect(adapter.read("anthracite.env-lifecycle.v1")).toBeNull();
  });

  // ===== Multiple Cycles =====

  it("multiple save+load cycles preserve shape", () => {
    const adapter = new MemoryStorageAdapter();
    const fallback = () => createTestStore();

    // Cycle 1
    let store1 = createTestStore({ store_revision: 1 });
    saveStoreToAdapter(store1, adapter, { now: "2026-05-22T13:00:00Z" });
    let result1 = loadStoreFromAdapter(adapter, fallback);
    expect(result1.state.store_revision).toBe(1);

    // Cycle 2
    const loaded1 = result1.state;
    let store2 = { ...loaded1, store_revision: 2 };
    saveStoreToAdapter(store2, adapter, { now: "2026-05-22T14:00:00Z" });
    let result2 = loadStoreFromAdapter(adapter, fallback);
    expect(result2.state.store_revision).toBe(2);

    // Cycle 3
    const loaded2 = result2.state;
    let store3 = { ...loaded2, store_revision: 3 };
    saveStoreToAdapter(store3, adapter, { now: "2026-05-22T15:00:00Z" });
    let result3 = loadStoreFromAdapter(adapter, fallback);
    expect(result3.state.store_revision).toBe(3);

    // All cycles should have the same environment
    expect(result3.state.environments.length).toBe(1);
    expect(result3.state.environments[0].environment_id).toBe("env-test-001");
  });

  it("save with multiple environments preserves all", () => {
    const adapter = new MemoryStorageAdapter();
    const env1 = createTestEnvironment({ environment_id: "env-001", name: "First" });
    const env2 = createTestEnvironment({ environment_id: "env-002", name: "Second" });

    const store = createTestStore({
      environments: [env1, env2],
      active_environment_id: "env-002",
    });

    saveStoreToAdapter(store, adapter, { now: "2026-05-22T13:00:00Z" });

    const fallback = () => createTestStore();
    const result = loadStoreFromAdapter(adapter, fallback);

    expect(result.state.environments.length).toBe(2);
    expect(result.state.environments[0].name).toBe("First");
    expect(result.state.environments[1].name).toBe("Second");
    expect(result.state.active_environment_id).toBe("env-002");
  });
});
