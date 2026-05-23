/**
 * Sync Envelope Tests (B1/B2).
 *
 * Comprehensive test suite for sync metadata and revision comparison.
 */

import { describe, it, expect } from "vitest";
import type { LocalEnvironmentRecord } from "../../types/localEnvironment";
import type { SyncEnvelope } from "../environmentSyncEnvelope";
import {
  markSaved,
  markDirtyOnMutation,
  prepareSyncEnvelope,
  validateSyncEnvelope,
  compareRevision,
  canApplyRemoteUpdate,
  detectBasicConflict,
} from "../environmentSyncEnvelope";
import { createTestClock } from "../environmentLifecycle";

const TEST_NOW = "2026-05-23T10:00:00Z";
const TEST_CLOCK = createTestClock({
  now: TEST_NOW,
  idSequence: ["env-test-0001"],
});

// Helper to create a minimal test record
function createTestRecord(overrides?: Partial<LocalEnvironmentRecord>): LocalEnvironmentRecord {
  return {
    environment_id: "env-test-0001",
    name: "Test Env",
    kind: "generated-lab",
    scenario_id: "test-scenario",
    scenario_name: "Test Scenario",
    scenario_seed: "seed-abc123",
    provenance: "generated-lab",
    status: "unknown",
    created_at: TEST_NOW,
    updated_at: TEST_NOW,
    source_summary: "Test environment",
    device_count: 3,
    link_count: 2,
    config_count: 1,
    lab_payload: {} as any,
    capability_flags: {} as any,
    generator_version: "1.0.0",
    lifecycle_state: "available",
    revision: 1,
    origin: "local",
    source_id: null,
    sync_state: "dirty",
    local_only: true,
    environment_uid: "uid-env-test-0001",
    base_revision: 1,
    last_saved_at: null,
    last_loaded_at: null,
    updated_by: null,
    ...overrides,
  };
}

// Helper to create a minimal test envelope
function createTestEnvelope(overrides?: Partial<SyncEnvelope>): SyncEnvelope {
  return {
    envelope_version: "1",
    environment_uid: "uid-env-test-0001",
    environment_id: "env-test-0001",
    revision: 1,
    base_revision: 1,
    origin: "local",
    source_id: null,
    sync_state: "dirty",
    local_only: true,
    scenario_id: "test-scenario",
    scenario_seed: "seed-abc123",
    generator_version: "1.0.0",
    updated_at: TEST_NOW,
    updated_by: null,
    payload_hash: "1:1:seed-abc123:2026-05-23T10:00:00Z",
    ...overrides,
  };
}

describe("Sync Envelope Functions", () => {
  describe("markSaved", () => {
    it("flips dirty → clean", () => {
      const record = createTestRecord({ sync_state: "dirty" });
      const saved = markSaved(record, { clock: TEST_CLOCK });
      expect(saved.sync_state).toBe("clean");
    });

    it("preserves local-only on mark saved", () => {
      const record = createTestRecord({ sync_state: "local-only" });
      const saved = markSaved(record, { clock: TEST_CLOCK });
      expect(saved.sync_state).toBe("local-only");
    });

    it("sets last_saved_at on dirty", () => {
      const record = createTestRecord({ sync_state: "dirty", last_saved_at: null });
      const saved = markSaved(record, { clock: TEST_CLOCK });
      expect(saved.last_saved_at).toBe(TEST_NOW);
    });

    it("does not update last_saved_at if already local-only", () => {
      const record = createTestRecord({
        sync_state: "local-only",
        last_saved_at: null,
      });
      const saved = markSaved(record, { clock: TEST_CLOCK });
      expect(saved.last_saved_at).toBeNull();
    });
  });

  describe("markDirtyOnMutation", () => {
    it("bumps revision and sets dirty", () => {
      const record = createTestRecord({ sync_state: "clean", revision: 3 });
      const mutated = markDirtyOnMutation(record, { clock: TEST_CLOCK });
      expect(mutated.revision).toBe(4);
      expect(mutated.sync_state).toBe("dirty");
    });

    it("bumps revision but preserves local-only", () => {
      const record = createTestRecord({ sync_state: "local-only", revision: 2 });
      const mutated = markDirtyOnMutation(record, { clock: TEST_CLOCK });
      expect(mutated.revision).toBe(3);
      expect(mutated.sync_state).toBe("local-only");
    });

    it("updates updated_at", () => {
      const record = createTestRecord({
        sync_state: "clean",
        updated_at: "2026-05-22T00:00:00Z",
      });
      const mutated = markDirtyOnMutation(record, { clock: TEST_CLOCK });
      expect(mutated.updated_at).toBe(TEST_NOW);
    });
  });

  describe("prepareSyncEnvelope", () => {
    it("returns envelope_version 1", () => {
      const record = createTestRecord();
      const envelope = prepareSyncEnvelope(record);
      expect(envelope.envelope_version).toBe("1");
    });

    it("includes all required fields", () => {
      const record = createTestRecord();
      const envelope = prepareSyncEnvelope(record);
      expect(envelope.environment_uid).toBeDefined();
      expect(envelope.environment_id).toBeDefined();
      expect(envelope.revision).toBeDefined();
      expect(envelope.base_revision).toBeDefined();
      expect(envelope.sync_state).toBeDefined();
    });

    it("is JSON-serializable", () => {
      const record = createTestRecord();
      const envelope = prepareSyncEnvelope(record);
      const json = JSON.stringify(envelope);
      const parsed = JSON.parse(json);
      expect(parsed.environment_uid).toBe(envelope.environment_uid);
      expect(parsed.revision).toBe(envelope.revision);
    });

    it("generates deterministic payload_hash", () => {
      const record = createTestRecord();
      const envelope1 = prepareSyncEnvelope(record);
      const envelope2 = prepareSyncEnvelope(record);
      expect(envelope1.payload_hash).toBe(envelope2.payload_hash);
    });

    it("differs payload_hash when revision differs", () => {
      const record1 = createTestRecord({ revision: 1 });
      const record2 = createTestRecord({ revision: 2 });
      const envelope1 = prepareSyncEnvelope(record1);
      const envelope2 = prepareSyncEnvelope(record2);
      expect(envelope1.payload_hash).not.toBe(envelope2.payload_hash);
    });
  });

  describe("validateSyncEnvelope", () => {
    it("rejects missing envelope_version", () => {
      const envelope = createTestEnvelope({
        envelope_version: "" as any,
      });
      const result = validateSyncEnvelope(envelope);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("envelope_version"))).toBe(
        true,
      );
    });

    it("rejects revision <= 0", () => {
      const envelope = createTestEnvelope({ revision: 0 });
      const result = validateSyncEnvelope(envelope);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("revision"))).toBe(true);
    });

    it("rejects base_revision < 0", () => {
      const envelope = createTestEnvelope({ base_revision: -1 });
      const result = validateSyncEnvelope(envelope);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("base_revision"))).toBe(
        true,
      );
    });

    it("rejects unknown sync_state", () => {
      const envelope = createTestEnvelope({
        sync_state: "invalid-state" as any,
      });
      const result = validateSyncEnvelope(envelope);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => e.includes("sync_state"))).toBe(true);
    });

    it("accepts valid envelope", () => {
      const envelope = createTestEnvelope();
      const result = validateSyncEnvelope(envelope);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("compareRevision", () => {
    it("returns equal when revisions match", () => {
      const local = createTestEnvelope({ revision: 5, base_revision: 4 });
      const remote = createTestEnvelope({ revision: 5, base_revision: 4 });
      expect(compareRevision(local, remote)).toBe("equal");
    });

    it("returns local-ahead when local.revision > remote.revision", () => {
      const local = createTestEnvelope({ revision: 6 });
      const remote = createTestEnvelope({ revision: 5 });
      expect(compareRevision(local, remote)).toBe("local-ahead");
    });

    it("returns remote-ahead when remote ahead + no local drift", () => {
      const local = createTestEnvelope({
        revision: 4,
        base_revision: 3,
      });
      const remote = createTestEnvelope({
        revision: 5,
        base_revision: 4,
      });
      expect(compareRevision(local, remote)).toBe("remote-ahead");
    });

    it("returns diverged when both advanced", () => {
      // Same revision but different bases: both made changes from different starting points
      // Local: rev=6, base=4  Remote: rev=6, base=2
      // This indicates they both advanced but from incompatible bases
      const local = createTestEnvelope({
        revision: 6,
        base_revision: 4,
      });
      const remote = createTestEnvelope({
        revision: 6,
        base_revision: 2,
      });
      expect(compareRevision(local, remote)).toBe("diverged");
    });
  });

  describe("canApplyRemoteUpdate", () => {
    it("returns true on remote-ahead", () => {
      const local = createTestEnvelope({
        revision: 4,
        base_revision: 3,
      });
      const remote = createTestEnvelope({
        revision: 5,
        base_revision: 4,
      });
      expect(canApplyRemoteUpdate(local, remote)).toBe(true);
    });

    it("returns false on diverged", () => {
      const local = createTestEnvelope({
        revision: 8,
        base_revision: 5,
      });
      const remote = createTestEnvelope({
        revision: 7,
        base_revision: 4,
      });
      expect(canApplyRemoteUpdate(local, remote)).toBe(false);
    });

    it("returns false on local-ahead", () => {
      const local = createTestEnvelope({ revision: 7 });
      const remote = createTestEnvelope({ revision: 5 });
      expect(canApplyRemoteUpdate(local, remote)).toBe(false);
    });

    it("returns false on equal", () => {
      const local = createTestEnvelope({ revision: 5 });
      const remote = createTestEnvelope({ revision: 5 });
      expect(canApplyRemoteUpdate(local, remote)).toBe(false);
    });
  });

  describe("detectBasicConflict", () => {
    it("returns true only on diverged", () => {
      // Same revision but different bases — indicates conflict
      // Local has base=4, remote has base=2, both at revision 5
      // This means they diverged from different points
      const local = createTestEnvelope({
        revision: 5,
        base_revision: 4,
      });
      const remote = createTestEnvelope({
        revision: 5,
        base_revision: 2,
      });
      expect(detectBasicConflict(local, remote)).toBe(true);
    });

    it("returns false on equal", () => {
      const local = createTestEnvelope({ revision: 5 });
      const remote = createTestEnvelope({ revision: 5 });
      expect(detectBasicConflict(local, remote)).toBe(false);
    });

    it("returns false on local-ahead", () => {
      const local = createTestEnvelope({ revision: 7 });
      const remote = createTestEnvelope({ revision: 5 });
      expect(detectBasicConflict(local, remote)).toBe(false);
    });

    it("returns false on remote-ahead", () => {
      const local = createTestEnvelope({
        revision: 4,
        base_revision: 3,
      });
      const remote = createTestEnvelope({
        revision: 5,
        base_revision: 4,
      });
      expect(detectBasicConflict(local, remote)).toBe(false);
    });
  });
});
