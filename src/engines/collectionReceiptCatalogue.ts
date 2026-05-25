/**
 * V1CD — Collection Receipt Catalogue (deterministic seed v0).
 *
 * Two demo receipts wired to existing v0 surfaces:
 *   1. Imported receipt for the V1CB imported-evidence demo
 *      (env "env-imported-demo", LLDP-style facts).
 *   2. Manual-paste receipt against the V1CC demo target
 *      ("tgt-demo-edge-01") with one rejected entry so the validator
 *      and the UI both have a non-clean payload to render.
 */

import {
  buildCollectionReceipt,
  validateCollectionReceipt,
  type CollectionReceipt,
  type CollectionReceiptValidationResult,
} from "../types/collectionReceipt";

const T0 = "2026-05-25T10:00:00Z";
const T1 = "2026-05-25T10:00:02Z";

export function buildImportedDemoReceipt(): CollectionReceipt {
  return buildCollectionReceipt({
    id: "rcpt-imported-demo-001",
    target_id: null,
    run_id: "run-imported-demo-001",
    source_kind: "imported",
    method: "import",
    scope_attempted: ["topology_neighbors", "inventory"],
    started_at: T0,
    finished_at: T0,
    observed_at: T0,
    imported_at: T0,
    freshness: "fresh",
    evidence: [
      {
        id: "ev-lldp-fw-core",
        fact: "topology_neighbors",
        status: "accepted",
        source: "lldp-paste@fw-edge-01",
        confidence: 0.9,
        observed_at: T0,
        message: null,
      },
      {
        id: "ev-lldp-core-dist",
        fact: "topology_neighbors",
        status: "accepted",
        source: "lldp-paste@core-rtr-01",
        confidence: 0.9,
        observed_at: T0,
        message: null,
      },
      {
        id: "ev-lldp-dist-acc",
        fact: "topology_neighbors",
        status: "accepted",
        source: "lldp-paste@dist-sw-01",
        confidence: 0.85,
        observed_at: T0,
        message: null,
      },
      {
        id: "ev-inventory-edge",
        fact: "inventory",
        status: "accepted",
        source: "lldp-paste@fw-edge-01",
        confidence: 0.8,
        observed_at: T0,
        message: null,
      },
    ],
    warnings: [],
    errors: [],
    note: "V1CB demo imported topology (LLDP-style fixture).",
  });
}

export function buildTargetDemoReceipt(): CollectionReceipt {
  return buildCollectionReceipt({
    id: "rcpt-tgt-demo-edge-01-001",
    target_id: "tgt-demo-edge-01",
    run_id: "run-tgt-demo-edge-01-001",
    source_kind: "manual",
    method: "manual",
    scope_attempted: ["inventory", "version_facts", "topology_neighbors"],
    started_at: T0,
    finished_at: T1,
    observed_at: T0,
    imported_at: T1,
    freshness: "fresh",
    evidence: [
      {
        id: "ev-inv-edge-01",
        fact: "inventory",
        status: "accepted",
        source: "manual-paste",
        confidence: 0.95,
        observed_at: T0,
        message: null,
      },
      {
        id: "ev-ver-edge-01",
        fact: "version_facts",
        status: "accepted",
        source: "manual-paste",
        confidence: 0.9,
        observed_at: T0,
        message: null,
      },
      {
        id: "ev-lldp-edge-01-rejected",
        fact: "topology_neighbors",
        status: "rejected",
        source: "manual-paste",
        confidence: null,
        observed_at: T0,
        message: "remote node id not present in inventory — unresolved neighbour.",
      },
    ],
    warnings: ["1 neighbour evidence entry unresolved against current inventory."],
    errors: [],
    note: "Manual paste preview against the V1CC demo target. No live contact.",
  });
}

export function listCollectionReceipts(): readonly CollectionReceipt[] {
  return [buildImportedDemoReceipt(), buildTargetDemoReceipt()];
}

export function validateCollectionReceiptCatalogue(
  receipts: readonly CollectionReceipt[],
): {
  readonly ok: boolean;
  readonly per_receipt: readonly { readonly id: string; readonly result: CollectionReceiptValidationResult }[];
} {
  const per = receipts.map((r) => ({ id: r.id, result: validateCollectionReceipt(r) }));
  return { ok: per.every((p) => p.result.ok), per_receipt: per };
}
