/**
 * V1CE — Collection Plan + Dry-Run Shell (v0).
 *
 * Pure data shapes for an operator-triggered preview of what Anthracite
 * WOULD collect from a V1CC target. No live device contact at this
 * stage. Outputs include a V1CD-style receipt preview when the target
 * is safe.
 *
 * Doctrine:
 *   - `no_contact: true` is a literal — any future runner that does
 *     execute live contact will introduce a separate type, not flip
 *     this one.
 *   - The plan + dry-run are derived deterministically from the target.
 *     Same input, same output.
 *
 * Out of scope:
 *   - Real SSH / SNMP / API contact.
 *   - Credential resolution / secret storage.
 *   - Polling daemon, scheduler, persistence.
 *   - Real command execution.
 */

import type {
  CollectionScopeFact,
  CollectionTarget,
  CollectionTargetAccessMethod,
} from "./collectionTarget";
import type { CollectionReceipt } from "./collectionReceipt";

export type CollectionDryRunVerdict = "ready" | "blocked" | "warning";

export interface CollectionPlan {
  readonly id: string;
  readonly target_id: string;
  readonly target_name: string;
  readonly access_methods: readonly CollectionTargetAccessMethod[];
  readonly scope_attempted: readonly CollectionScopeFact[];
  /** Compact human-readable summary of contact_policy. */
  readonly contact_policy_summary: string;
  /** TopologySourceInfo kind a real run would emit; mirrors V1CD. */
  readonly expected_source_kind: "live";
  /** Operator-readable list of fact kinds the runner intends to gather. */
  readonly expected_evidence_kinds: readonly CollectionScopeFact[];
}

export interface CollectionDryRunResult {
  readonly id: string;
  readonly plan: CollectionPlan;
  /** Literal — V1CE never executes contact. */
  readonly no_contact: true;
  readonly verdict: CollectionDryRunVerdict;
  readonly reason: string;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
  /**
   * V1CD-shaped receipt preview emitted when the verdict is "ready" or
   * "warning". `null` for "blocked" outcomes.
   */
  readonly receipt_preview: CollectionReceipt | null;
  /** Deterministic timestamp from caller for testability. */
  readonly generated_at: string;
}

export interface CollectionDryRunValidationIssue {
  readonly field: string;
  readonly code:
    | "empty_id"
    | "empty_target"
    | "no_methods"
    | "no_scope"
    | "live_runner_unsafe"
    | "preview_mismatch";
  readonly message: string;
}

export interface CollectionDryRunValidationResult {
  readonly ok: boolean;
  readonly issues: readonly CollectionDryRunValidationIssue[];
}

/**
 * Pure validator over a dry-run result. Defence-in-depth so the
 * preview surface cannot ship inconsistent data.
 */
export function validateCollectionDryRun(
  r: CollectionDryRunResult,
): CollectionDryRunValidationResult {
  const issues: CollectionDryRunValidationIssue[] = [];

  if (!r.id.trim()) issues.push({ field: "id", code: "empty_id", message: "Dry-run id is empty." });
  if (!r.plan.target_id.trim()) {
    issues.push({ field: "plan.target_id", code: "empty_target", message: "Plan target_id is empty." });
  }
  if (r.plan.access_methods.length === 0) {
    issues.push({ field: "plan.access_methods", code: "no_methods", message: "Plan must list at least one access method." });
  }
  if (r.plan.scope_attempted.length === 0) {
    issues.push({ field: "plan.scope_attempted", code: "no_scope", message: "Plan must declare at least one scope fact." });
  }
  if (r.no_contact !== true) {
    issues.push({
      field: "no_contact",
      code: "live_runner_unsafe",
      message: "V1CE dry-run cannot disable no_contact. Use V1CF for real contact (when it lands).",
    });
  }
  if (r.verdict === "ready" && r.receipt_preview === null) {
    issues.push({
      field: "receipt_preview",
      code: "preview_mismatch",
      message: "Ready dry-run must include a receipt_preview.",
    });
  }
  if (r.verdict === "blocked" && r.receipt_preview !== null) {
    issues.push({
      field: "receipt_preview",
      code: "preview_mismatch",
      message: "Blocked dry-run must not include a receipt_preview.",
    });
  }

  return { ok: issues.length === 0, issues };
}

/** Pure helper — does NOT execute. Caller decides surface. */
export function planSummary(plan: CollectionPlan): string {
  return `${plan.target_name} · ${plan.access_methods.join("/")} · ${plan.scope_attempted.length} scope fact${plan.scope_attempted.length === 1 ? "" : "s"}`;
}

export type { CollectionTarget };
