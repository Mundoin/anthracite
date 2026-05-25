/**
 * V1CF — Single-Device Read-Only Collector (fixture-backed v0).
 *
 * Pure runner: V1CC CollectionTarget → V1CD CollectionReceipt
 * (via buildCollectionReceipt so counts cannot drift). No I/O, no
 * device contact. Source kind "demo" because facts come from a
 * fixture; literal `no_field_contact: true` proves it at the type
 * level.
 */

import {
  validateCollectionTarget,
  type CollectionScopeFact,
  type CollectionTarget,
  type CollectionTargetAccessMethod,
} from "../types/collectionTarget";
import {
  buildCollectionReceipt,
  type CollectionEvidenceEntry,
  type CollectionReceipt,
} from "../types/collectionReceipt";
import type { SingleDeviceCollectionRun } from "../types/singleDeviceCollection";
import { buildDemoCollectionTarget } from "./collectionTargetCatalogue";
import {
  getFixtureForTarget,
  type SingleDeviceFixture,
} from "./__fixtures__/singleDeviceFixture";

export interface RunSingleDeviceCollectionInput {
  readonly target: CollectionTarget;
  readonly generated_at: string;
  readonly run_id?: string;
}

const METHOD_PREFERENCE: readonly CollectionTargetAccessMethod[] = [
  "ssh",
  "snmp",
  "api",
  "import",
  "manual",
];

function pickMethod(
  target: CollectionTarget,
): CollectionTargetAccessMethod {
  for (const m of METHOD_PREFERENCE) {
    if (target.access_methods.includes(m)) return m;
  }
  return target.access_methods[0] ?? "ssh";
}

function buildEvidence(
  fixture: SingleDeviceFixture,
  scope: readonly CollectionScopeFact[],
  observed_at: string,
): readonly CollectionEvidenceEntry[] {
  const out: CollectionEvidenceEntry[] = [];
  for (const s of scope) {
    if (s === "inventory") {
      out.push({
        id: `${fixture.id}-ev-inventory`,
        fact: "inventory",
        status: "accepted",
        source: fixture.source_label,
        confidence: 0.9,
        observed_at,
        message: `${fixture.hostname} · ${fixture.vendor} ${fixture.platform}`,
      });
    } else if (s === "version_facts") {
      out.push({
        id: `${fixture.id}-ev-version`,
        fact: "version_facts",
        status: "accepted",
        source: fixture.source_label,
        confidence: 0.95,
        observed_at,
        message: `${fixture.os_family} ${fixture.os_version}`,
      });
    } else if (s === "interface_summary") {
      const up = fixture.interfaces.filter((i) => i.oper_up).length;
      out.push({
        id: `${fixture.id}-ev-interfaces`,
        fact: "interface_summary",
        status: "accepted",
        source: fixture.source_label,
        confidence: 0.85,
        observed_at,
        message: `${fixture.interfaces.length} interfaces · ${up} oper-up`,
      });
    } else if (s === "topology_neighbors") {
      if (fixture.neighbours.length === 0) {
        out.push({
          id: `${fixture.id}-ev-neighbors-empty`,
          fact: "topology_neighbors",
          status: "rejected",
          source: fixture.source_label,
          confidence: null,
          observed_at,
          message: "Fixture has no neighbour facts.",
        });
      } else {
        for (let i = 0; i < fixture.neighbours.length; i++) {
          const n = fixture.neighbours[i];
          out.push({
            id: `${fixture.id}-ev-neighbor-${i}`,
            fact: "topology_neighbors",
            status: "accepted",
            source: `${fixture.source_label}#${n.source_kind}`,
            confidence: 0.85,
            observed_at,
            message: `${n.local_interface} ↔ ${n.remote_node_hint}:${n.remote_interface}`,
          });
        }
      }
    } else if (s === "config_read") {
      out.push({
        id: `${fixture.id}-ev-config`,
        fact: "config_read",
        status: "failed",
        source: fixture.source_label,
        confidence: null,
        observed_at,
        message: "config_read not available from this fixture.",
      });
    }
  }
  return out;
}

/**
 * Run a deterministic single-device collection. Returns a
 * SingleDeviceCollectionRun with one of three statuses:
 *   - "blocked": target disabled OR fails V1CC validation.
 *   - "error":   no fixture is registered for the target id.
 *   - "ok":      receipt emitted; counts derived by V1CD builder.
 */
export function runSingleDeviceCollection(
  input: RunSingleDeviceCollectionInput,
): SingleDeviceCollectionRun {
  const { target, generated_at } = input;
  const runId = input.run_id ?? `v1cf-${target.id}-${generated_at}`;

  const baseRun = {
    id: `${runId}-run`,
    target_id: target.id,
    fixture_id: null as string | null,
    no_field_contact: true as const,
    generated_at,
  };

  if (!target.enabled) {
    return {
      ...baseRun,
      status: "blocked",
      reason: `Target ${target.id} is disabled.`,
      warnings: [],
      errors: ["Target.enabled is false."],
      receipt: null,
    };
  }

  const targetCheck = validateCollectionTarget(target);
  if (!targetCheck.ok) {
    return {
      ...baseRun,
      status: "blocked",
      reason: `Target ${target.id} failed V1CC validation.`,
      warnings: [],
      errors: targetCheck.issues.map((i) => `${i.field}: ${i.message}`),
      receipt: null,
    };
  }

  const fixture = getFixtureForTarget(target.id);
  if (!fixture) {
    return {
      ...baseRun,
      status: "error",
      reason: `No fixture registered for target ${target.id}.`,
      warnings: [],
      errors: ["fixture lookup miss — V1CF needs a fixture per target id."],
      receipt: null,
    };
  }

  const method = pickMethod(target);
  const evidence = buildEvidence(fixture, target.scope, generated_at);
  const receipt: CollectionReceipt = buildCollectionReceipt({
    id: `${runId}-rcpt`,
    target_id: target.id,
    run_id: runId,
    source_kind: "demo",
    method,
    scope_attempted: target.scope,
    started_at: generated_at,
    finished_at: generated_at,
    observed_at: generated_at,
    imported_at: generated_at,
    freshness: "fresh",
    evidence,
    warnings: [
      `Fixture-backed run — no field contact. Source: ${fixture.source_label}.`,
    ],
    errors: [],
    note: `V1CF single-device collector v0. Fixture ${fixture.id}.`,
  });

  return {
    ...baseRun,
    fixture_id: fixture.id,
    status: "ok",
    reason: `Collected ${receipt.counts.accepted} accepted / ${receipt.counts.rejected} rejected / ${receipt.counts.failed} failed evidence entries from fixture ${fixture.id}.`,
    warnings: [],
    errors: [],
    receipt,
  };
}

/** Demo run wired to V1CC's demo target id. Deterministic. */
export function buildDemoSingleDeviceRun(): SingleDeviceCollectionRun {
  return runSingleDeviceCollection({
    target: buildDemoCollectionTarget(),
    generated_at: "2026-05-25T12:00:00Z",
  });
}
