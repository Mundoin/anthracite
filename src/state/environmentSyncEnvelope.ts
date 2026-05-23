/**
 * Sync Envelope & Revision Comparison (B1/B2).
 *
 * Pure functions for sync-ready metadata and conflict detection.
 * No React, no side effects.
 */

import type { LocalEnvironmentRecord } from "../types/localEnvironment";
import type { LifecycleClock } from "./environmentLifecycle";
import { DEFAULT_LIFECYCLE_CLOCK } from "./environmentLifecycle";

/**
 * Sync envelope: complete sync-ready metadata for a single environment.
 * Serializable to JSON for transport.
 */
export interface SyncEnvelope {
  readonly envelope_version: "1";
  readonly environment_uid: string;
  readonly environment_id: string;
  readonly revision: number;
  readonly base_revision: number;
  readonly origin: "local";
  readonly source_id: string | null;
  readonly sync_state: LocalEnvironmentRecord["sync_state"];
  readonly local_only: boolean;
  readonly scenario_id: string;
  readonly scenario_seed: string;
  readonly generator_version: string;
  readonly updated_at: string;
  readonly updated_by: string | null;
  readonly payload_hash: string;
}

/**
 * Validation result for sync envelopes.
 */
export interface SyncEnvelopeValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

/**
 * Mark a record as saved.
 * Flips "dirty" → "clean", preserves "local-only".
 * Sets last_saved_at.
 */
export function markSaved(
  record: LocalEnvironmentRecord,
  options?: { readonly clock?: LifecycleClock },
): LocalEnvironmentRecord {
  const c = options?.clock ?? DEFAULT_LIFECYCLE_CLOCK;
  if (record.sync_state === "dirty") {
    return {
      ...record,
      sync_state: "clean" as const,
      last_saved_at: c.now(),
    };
  }
  return record;
}

/**
 * Mark a record dirty on mutation.
 * Bumps revision, sets sync_state "dirty" unless "local-only".
 * Updates updated_at.
 */
export function markDirtyOnMutation(
  record: LocalEnvironmentRecord,
  options?: { readonly clock?: LifecycleClock },
): LocalEnvironmentRecord {
  const c = options?.clock ?? DEFAULT_LIFECYCLE_CLOCK;
  if (record.sync_state === "local-only") {
    return {
      ...record,
      revision: record.revision + 1,
      updated_at: c.now(),
    };
  }
  return {
    ...record,
    revision: record.revision + 1,
    updated_at: c.now(),
    sync_state: "dirty" as const,
  };
}

/**
 * Produce a sync envelope from a record.
 * payload_hash = deterministic hash of (revision, base_revision, scenario_seed, updated_at).
 */
export function prepareSyncEnvelope(record: LocalEnvironmentRecord): SyncEnvelope {
  const payloadHash = `${record.revision}:${record.base_revision}:${record.scenario_seed}:${record.updated_at}`;
  return {
    envelope_version: "1",
    environment_uid: record.environment_uid,
    environment_id: record.environment_id,
    revision: record.revision,
    base_revision: record.base_revision,
    origin: "local",
    source_id: record.source_id,
    sync_state: record.sync_state,
    local_only: record.local_only,
    scenario_id: record.scenario_id,
    scenario_seed: record.scenario_seed,
    generator_version: record.generator_version,
    updated_at: record.updated_at,
    updated_by: record.updated_by,
    payload_hash: payloadHash,
  };
}

/**
 * Validate a sync envelope.
 * Checks envelope_version "1", required fields, revision > 0, base_revision >= 0, sync_state in allowed set.
 */
export function validateSyncEnvelope(envelope: SyncEnvelope): SyncEnvelopeValidationResult {
  const errors: string[] = [];

  if (envelope.envelope_version !== "1") {
    errors.push(`Invalid envelope_version: expected "1", got "${envelope.envelope_version}"`);
  }
  if (!envelope.environment_uid || typeof envelope.environment_uid !== "string") {
    errors.push("Missing or invalid environment_uid");
  }
  if (!envelope.environment_id || typeof envelope.environment_id !== "string") {
    errors.push("Missing or invalid environment_id");
  }
  if (typeof envelope.revision !== "number" || envelope.revision <= 0) {
    errors.push(`Invalid revision: expected > 0, got ${envelope.revision}`);
  }
  if (typeof envelope.base_revision !== "number" || envelope.base_revision < 0) {
    errors.push(`Invalid base_revision: expected >= 0, got ${envelope.base_revision}`);
  }
  const validSyncStates = ["local-only", "clean", "dirty", "pending-sync", "conflict", "remote-shadow"];
  if (!validSyncStates.includes(envelope.sync_state)) {
    errors.push(`Invalid sync_state: "${envelope.sync_state}"`);
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

/**
 * Revision comparison result.
 */
export type RevisionComparison = "equal" | "local-ahead" | "remote-ahead" | "diverged";

/**
 * Compare local and remote revisions.
 * - equal: revisions match and base_revision consistent
 * - local-ahead: local.revision > remote.revision
 * - remote-ahead: remote.revision > local.revision AND local.base_revision <= remote.revision (no divergence)
 * - diverged: both advanced independently (local drift + remote changes)
 */
export function compareRevision(local: SyncEnvelope, remote: SyncEnvelope): RevisionComparison {
  if (local.revision === remote.revision && local.base_revision === remote.base_revision) {
    return "equal";
  }
  if (local.revision > remote.revision) {
    return "local-ahead";
  }
  if (remote.revision > local.revision && local.base_revision <= remote.revision) {
    return "remote-ahead";
  }
  return "diverged";
}

/**
 * Check if a remote update can be applied cleanly.
 * True only when comparison is "remote-ahead" with no local divergence.
 */
export function canApplyRemoteUpdate(local: SyncEnvelope, remote: SyncEnvelope): boolean {
  return compareRevision(local, remote) === "remote-ahead";
}

/**
 * Detect basic conflict between local and remote.
 * True only when comparison is "diverged".
 */
export function detectBasicConflict(local: SyncEnvelope, remote: SyncEnvelope): boolean {
  return compareRevision(local, remote) === "diverged";
}
