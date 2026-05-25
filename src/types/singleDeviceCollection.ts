/**
 * V1CF — Single-Device Read-Only Collector Run.
 *
 * Pure result shape for a fixture-backed deterministic collector run
 * against one V1CC target. No field execution. Receipt emitted via
 * V1CD `buildCollectionReceipt` so counts cannot drift.
 *
 * Doctrine:
 *   - `no_field_contact: true` is a literal — V1CF cannot run live.
 *     V1CG / V1CH will introduce real runners behind a different
 *     type, not by flipping this one.
 *   - Source kind on the emitted receipt is "demo" at v0 since the
 *     facts come from a fixture, not the device. A later stage that
 *     replays real captures can promote it to "live" honestly.
 */

import type { CollectionReceipt } from "./collectionReceipt";

export type SingleDeviceCollectorStatus = "ok" | "blocked" | "error";

export interface SingleDeviceCollectionRun {
  readonly id: string;
  readonly target_id: string;
  readonly fixture_id: string | null;
  readonly no_field_contact: true;
  readonly status: SingleDeviceCollectorStatus;
  readonly reason: string;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  readonly receipt: CollectionReceipt | null;
  readonly generated_at: string;
}
