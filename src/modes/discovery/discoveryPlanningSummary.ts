/**
 * V1BN — Discovery Planning Summary (pure derivation).
 *
 * Derives counts-only summary from Discovery planning state.
 * No credentials, no labels, no raw text — counts only.
 *
 * Discipline:
 *   - Staged count = enabled seeds only.
 *   - Total count = all seeds in plan.
 *   - History count = entries in run history.
 */

import type { SeedEntry } from "./seedPlanner";
import type { DiscoveryRunHistory } from "./discoveryRunHistory";

export interface DiscoveryPlanningSummary {
  readonly staged_seed_count: number;  // enabled seeds in plan
  readonly total_seed_count: number;   // all seeds in plan
  readonly history_entry_count: number; // length of history log
}

export function buildDiscoveryPlanningSummary(
  seeds: ReadonlyArray<SeedEntry>,
  history: DiscoveryRunHistory,
): DiscoveryPlanningSummary {
  return {
    total_seed_count: seeds.length,
    staged_seed_count: seeds.filter((s) => s.enabled !== false).length,
    history_entry_count: history.entries.length,
  };
}

export const EMPTY_DISCOVERY_PLANNING_SUMMARY: DiscoveryPlanningSummary = {
  staged_seed_count: 0,
  total_seed_count: 0,
  history_entry_count: 0,
};
