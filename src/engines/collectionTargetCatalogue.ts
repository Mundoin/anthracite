/**
 * V1CC — Collection Target Catalogue (deterministic seed v0).
 *
 * Pure in-memory catalogue of read-only collection targets. No I/O,
 * no persistence at v0 — the catalogue is rebuilt each render. Future
 * stages (V1CD receipt model, V1CE collector shell) hook here.
 */

import {
  buildCollectionTarget,
  validateCollectionTarget,
  type CollectionTarget,
  type CollectionTargetValidationResult,
} from "../types/collectionTarget";

const DEMO_TIMESTAMP = "2026-05-25T00:00:00Z";

/**
 * One demo target. Modelled after a typical campus edge router that an
 * operator might define for read-only LLDP neighbour discovery before
 * any live collection lands.
 */
export function buildDemoCollectionTarget(): CollectionTarget {
  return buildCollectionTarget({
    id: "tgt-demo-edge-01",
    name: "Demo · Campus Edge Router",
    description:
      "Read-only target stub for a campus edge router. No live contact yet — V1CC model only.",
    seed: { kind: "hostname", value: "edge-rtr-01.campus.example.net" },
    access_methods: ["ssh", "snmp"],
    credential_ref: "cred://read-only-default",
    hints: {
      vendor: "Cisco",
      platform: "iosxe",
      role: "edge router",
      site: "Campus A",
      zone: "edge",
    },
    contact_policy: {
      read_only: true,
      max_attempts: 1,
      timeout_ms: 5_000,
      allow_neighbor_expansion: true,
      scope_limit: 24,
    },
    scope: ["inventory", "topology_neighbors", "version_facts"],
    enabled: true,
    created_at: DEMO_TIMESTAMP,
    updated_at: DEMO_TIMESTAMP,
  });
}

/** Returns the v0 catalogue — single demo target. */
export function listCollectionTargets(): readonly CollectionTarget[] {
  return [buildDemoCollectionTarget()];
}

/** Bulk-validate the catalogue. */
export function validateCollectionTargetCatalogue(
  targets: readonly CollectionTarget[],
): {
  readonly ok: boolean;
  readonly per_target: readonly { readonly id: string; readonly result: CollectionTargetValidationResult }[];
} {
  const per = targets.map((t) => ({ id: t.id, result: validateCollectionTarget(t) }));
  return { ok: per.every((p) => p.result.ok), per_target: per };
}
