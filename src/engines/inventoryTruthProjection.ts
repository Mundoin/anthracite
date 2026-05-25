/**
 * V1CG — Inventory Truth Projection (v0).
 *
 * Pure: V1CD CollectionReceipt (+ optional V1CC target hints) →
 * InventoryDeviceTruth row. Deterministic. No I/O.
 *
 * Out of scope:
 *   - Multi-source merge (V1CH).
 *   - Conflict resolution.
 *   - Evidence drilldown UI (V1CI).
 *   - Persistence.
 */

import type { CollectionReceipt } from "../types/collectionReceipt";
import type { CollectionTarget } from "../types/collectionTarget";
import type {
  InventoryDeviceTruth,
  InventoryEvidenceRef,
  InventoryTruthSourceKind,
} from "../types/inventoryTruth";
import { buildDemoCollectionTarget } from "./collectionTargetCatalogue";
import { buildDemoSingleDeviceRun } from "./singleDeviceCollector";

export interface ProjectInventoryTruthInput {
  readonly receipt: CollectionReceipt;
  readonly target?: CollectionTarget | null;
  readonly device_id_fallback?: string;
}

const SOURCE_MAP: Record<CollectionReceipt["source_kind"], InventoryTruthSourceKind> = {
  fabricated: "fabricated",
  demo: "demo",
  imported: "imported",
  live: "live",
  manual: "manual",
  unknown: "unknown",
};

/**
 * Project a receipt into a single inventory truth row. Reads the
 * `inventory` and `version_facts` evidence entries when present.
 *
 * - hostname / vendor / platform parsed from `inventory.message`
 *   (format: "<hostname> · <vendor> <platform>").
 * - os_family / os_version parsed from `version_facts.message`
 *   (format: "<family> <version>").
 * - target_hints (role / site / zone) override blanks.
 * - confidence = highest evidence confidence used, capped at 0.95.
 * - last_observed = max(evidence.observed_at), falls back to
 *   receipt.observed_at, then receipt.finished_at.
 */
export function projectInventoryTruthFromReceipt(
  input: ProjectInventoryTruthInput,
): InventoryDeviceTruth {
  const { receipt, target } = input;
  const deviceId =
    receipt.target_id ?? input.device_id_fallback ?? receipt.id;

  const invEv = receipt.evidence.find(
    (e) => e.fact === "inventory" && e.status === "accepted",
  );
  const verEv = receipt.evidence.find(
    (e) => e.fact === "version_facts" && e.status === "accepted",
  );

  const [hostname, vendor, platform] = parseInventoryMessage(invEv?.message ?? null);
  const [osFamily, osVersion] = parseVersionMessage(verEv?.message ?? null);

  const confidence = computeConfidence(receipt);
  const lastObserved = computeLastObserved(receipt);

  const evidenceRefs: InventoryEvidenceRef[] = receipt.evidence
    .filter((e) => e.status === "accepted")
    .map((e) => ({
      receipt_id: receipt.id,
      evidence_id: e.id,
      fact: e.fact,
    }));

  const h = target?.hints ?? {};
  return {
    id: `truth-${deviceId}`,
    device_id: deviceId,
    hostname,
    vendor: vendor ?? h.vendor ?? null,
    platform: platform ?? h.platform ?? null,
    os_family: osFamily,
    os_version: osVersion,
    role: h.role ?? null,
    site: h.site ?? null,
    zone: h.zone ?? null,
    source_kind: SOURCE_MAP[receipt.source_kind],
    method: receipt.method,
    last_observed: lastObserved,
    confidence,
    state: "unknown",
    receipt_ids: [receipt.id],
    evidence_refs: evidenceRefs,
  };
}

function parseInventoryMessage(
  msg: string | null,
): [string | null, string | null, string | null] {
  if (!msg) return [null, null, null];
  // expected: "<hostname> · <vendor> <platform>"
  const parts = msg.split("·").map((s) => s.trim());
  if (parts.length < 2) return [parts[0] ?? null, null, null];
  const hostname = parts[0] || null;
  const vp = parts[1].split(/\s+/);
  const vendor = vp[0] ?? null;
  const platform = vp.slice(1).join(" ") || null;
  return [hostname, vendor, platform];
}

function parseVersionMessage(msg: string | null): [string | null, string | null] {
  if (!msg) return [null, null];
  // expected: "<family> <version>"
  const idx = msg.indexOf(" ");
  if (idx < 0) return [msg.trim(), null];
  return [msg.slice(0, idx).trim(), msg.slice(idx + 1).trim()];
}

function computeConfidence(receipt: CollectionReceipt): number | null {
  let best: number | null = null;
  for (const e of receipt.evidence) {
    if (e.status !== "accepted" || e.confidence === null) continue;
    if (best === null || e.confidence > best) best = e.confidence;
  }
  return best === null ? null : Math.min(0.95, best);
}

function computeLastObserved(receipt: CollectionReceipt): string | null {
  let best: string | null = null;
  for (const e of receipt.evidence) {
    if (e.observed_at === null) continue;
    if (best === null || e.observed_at > best) best = e.observed_at;
  }
  if (best !== null) return best;
  return receipt.observed_at ?? receipt.finished_at ?? null;
}

/** Demo row wired to the V1CF single-device collector run. */
export function buildDemoInventoryTruth(): InventoryDeviceTruth | null {
  const run = buildDemoSingleDeviceRun();
  if (!run.receipt) return null;
  return projectInventoryTruthFromReceipt({
    receipt: run.receipt,
    target: buildDemoCollectionTarget(),
  });
}

export function listDemoInventoryTruth(): readonly InventoryDeviceTruth[] {
  const row = buildDemoInventoryTruth();
  return row ? [row] : [];
}
