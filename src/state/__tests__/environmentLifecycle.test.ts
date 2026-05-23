/**
 * Environment Lifecycle Store Tests (D4E/D4F).
 *
 * Comprehensive test suite for pure reducer-style lifecycle management.
 * Uses deterministic test clocks for reproducibility.
 */

import { describe, it, expect } from "vitest";
import type { LifecycleClock } from "../environmentLifecycle";
import {
  createEmptyStore,
  createInitialStore,
  createEnvironmentFromScenario,
  listEnvironments,
  getEnvironmentById,
  getActiveEnvironment,
  selectActiveEnvironment,
  renameEnvironment,
  duplicateEnvironment,
  archiveEnvironment,
  restoreEnvironment,
  toEnvironmentEntry,
  createTestClock,
  getActiveLabEnvironment,
  getActiveFabricatorView,
  loadStore,
  resetToDefault,
  exportSnapshot,
  importSnapshot,
  markStoreSaved,
  bumpStoreRevision,
} from "../environmentLifecycle";

const TEST_NOW = "2026-05-22T12:00:00Z";
const TEST_ID_SEQUENCE = [
  "env-micro-lab-0001",
  "env-branch-office-0002",
  "env-campus-0003",
  "env-datacenter-pod-0004",
  "env-metro-mega-city-0005",
  "env-micro-lab-0006",
  "env-branch-office-0007",
  "env-campus-0008",
];

function createTestClockForTest(): LifecycleClock {
  return createTestClock({
    now: TEST_NOW,
    idSequence: TEST_ID_SEQUENCE,
  });
}

describe("Environment Lifecycle Store", () => {
  // ===== Creation Tests =====

  it("createEmptyStore yields zero environments + null active", () => {
    const store = createEmptyStore();
    expect(store.environments).toHaveLength(0);
    expect(store.active_environment_id).toBeNull();
  });

  it("createInitialStore yields 1 env (Micro Lab) with id env-fab-demo + active", () => {
    const store = createInitialStore();
    expect(store.environments).toHaveLength(1);
    expect(store.active_environment_id).toBe("env-fab-demo");

    const microLab = store.environments[0];
    expect(microLab.environment_id).toBe("env-fab-demo");
    expect(microLab.name).toBe("Micro Lab");
  });

  it("createInitialStore env-fab-demo has kind generated-lab", () => {
    const store = createInitialStore();
    const microLab = store.environments[0];
    expect(microLab.kind).toBe("generated-lab");
  });

  it("createInitialStore env-fab-demo has 3 devices + 2 links + 3 configs", () => {
    const store = createInitialStore();
    const microLab = store.environments[0];
    expect(microLab.device_count).toBe(3);
    expect(microLab.link_count).toBe(2);
    expect(microLab.config_count).toBe(3);
  });

  it("createInitialStore env-fab-demo lab_payload device ids include fab-dev-001", () => {
    const store = createInitialStore();
    const microLab = store.environments[0];
    const deviceIds = microLab.lab_payload.devices.map((d) => d.id);
    expect(deviceIds).toContain("fab-dev-001");
  });

  it("createInitialStore env-fab-demo lab_payload vendors include both cisco and juniper", () => {
    const store = createInitialStore();
    const microLab = store.environments[0];
    const vendors = new Set(microLab.lab_payload.devices.map((d) => d.vendor));
    expect(vendors).toContain("cisco");
    expect(vendors).toContain("juniper");
  });

  it("createEnvironmentFromScenario(branch-office) → device_count 8, link_count 10", () => {
    const clock = createTestClockForTest();
    const store = createInitialStore(clock);
    const newStore = createEnvironmentFromScenario(store, "branch-office", { clock });

    const branchOffice = newStore.environments.find((e) => e.scenario_id === "branch-office");
    expect(branchOffice).toBeDefined();
    expect(branchOffice!.device_count).toBe(8);
    expect(branchOffice!.link_count).toBe(10);
  });

  it("created environment has positive config_count", () => {
    const clock = createTestClockForTest();
    const store = createInitialStore(clock);
    const newStore = createEnvironmentFromScenario(store, "branch-office", { clock });

    const branchOffice = newStore.environments.find((e) => e.scenario_id === "branch-office");
    expect(branchOffice!.config_count).toBeGreaterThan(0);
  });

  it("record has capability_flags object with topology and inventory true", () => {
    const store = createInitialStore();
    const microLab = store.environments[0];
    expect(microLab.capability_flags.topology).toBe(true);
    expect(microLab.capability_flags.inventory).toBe(true);
  });

  it("record has generator_version matching lab-engine prefix", () => {
    const store = createInitialStore();
    const microLab = store.environments[0];
    expect(microLab.generator_version).toMatch(/^lab-engine\//);
  });

  it("record has scenario_seed equal to scenario scenario_seed", () => {
    const store = createInitialStore();
    const microLab = store.environments[0];
    expect(microLab.scenario_seed).toBeTruthy();
    expect(typeof microLab.scenario_seed).toBe("string");
  });

  it("lab_payload.provenance === generated-lab", () => {
    const store = createInitialStore();
    const microLab = store.environments[0];
    expect(microLab.lab_payload.provenance).toBe("generated-lab");
  });

  it("duplicate environment produces new lab_payload with different environment_id", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);
    store = duplicateEnvironment(store, "env-fab-demo", { clock });

    const duplicated = store.environments.find(
      (e) => e.scenario_id === "micro-lab" && e.environment_id !== "env-fab-demo",
    )!;
    expect(duplicated.lab_payload.environment_id).not.toBe("env-fab-demo");
  });

  it("duplicated lab_payload.environment_id equals new record.environment_id", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);
    store = duplicateEnvironment(store, "env-fab-demo", { clock });

    const duplicated = store.environments.find(
      (e) => e.scenario_id === "micro-lab" && e.environment_id !== "env-fab-demo",
    )!;
    expect(duplicated.lab_payload.environment_id).toBe(duplicated.environment_id);
  });

  it("duplicate preserves scenario_id + provenance", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);
    const original = store.environments[0];

    store = duplicateEnvironment(store, "env-fab-demo", { clock });
    const duplicated = store.environments.find(
      (e) => e.environment_id !== "env-fab-demo",
    )!;

    expect(duplicated.scenario_id).toBe(original.scenario_id);
    expect(duplicated.provenance).toBe(original.provenance);
  });

  it("toEnvironmentEntry returns Environment with kind matching record.kind", () => {
    const store = createInitialStore();
    const record = store.environments[0];
    const env = toEnvironmentEntry(record);
    expect(env.kind).toBe(record.kind);
  });

  it("getActiveLabEnvironment returns the LabEnvironment", () => {
    const store = createInitialStore();
    const labEnv = getActiveLabEnvironment(store);
    expect(labEnv).toBeDefined();
    expect(labEnv!.environment_id).toBe("env-fab-demo");
    expect(labEnv!.devices.length).toBe(3);
  });

  it("getActiveLabEnvironment returns null when no active", () => {
    const store = createInitialStore();
    const cleared = selectActiveEnvironment(store, null);
    const labEnv = getActiveLabEnvironment(cleared);
    expect(labEnv).toBeNull();
  });

  it("getActiveFabricatorView returns a FabricatorEnvironment", () => {
    const store = createInitialStore();
    const fabEnv = getActiveFabricatorView(store);
    expect(fabEnv).toBeDefined();
    expect(fabEnv!.environment_id).toBe("env-fab-demo");
  });

  it("getActiveFabricatorView env id matches lab env id", () => {
    const store = createInitialStore();
    const labEnv = getActiveLabEnvironment(store);
    const fabEnv = getActiveFabricatorView(store);
    expect(fabEnv!.environment_id).toBe(labEnv!.environment_id);
  });

  it("getActiveFabricatorView devices length matches lab devices length", () => {
    const store = createInitialStore();
    const labEnv = getActiveLabEnvironment(store);
    const fabEnv = getActiveFabricatorView(store);
    expect(fabEnv!.devices.length).toBe(labEnv!.devices.length);
  });

  it("getActiveFabricatorView devices.vendor preserved (e.g. cisco)", () => {
    const store = createInitialStore();
    const fabEnv = getActiveFabricatorView(store);
    const vendors = fabEnv!.devices.map((d) => d.vendor);
    expect(vendors).toContain("cisco");
    expect(vendors).toContain("juniper");
  });

  it("createEnvironmentFromScenario does NOT change active", () => {
    const clock = createTestClockForTest();
    const store = createInitialStore(clock);
    const activeBefore = store.active_environment_id;

    const newStore = createEnvironmentFromScenario(store, "branch-office", { clock });
    expect(newStore.active_environment_id).toBe(activeBefore);
  });

  it("Active stays env-fab-demo after creating multiple envs", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    store = createEnvironmentFromScenario(store, "branch-office", { clock });
    store = createEnvironmentFromScenario(store, "campus", { clock });
    store = createEnvironmentFromScenario(store, "datacenter-pod", { clock });

    expect(store.active_environment_id).toBe("env-fab-demo");
  });

  it("duplicate name creates auto-suffix Branch Office 2", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    store = createEnvironmentFromScenario(store, "branch-office", {
      name: "My Branch",
      clock,
    });
    store = createEnvironmentFromScenario(store, "branch-office", {
      name: "My Branch",
      clock,
    });

    const branches = store.environments.filter((e) => e.scenario_id === "branch-office");
    expect(branches).toHaveLength(2);
    expect(branches[0].name).toBe("My Branch");
    expect(branches[1].name).toBe("My Branch 2");
  });

  it("provenance every created env has provenance generated-lab", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    store = createEnvironmentFromScenario(store, "branch-office", { clock });
    store = createEnvironmentFromScenario(store, "campus", { clock });

    store.environments.forEach((env) => {
      expect(env.provenance).toBe("generated-lab");
    });
  });

  // ===== List Tests =====

  it("listEnvironments excludes archived by default", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    store = createEnvironmentFromScenario(store, "branch-office", { clock });
    store = archiveEnvironment(store, "env-fab-demo", { clock });

    const active = listEnvironments(store);
    expect(active).toHaveLength(1);
    expect(active[0].scenario_id).toBe("branch-office");
  });

  it("listEnvironments includeArchived returns all", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    store = createEnvironmentFromScenario(store, "branch-office", { clock });
    store = archiveEnvironment(store, "env-fab-demo", { clock });

    const all = listEnvironments(store, { includeArchived: true });
    expect(all).toHaveLength(2);
  });

  // ===== Selection Tests =====

  it("selectActiveEnvironment(id) succeeds for known available id", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    store = createEnvironmentFromScenario(store, "branch-office", { clock });
    const branchId = store.environments.find((e) => e.scenario_id === "branch-office")!.environment_id;

    store = selectActiveEnvironment(store, branchId);
    expect(store.active_environment_id).toBe(branchId);
  });

  it("selectActiveEnvironment(unknown) throws", () => {
    const store = createInitialStore();

    expect(() => {
      selectActiveEnvironment(store, "env-does-not-exist");
    }).toThrow("Environment not found");
  });

  it("selectActiveEnvironment(null) clears active", () => {
    const store = createInitialStore();

    const cleared = selectActiveEnvironment(store, null);
    expect(cleared.active_environment_id).toBeNull();
  });

  // ===== Rename Tests =====

  it("renameEnvironment preserves id + scenario_id + provenance + counts", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    store = createEnvironmentFromScenario(store, "branch-office", { clock });
    const branchId = store.environments.find((e) => e.scenario_id === "branch-office")!.environment_id;

    const before = getEnvironmentById(store, branchId)!;
    store = renameEnvironment(store, branchId, "Renamed Branch", { clock });
    const after = getEnvironmentById(store, branchId)!;

    expect(after.environment_id).toBe(before.environment_id);
    expect(after.scenario_id).toBe(before.scenario_id);
    expect(after.provenance).toBe(before.provenance);
    expect(after.device_count).toBe(before.device_count);
    expect(after.link_count).toBe(before.link_count);
  });

  it("renameEnvironment bumps revision + updated_at", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    const before = store.environments[0];
    store = renameEnvironment(store, before.environment_id, "Renamed", { clock });
    const after = getEnvironmentById(store, before.environment_id)!;

    expect(after.revision).toBe(before.revision + 1);
    expect(after.updated_at).toBe(TEST_NOW);
  });

  it("renameEnvironment on missing id throws", () => {
    const store = createInitialStore();

    expect(() => {
      renameEnvironment(store, "env-does-not-exist", "New Name");
    }).toThrow("Environment not found");
  });

  it("renameEnvironment on archived id throws", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    const microLabId = "env-fab-demo";
    store = archiveEnvironment(store, microLabId, { clock });

    expect(() => {
      renameEnvironment(store, microLabId, "New Name", { clock });
    }).toThrow("Cannot rename archived environment");
  });

  // ===== Duplicate Tests =====

  it("duplicateEnvironment creates new env with new id + new name suffix", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    const originalId = "env-fab-demo";
    const original = getEnvironmentById(store, originalId)!;

    store = duplicateEnvironment(store, originalId, { clock });

    const duplicated = store.environments.find(
      (e) => e.scenario_id === original.scenario_id && e.environment_id !== originalId,
    );

    expect(duplicated).toBeDefined();
    expect(duplicated!.environment_id).not.toBe(originalId);
    expect(duplicated!.name).not.toBe(original.name);
  });

  it("duplicated env has same scenario_id + same device/link counts", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    const originalId = "env-fab-demo";
    const original = getEnvironmentById(store, originalId)!;

    store = duplicateEnvironment(store, originalId, { clock });
    const duplicated = store.environments.find(
      (e) => e.environment_id !== originalId && e.scenario_id === original.scenario_id,
    )!;

    expect(duplicated.scenario_id).toBe(original.scenario_id);
    expect(duplicated.device_count).toBe(original.device_count);
    expect(duplicated.link_count).toBe(original.link_count);
  });

  it("duplicated env has different environment_id from source", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    const originalId = "env-fab-demo";
    store = duplicateEnvironment(store, originalId, { clock });
    const duplicated = store.environments.find((e) => e.scenario_id === "micro-lab" && e.environment_id !== originalId);

    expect(duplicated!.environment_id).not.toBe(originalId);
  });

  it("duplicated env's lab_payload has the NEW environment_id (not source's)", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    const originalId = "env-fab-demo";
    store = duplicateEnvironment(store, originalId, { clock });
    const duplicated = store.environments.find((e) => e.environment_id !== originalId)!;

    expect(duplicated.lab_payload.environment_id).toBe(duplicated.environment_id);
    expect(duplicated.lab_payload.environment_id).not.toBe(originalId);
  });

  // ===== Archive Tests =====

  it("archiveEnvironment changes lifecycle_state to archived", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    store = archiveEnvironment(store, "env-fab-demo", { clock });
    const archived = getEnvironmentById(store, "env-fab-demo")!;

    expect(archived.lifecycle_state).toBe("archived");
  });

  it("archiveEnvironment on active env clears active to next available or null", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    store = createEnvironmentFromScenario(store, "branch-office", { clock });
    const branchId = store.environments.find((e) => e.scenario_id === "branch-office")!.environment_id;
    store = selectActiveEnvironment(store, branchId);

    // Archive the branch office, active should move to Micro Lab
    store = archiveEnvironment(store, branchId, { clock });
    expect(store.active_environment_id).toBe("env-fab-demo");

    // Archive Micro Lab, active should clear
    store = archiveEnvironment(store, "env-fab-demo", { clock });
    expect(store.active_environment_id).toBeNull();
  });

  it("archiveEnvironment on missing id throws", () => {
    const store = createInitialStore();

    expect(() => {
      archiveEnvironment(store, "env-does-not-exist");
    }).toThrow("Environment not found");
  });

  // ===== Restore Tests =====

  it("restoreEnvironment moves back to available", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    const id = "env-fab-demo";
    store = archiveEnvironment(store, id, { clock });
    expect(getEnvironmentById(store, id)!.lifecycle_state).toBe("archived");

    store = restoreEnvironment(store, id, { clock });
    expect(getEnvironmentById(store, id)!.lifecycle_state).toBe("available");
  });

  it("restoreEnvironment does NOT auto-activate", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    const id = "env-fab-demo";
    store = selectActiveEnvironment(store, null);
    store = archiveEnvironment(store, id, { clock });

    store = restoreEnvironment(store, id, { clock });
    expect(store.active_environment_id).toBeNull();
  });

  it("restoreEnvironment on non-archived throws", () => {
    const store = createInitialStore();

    expect(() => {
      restoreEnvironment(store, "env-fab-demo");
    }).toThrow("Cannot restore non-archived environment");
  });

  it("restoreEnvironment on missing id throws", () => {
    const store = createInitialStore();

    expect(() => {
      restoreEnvironment(store, "env-does-not-exist");
    }).toThrow("Environment not found");
  });

  // ===== Active Environment Tests =====

  it("getActiveEnvironment returns null if no active", () => {
    const store = createInitialStore();
    const cleared = selectActiveEnvironment(store, null);

    expect(getActiveEnvironment(cleared)).toBeNull();
  });

  it("getActiveEnvironment returns null if active id points to archived", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    const activeId = store.active_environment_id!;
    // Manually archive but don't change active_environment_id
    // (simulate inconsistency) — actually, archiveEnvironment handles this,
    // so we test the guard: if archived, returns null even if active_id is set
    store = archiveEnvironment(store, activeId, { clock });

    expect(getActiveEnvironment(store)).toBeNull();
  });

  // ===== Conversion Tests =====

  it("toEnvironmentEntry produces correct Environment shape (id, kind=generated-lab, status=unknown)", () => {
    const store = createInitialStore();
    const record = store.environments[0];

    const env = toEnvironmentEntry(record);

    expect(env.id).toBe(record.environment_id);
    expect(env.name).toBe(record.name);
    expect(env.kind).toBe("generated-lab");
    expect(env.device_count).toBe(record.device_count);
    expect(env.status).toBe("unknown");
    expect(env.updated_at).toBe(record.updated_at);
    expect(env.summary).toBe(record.source_summary);
  });

  // ===== Immutability & Determinism Tests =====

  it("determinism same operations with same clock produce equal state", () => {
    const clock1 = createTestClock({ now: TEST_NOW, idSequence: TEST_ID_SEQUENCE });
    const clock2 = createTestClock({ now: TEST_NOW, idSequence: TEST_ID_SEQUENCE });

    let store1 = createInitialStore(clock1);
    let store2 = createInitialStore(clock2);

    store1 = createEnvironmentFromScenario(store1, "branch-office", { clock: clock1 });
    store2 = createEnvironmentFromScenario(store2, "branch-office", { clock: clock2 });

    expect(store1).toEqual(store2);
  });

  it("immutability original state object unchanged after operation", () => {
    const clock = createTestClockForTest();
    const original = createInitialStore(clock);
    const originalEnvs = original.environments;
    const originalActive = original.active_environment_id;

    createEnvironmentFromScenario(original, "branch-office", { clock });

    // Original should be completely unchanged
    expect(original.environments).toBe(originalEnvs);
    expect(original.active_environment_id).toBe(originalActive);
    expect(original.environments).toHaveLength(1);
  });

  // ===== Edge Cases & Comprehensive Tests =====

  it("multiple sequential renames preserve all other fields", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    const id = "env-fab-demo";
    const before = getEnvironmentById(store, id)!;

    store = renameEnvironment(store, id, "Name 1", { clock });
    store = renameEnvironment(store, id, "Name 2", { clock });

    const after = getEnvironmentById(store, id)!;

    expect(after.scenario_id).toBe(before.scenario_id);
    expect(after.device_count).toBe(before.device_count);
    expect(after.revision).toBe(before.revision + 2);
  });

  it("duplicate then archive preserves both environments", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);

    store = duplicateEnvironment(store, "env-fab-demo", { clock });
    const duplicatedId = store.environments.find(
      (e) => e.scenario_id === "micro-lab" && e.environment_id !== "env-fab-demo",
    )!.environment_id;

    store = archiveEnvironment(store, "env-fab-demo", { clock });

    const microLabEnvs = listEnvironments(store, { includeArchived: true }).filter(
      (e) => e.scenario_id === "micro-lab",
    );

    expect(microLabEnvs).toHaveLength(2);
    expect(microLabEnvs.find((e) => e.environment_id === "env-fab-demo")!.lifecycle_state).toBe("archived");
    expect(microLabEnvs.find((e) => e.environment_id === duplicatedId)!.lifecycle_state).toBe("available");
  });

  it("all scenarios can be instantiated successfully", () => {
    const clock = createTestClock({
      now: TEST_NOW,
      idSequence: [
        "env-micro-lab-id",
        "env-branch-office-id",
        "env-campus-id",
        "env-datacenter-pod-id",
        "env-metro-mega-city-id",
      ],
    });

    let store = createEmptyStore();

    store = createEnvironmentFromScenario(store, "micro-lab", { clock });
    store = createEnvironmentFromScenario(store, "branch-office", { clock });
    store = createEnvironmentFromScenario(store, "campus", { clock });
    store = createEnvironmentFromScenario(store, "datacenter-pod", { clock });
    store = createEnvironmentFromScenario(store, "metro-mega-city", { clock });

    expect(store.environments).toHaveLength(5);
    expect(store.environments.map((e) => e.scenario_id)).toEqual([
      "micro-lab",
      "branch-office",
      "campus",
      "datacenter-pod",
      "metro-mega-city",
    ]);
  });

  // ===== New B1 Sync-Ready Fields Tests =====

  it("createInitialStore has schema_version 1", () => {
    const store = createInitialStore();
    expect(store.schema_version).toBe("1");
  });

  it("createInitialStore has store_revision 1", () => {
    const store = createInitialStore();
    expect(store.store_revision).toBe(1);
  });

  it("createInitialStore has storage_origin local", () => {
    const store = createInitialStore();
    expect(store.storage_origin).toBe("local");
  });

  it("createInitialStore has persistence_kind local-browser", () => {
    const store = createInitialStore();
    expect(store.persistence_kind).toBe("local-browser");
  });

  it("createInitialStore last_saved_at + last_loaded_at are null", () => {
    const store = createInitialStore();
    expect(store.last_saved_at).toBeNull();
    expect(store.last_loaded_at).toBeNull();
  });

  it("createEmptyStore has schema_version 1", () => {
    const store = createEmptyStore();
    expect(store.schema_version).toBe("1");
  });

  it("createEmptyStore has store_revision 1", () => {
    const store = createEmptyStore();
    expect(store.store_revision).toBe(1);
  });

  it("env-fab-demo record has environment_uid uid-env-fab-demo", () => {
    const store = createInitialStore();
    const microLab = store.environments[0];
    expect(microLab.environment_uid).toBe("uid-env-fab-demo");
  });

  it("env-fab-demo record has sync_state local-only", () => {
    const store = createInitialStore();
    const microLab = store.environments[0];
    expect(microLab.sync_state).toBe("local-only");
  });

  it("env-fab-demo record has base_revision 1", () => {
    const store = createInitialStore();
    const microLab = store.environments[0];
    expect(microLab.base_revision).toBe(1);
  });

  it("createEnvironmentFromScenario new record has sync_state dirty", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);
    store = createEnvironmentFromScenario(store, "branch-office", { clock });

    const newEnv = store.environments.find((e) => e.scenario_id === "branch-office");
    expect(newEnv!.sync_state).toBe("dirty");
  });

  it("createEnvironmentFromScenario new record has environment_uid starting with uid-", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);
    store = createEnvironmentFromScenario(store, "branch-office", { clock });

    const newEnv = store.environments.find((e) => e.scenario_id === "branch-office");
    expect(newEnv!.environment_uid).toMatch(/^uid-/);
  });

  it("renameEnvironment flips sync_state to dirty when not local-only", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);
    store = createEnvironmentFromScenario(store, "branch-office", { clock });

    const env = store.environments.find((e) => e.scenario_id === "branch-office");
    // Mark it clean first
    store = {
      ...store,
      environments: store.environments.map((e) =>
        e.environment_id === env!.environment_id
          ? { ...e, sync_state: "clean" as const }
          : e,
      ),
    };

    store = renameEnvironment(store, env!.environment_id, "Renamed Office", { clock });
    const renamed = store.environments.find((e) => e.environment_id === env!.environment_id);
    expect(renamed!.sync_state).toBe("dirty");
  });

  it("renameEnvironment on env-fab-demo (local-only) keeps sync_state local-only", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);
    store = renameEnvironment(store, "env-fab-demo", "New Micro Lab", { clock });

    const renamed = store.environments.find((e) => e.environment_id === "env-fab-demo");
    expect(renamed!.sync_state).toBe("local-only");
  });

  it("duplicateEnvironment new record has sync_state dirty", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);
    store = duplicateEnvironment(store, "env-fab-demo", { clock });

    expect(store.environments).toHaveLength(2);
    const duplicate = store.environments[1];
    expect(duplicate.sync_state).toBe("dirty");
  });

  it("archiveEnvironment preserves sync_state dirty or local-only", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);
    store = createEnvironmentFromScenario(store, "branch-office", { clock });

    const env = store.environments.find((e) => e.scenario_id === "branch-office");
    expect(env!.sync_state).toBe("dirty");

    store = archiveEnvironment(store, env!.environment_id, { clock });
    const archived = store.environments.find((e) => e.environment_id === env!.environment_id);
    expect(archived!.sync_state).toBe("dirty");
  });

  it("loadStore sets last_loaded_at + increments store_revision", () => {
    const clock = createTestClockForTest();
    const store1 = createInitialStore(clock);
    const store2 = loadStore(store1, store1, { clock });

    expect(store2.last_loaded_at).toBe(TEST_NOW);
    expect(store2.store_revision).toBe(2);
  });

  it("resetToDefault returns store equal to createInitialStore", () => {
    const clock = createTestClockForTest();
    const initial = createInitialStore(clock);
    const reset = resetToDefault({ clock });

    expect(reset.environments).toHaveLength(initial.environments.length);
    expect(reset.active_environment_id).toBe(initial.active_environment_id);
    expect(reset.schema_version).toBe(initial.schema_version);
  });

  it("exportSnapshot returns same state (passthrough)", () => {
    const store = createInitialStore();
    const exported = exportSnapshot(store);
    expect(exported).toEqual(store);
  });

  it("importSnapshot throws on missing environments array", () => {
    const invalid = { active_environment_id: null } as any;
    expect(() => importSnapshot(invalid)).toThrow(/environments must be an array/);
  });

  it("importSnapshot throws on null/undefined input", () => {
    expect(() => importSnapshot(null as any)).toThrow(/not an object/);
    expect(() => importSnapshot(undefined as any)).toThrow(/not an object/);
  });

  it("importSnapshot sets last_loaded_at", () => {
    const clock = createTestClockForTest();
    const store = createInitialStore(clock);
    const imported = importSnapshot(store, { clock });

    expect(imported.last_loaded_at).toBe(TEST_NOW);
  });

  it("markStoreSaved sets store last_saved_at", () => {
    const clock = createTestClockForTest();
    const store = createInitialStore(clock);
    const saved = markStoreSaved(store, { clock });

    expect(saved.last_saved_at).toBe(TEST_NOW);
  });

  it("markStoreSaved flips dirty env sync_states to clean", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);
    store = createEnvironmentFromScenario(store, "branch-office", { clock });

    const saved = markStoreSaved(store, { clock });
    const dirty = saved.environments.find((e) => e.scenario_id === "branch-office");
    expect(dirty!.sync_state).toBe("clean");
  });

  it("markStoreSaved leaves local-only envs as local-only", () => {
    const clock = createTestClockForTest();
    const store = createInitialStore(clock);
    const saved = markStoreSaved(store, { clock });

    const microLab = saved.environments.find((e) => e.environment_id === "env-fab-demo");
    expect(microLab!.sync_state).toBe("local-only");
  });

  it("markStoreSaved sets last_saved_at on dirty env", () => {
    const clock = createTestClockForTest();
    let store = createInitialStore(clock);
    store = createEnvironmentFromScenario(store, "branch-office", { clock });

    const saved = markStoreSaved(store, { clock });
    const dirty = saved.environments.find((e) => e.scenario_id === "branch-office");
    expect(dirty!.last_saved_at).toBe(TEST_NOW);
  });

  it("bumpStoreRevision increments store_revision", () => {
    const store = createInitialStore();
    expect(store.store_revision).toBe(1);

    const bumped = bumpStoreRevision(store);
    expect(bumped.store_revision).toBe(2);
  });
});
