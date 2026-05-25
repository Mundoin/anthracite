/**
 * V1CG — Inventory Truth Surface (preview v0).
 *
 * Projected operator-visible row that answers "What do I actually have?"
 * for one device. Read-only at v0. Multi-source merge + conflict
 * handling waits for V1CH; evidence drilldown waits for V1CI.
 *
 * Doctrine:
 *   - Every truth row carries provenance back to a V1CD receipt id +
 *     specific evidence ids. No magic numbers.
 *   - Confidence is bounded [0, 1] or null. Validator enforces.
 *   - State at v0 is "unknown" unless a future stage feeds in a state
 *     ramp via the existing V1BU LabOperationalState contract.
 */

import type { LabOperationalState } from "./labEnvironment";

export type InventoryTruthSourceKind =
  | "fabricated"
  | "demo"
  | "imported"
  | "live"
  | "manual"
  | "unknown";

export interface InventoryEvidenceRef {
  readonly receipt_id: string;
  readonly evidence_id: string;
  readonly fact: string;
}

export interface InventoryDeviceTruth {
  readonly id: string;
  readonly device_id: string;
  readonly hostname: string | null;
  readonly vendor: string | null;
  readonly platform: string | null;
  readonly os_family: string | null;
  readonly os_version: string | null;
  readonly role: string | null;
  readonly site: string | null;
  readonly zone: string | null;
  readonly source_kind: InventoryTruthSourceKind;
  readonly method: string | null;
  readonly last_observed: string | null;
  readonly confidence: number | null;
  readonly state: LabOperationalState;
  readonly receipt_ids: readonly string[];
  readonly evidence_refs: readonly InventoryEvidenceRef[];
}

export interface InventoryTruthValidationIssue {
  readonly field: string;
  readonly code:
    | "empty_id"
    | "empty_device_id"
    | "invalid_confidence"
    | "no_evidence_refs";
  readonly message: string;
}

export interface InventoryTruthValidationResult {
  readonly ok: boolean;
  readonly issues: readonly InventoryTruthValidationIssue[];
}

export function validateInventoryDeviceTruth(
  row: InventoryDeviceTruth,
): InventoryTruthValidationResult {
  const issues: InventoryTruthValidationIssue[] = [];
  if (!row.id.trim()) issues.push({ field: "id", code: "empty_id", message: "Truth row id is empty." });
  if (!row.device_id.trim()) issues.push({ field: "device_id", code: "empty_device_id", message: "device_id is empty." });
  if (row.confidence !== null) {
    if (!Number.isFinite(row.confidence) || row.confidence < 0 || row.confidence > 1) {
      issues.push({
        field: "confidence",
        code: "invalid_confidence",
        message: "confidence must be a finite number in [0, 1] or null.",
      });
    }
  }
  if (row.evidence_refs.length === 0) {
    issues.push({
      field: "evidence_refs",
      code: "no_evidence_refs",
      message: "Truth rows must reference at least one V1CD evidence entry.",
    });
  }
  return { ok: issues.length === 0, issues };
}
