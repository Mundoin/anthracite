/**
 * D3B — Cortex overlay state + deterministic ranking.
 *
 * Pure utilities that turn a query string into a ranked list of
 * CortexEntry results sourced from `cortexCatalogueAdapter.getCortexIndex`.
 *
 * Ranking tiers (lower wins; ties resolve via catalogue/DFS order):
 *   1. exact match on mode label OR mode id
 *   2. starts-with on mode label OR mode id
 *   3. child exact match OR starts-with on child label / last path segment
 *   4. any breadcrumb segment contains
 *   5. label contains
 *
 * Empty query returns the curated default — every mode + every foot entry.
 *
 * No fuzzy library. No AI. Deterministic.
 *
 * Obeys D3_NAV_SPEC §7 (Cortex jump · Concept D).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CortexEntry,
  CortexSection,
} from "../navigation/cortexCatalogueAdapter";
import {
  getCortexIndex,
  groupCortexEntries,
} from "../navigation/cortexCatalogueAdapter";
import type { ModeCatalogue } from "../../contracts/modeCatalogue";

const NO_MATCH = Number.POSITIVE_INFINITY;

/** Lower number = higher priority. NO_MATCH means the entry should be filtered out. */
export function rankEntry(entry: CortexEntry, queryLower: string): number {
  if (queryLower.length === 0) return 0;

  const labelLower = entry.label.toLowerCase();

  if (entry.kind === "mode") {
    const modeIdLower = entry.modeId.toLowerCase();
    if (labelLower === queryLower || modeIdLower === queryLower) return 1;
    if (labelLower.startsWith(queryLower) || modeIdLower.startsWith(queryLower)) return 2;
  }

  if (entry.kind === "child") {
    const lastSegment = entry.childPath[entry.childPath.length - 1] ?? "";
    if (labelLower === queryLower || lastSegment.toLowerCase() === queryLower) return 3;
    if (labelLower.startsWith(queryLower) || lastSegment.toLowerCase().startsWith(queryLower)) return 3;
  }

  for (const segment of entry.breadcrumb) {
    if (segment.toLowerCase().includes(queryLower)) return 4;
  }

  if (labelLower.includes(queryLower)) return 5;

  return NO_MATCH;
}

/** Deterministic rank: tier ascending, then stable input order for ties. */
export function rankEntries(
  index: readonly CortexEntry[],
  query: string,
): readonly CortexEntry[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return defaultEntries(index);
  }
  const lower = trimmed.toLowerCase();

  const ranked: { entry: CortexEntry; tier: number; order: number }[] = [];
  for (let i = 0; i < index.length; i += 1) {
    const entry = index[i];
    const tier = rankEntry(entry, lower);
    if (tier === NO_MATCH) continue;
    ranked.push({ entry, tier, order: i });
  }

  ranked.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return a.order - b.order;
  });

  return ranked.map((r) => r.entry);
}

/** Empty-query default — modes + foot entries only. Stable catalogue order. */
export function defaultEntries(index: readonly CortexEntry[]): readonly CortexEntry[] {
  return index.filter((e) => e.kind === "mode" || e.kind === "foot");
}

/** Convenience — rank then bucket by scope. */
export function buildSections(
  index: readonly CortexEntry[],
  query: string,
): readonly CortexSection[] {
  return groupCortexEntries(rankEntries(index, query));
}

// ---------------------------------------------------------------------------
// Overlay state hook
// ---------------------------------------------------------------------------

export interface CortexOverlayState {
  readonly query: string;
  readonly highlightedIndex: number;
  readonly results: readonly CortexEntry[];
  readonly sections: readonly CortexSection[];
  readonly setQuery: (query: string) => void;
  readonly moveHighlight: (delta: number) => void;
  readonly setHighlightedIndex: (index: number) => void;
  readonly activateHighlighted: () => void;
  readonly reset: () => void;
}

export interface UseCortexOverlayParams {
  readonly catalogue: ModeCatalogue;
  readonly open: boolean;
  readonly onActivate: (entry: CortexEntry) => void;
}

/**
 * Owns query + highlightedIndex. Rebuilds results on query change.
 * When `open` flips false → true, resets state. Pure-ish: only state is
 * the query + highlight; results are memoized from the catalogue.
 */
export function useCortexOverlay(params: UseCortexOverlayParams): CortexOverlayState {
  const { catalogue, open, onActivate } = params;
  const [query, setQueryState] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const index = useMemo(() => getCortexIndex(catalogue), [catalogue]);

  const results = useMemo(() => rankEntries(index, query), [index, query]);
  const sections = useMemo(() => groupCortexEntries(results), [results]);

  // Reset on open transition.
  useEffect(() => {
    if (open) {
      setQueryState("");
      setHighlightedIndex(0);
    }
  }, [open]);

  // Clamp highlight when results shrink/grow.
  useEffect(() => {
    if (highlightedIndex >= results.length) {
      setHighlightedIndex(results.length > 0 ? results.length - 1 : 0);
    }
  }, [results.length, highlightedIndex]);

  const setQuery = useCallback((next: string) => {
    setQueryState(next);
    setHighlightedIndex(0);
  }, []);

  const moveHighlight = useCallback(
    (delta: number) => {
      if (results.length === 0) return;
      setHighlightedIndex((prior) => {
        const next = (prior + delta + results.length) % results.length;
        return next;
      });
    },
    [results.length],
  );

  const activateHighlighted = useCallback(() => {
    const entry = results[highlightedIndex];
    if (entry) onActivate(entry);
  }, [results, highlightedIndex, onActivate]);

  const reset = useCallback(() => {
    setQueryState("");
    setHighlightedIndex(0);
  }, []);

  return {
    query,
    highlightedIndex,
    results,
    sections,
    setQuery,
    moveHighlight,
    setHighlightedIndex,
    activateHighlighted,
    reset,
  };
}
