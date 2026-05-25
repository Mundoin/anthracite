/**
 * V1CE — Collection Dry-Run Builder (v0).
 *
 * Pure builder: V1CC CollectionTarget → CollectionDryRunResult. No
 * device contact, no I/O. Uses V1CC validator for safety verdict and
 * emits a V1CD-shaped receipt preview when the target is safe.
 */

import {
  validateCollectionTarget,
  type CollectionTarget,
} from "../types/collectionTarget";
import {
  buildCollectionReceipt,
  type CollectionEvidenceEntry,
  type CollectionReceipt,
} from "../types/collectionReceipt";
import type {
  CollectionDryRunResult,
  CollectionDryRunVerdict,
  CollectionPlan,
} from "../types/collectionDryRun";
import { buildDemoCollectionTarget } from "./collectionTargetCatalogue";

export interface BuildCollectionDryRunInput {
  readonly target: CollectionTarget;
  readonly generated_at: string;
  /** Optional run id for grouping; falls back to a deterministic value. */
  readonly run_id?: string;
}

const SCOPE_TO_EVIDENCE_FACT: Record<
  string,
  { readonly label: string; readonly source: string }
> = {
  inventory: { label: "Device identity + chassis facts", source: "<runner>:inventory" },
  topology_neighbors: {
    label: "LLDP / CDP neighbour adjacency",
    source: "<runner>:neighbors",
  },
  interface_summary: {
    label: "Interface up/down + speed summary",
    source: "<runner>:interfaces",
  },
  version_facts: { label: "OS family + version facts", source: "<runner>:version" },
  config_read: {
    label: "Read-only configuration snapshot",
    source: "<runner>:config",
  },
};

function policySummary(target: CollectionTarget): string {
  const p = target.contact_policy;
  const parts = [
    `read_only=${p.read_only}`,
    `attempts=${p.max_attempts}`,
    `timeout=${p.timeout_ms}ms`,
    `neighbour=${p.allow_neighbor_expansion ? "yes" : "no"}`,
  ];
  if (p.scope_limit !== null) parts.push(`limit=${p.scope_limit}`);
  return parts.join(" · ");
}

function buildPlan(target: CollectionTarget): CollectionPlan {
  return {
    id: `plan-${target.id}`,
    target_id: target.id,
    target_name: target.name,
    access_methods: target.access_methods,
    scope_attempted: target.scope,
    contact_policy_summary: policySummary(target),
    expected_source_kind: "live",
    expected_evidence_kinds: target.scope,
  };
}

function buildReceiptPreview(
  target: CollectionTarget,
  plan: CollectionPlan,
  runId: string,
  generated_at: string,
): CollectionReceipt {
  const evidence: CollectionEvidenceEntry[] = target.scope.map((scope, i) => {
    const meta = SCOPE_TO_EVIDENCE_FACT[scope] ?? {
      label: scope,
      source: "<runner>",
    };
    return {
      id: `${plan.id}-ev-${i}-${scope}`,
      fact: scope,
      status: "accepted",
      source: meta.source,
      confidence: 0.5,
      observed_at: generated_at,
      message: `Preview only — ${meta.label}.`,
    };
  });
  return buildCollectionReceipt({
    id: `${plan.id}-preview`,
    target_id: target.id,
    run_id: runId,
    source_kind: "live",
    method: target.access_methods[0] ?? "ssh",
    scope_attempted: target.scope,
    started_at: generated_at,
    finished_at: generated_at,
    observed_at: generated_at,
    imported_at: generated_at,
    freshness: "fresh",
    evidence,
    warnings: ["Preview only — V1CE does not contact devices."],
    errors: [],
    note: "V1CE dry-run preview — no live contact occurred.",
  });
}

/**
 * Build a deterministic dry-run result for a target. Verdict is:
 *   - "blocked" when target.enabled is false OR validation fails.
 *   - "warning" when target validates but no credential is bound.
 *   - "ready"   when target validates AND a credential ref exists.
 *
 * `receipt_preview` is null for "blocked" and present for "ready" /
 * "warning". The preview is a V1CD CollectionReceipt with
 * source_kind "live" and observed_at = generated_at.
 */
export function buildCollectionDryRun(
  input: BuildCollectionDryRunInput,
): CollectionDryRunResult {
  const { target, generated_at } = input;
  const runId = input.run_id ?? `dryrun-${target.id}`;
  const plan = buildPlan(target);

  const targetCheck = validateCollectionTarget(target);
  const warnings: string[] = [];
  const errors: string[] = [];

  let verdict: CollectionDryRunVerdict = "ready";
  let reason = `Target ${target.id} would be contacted read-only over ${plan.access_methods.join(", ")}.`;

  if (!target.enabled) {
    verdict = "blocked";
    reason = `Target ${target.id} is disabled.`;
    errors.push("Target.enabled is false.");
  } else if (!targetCheck.ok) {
    verdict = "blocked";
    reason = `Target ${target.id} failed read-only validation.`;
    for (const i of targetCheck.issues) {
      errors.push(`${i.field}: ${i.message}`);
    }
  } else if (target.credential_ref === null) {
    verdict = "warning";
    reason = `Target ${target.id} has no credential reference bound; a real run would fail at the runner.`;
    warnings.push("credential_ref is null — bind a credential reference before running V1CF.");
  }

  const receiptPreview =
    verdict === "blocked"
      ? null
      : buildReceiptPreview(target, plan, runId, generated_at);

  return {
    id: `${plan.id}-${generated_at}`,
    plan,
    no_contact: true,
    verdict,
    reason,
    warnings,
    errors,
    receipt_preview: receiptPreview,
    generated_at,
  };
}

/**
 * Demo dry-run wired to the V1CC demo target. Deterministic so tests
 * + UI render identically every time.
 */
export function buildDemoCollectionDryRun(): CollectionDryRunResult {
  return buildCollectionDryRun({
    target: buildDemoCollectionTarget(),
    generated_at: "2026-05-25T11:00:00Z",
  });
}
