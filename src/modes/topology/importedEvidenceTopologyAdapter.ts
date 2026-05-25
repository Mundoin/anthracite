/**
 * V1CB — Imported Evidence → Topology Adapter (stub-grade v0).
 *
 * First imported-evidence path into the source-neutral topology pipeline.
 *
 * Purpose:
 *   Take an existing imported-evidence GraphReadyTopologyView (produced
 *   by V1AS buildTopologyReviewModel from imported neighbour facts) and
 *   stamp it with TopologySourceInfo kind="imported". After this, the
 *   Blueprint canvas reads Source = Imported in the header, V1BX
 *   affectedFocus uses the kind for plumbing, and V1BZ Diagnose handoff
 *   carries source_kind/freshness through to the Diagnose stub.
 *
 * Out of scope for V1CB:
 *   - Live device contact.
 *   - Credentials.
 *   - Polling / background daemon.
 *   - Parser changes.
 *   - Receipt model (V1CD).
 *   - Multi-source merge (M2.1).
 *
 * Pure / deterministic — no I/O, no Date.now().
 */

import type { GraphReadyTopologyView } from "./topologyReview";
import {
  createImportedTopologySourceInfo,
  type TopologyFreshness,
  type TopologySourceInfo,
} from "./topologySource";

export interface AttachImportedSourceInput {
  readonly view: GraphReadyTopologyView;
  /**
   * Operator-facing one-liner. Falls back to a generic label derived
   * from the environment_id when absent.
   */
  readonly label?: string;
  /**
   * ISO timestamp of when the evidence was observed (e.g. capture time
   * for a PCAP, batch timestamp for an import run). Optional; absence
   * downgrades the source freshness to "unknown".
   */
  readonly observed_at?: string;
  /** Free-form evidence tags (e.g. ["pcap", "lldp-import"]). */
  readonly evidence?: readonly string[];
  /** Identifier of the producer adapter / importer. */
  readonly producer?: string;
  /**
   * Explicit freshness override. Defaults: "fresh" when observed_at
   * is provided, "unknown" otherwise. "stale" must be set explicitly
   * by the caller once a freshness window contract exists.
   */
  readonly freshness?: TopologyFreshness;
}

/**
 * Stamps imported provenance onto a GraphReadyTopologyView produced
 * by the existing import path. Nodes/edges are preserved as-is — this
 * adapter does not synthesise topology, only tags it.
 *
 * If the view already carries a `source` field (rare, but legal under
 * V1BY), the caller's intent wins and the new imported source replaces
 * it. The original view object is not mutated.
 */
export function attachImportedSourceToTopologyView(
  input: AttachImportedSourceInput,
): GraphReadyTopologyView {
  const { view, label, observed_at, evidence, producer, freshness } = input;

  const resolvedLabel = label ?? deriveImportedLabel(view);
  const base = createImportedTopologySourceInfo({
    environment_id: view.environment_id ?? undefined,
    label: resolvedLabel,
    observed_at,
    evidence,
    producer: producer ?? "imported/v0",
  });

  // V1BY contract: createImported* derives freshness from observed_at.
  // V1CB lets the caller override (e.g. when a future receipt model
  // declares "stale"). Otherwise keep the base contract output.
  const source: TopologySourceInfo =
    freshness !== undefined
      ? { ...base, freshness }
      : base;

  return {
    ...view,
    source,
  };
}

function deriveImportedLabel(view: GraphReadyTopologyView): string {
  if (view.environment_id) return `Imported · ${view.environment_id}`;
  return "Imported";
}

/**
 * V1CB convenience — returns true when the view appears to come from
 * imported evidence rather than a generated lab. Heuristic at v0:
 * source.kind === "imported" OR at least one edge has evidence_count > 0
 * (fabricated edges always have evidence_count === 0).
 *
 * Callers can use this to decide whether to apply the adapter without
 * needing to know which engine produced the view.
 */
export function looksLikeImportedTopology(view: GraphReadyTopologyView): boolean {
  if (view.source?.kind === "imported") return true;
  for (const e of view.edges) {
    if (e.evidence_count > 0) return true;
  }
  return false;
}
