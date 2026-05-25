/**
 * V1CC — Read-Only Collection Target Model.
 *
 * Typed declaration of what Anthracite is allowed to contact for a
 * future read-only collection. No live execution. No secret storage.
 *
 * Doctrine:
 *   - Credentials are referenced by id only. Plaintext is forbidden
 *     by the validator and by type shape.
 *   - Contact policy is read-only at v0; any future write surface
 *     will require an explicit new field, not a flip on this one.
 *   - Scope is an opt-in allowlist of fact kinds. Anthracite will only
 *     collect what the operator names.
 *
 * Out of scope for V1CC:
 *   - SSH / SNMP / API runners.
 *   - Credential manager.
 *   - Polling daemon / scheduler.
 *   - Receipts (V1CD).
 *   - Live collector (V1CE / V1CF).
 */

export type CollectionTargetAccessMethod =
  | "ssh"
  | "snmp"
  | "api"
  | "import"
  | "manual";

export type CollectionTargetSeedKind = "hostname" | "ip" | "cidr" | "range";

export interface CollectionTargetSeed {
  readonly kind: CollectionTargetSeedKind;
  readonly value: string;
}

export type CollectionScopeFact =
  | "inventory"
  | "topology_neighbors"
  | "interface_summary"
  | "version_facts"
  | "config_read";

export interface CollectionTargetContactPolicy {
  /**
   * Hard contract at v0 — any false value is rejected by the validator.
   * The field is kept so future stages can introduce non-read-only
   * targets behind an explicit new policy field, not by flipping this.
   */
  readonly read_only: true;
  readonly max_attempts: number;
  readonly timeout_ms: number;
  readonly allow_neighbor_expansion: boolean;
  /**
   * Optional cap on devices reached via neighbour expansion. `null`
   * means no expansion cap; the v0 validator still requires
   * `allow_neighbor_expansion: true` for any non-null value to apply.
   */
  readonly scope_limit: number | null;
}

export interface CollectionTargetHints {
  readonly vendor?: string;
  readonly platform?: string;
  readonly role?: string;
  readonly site?: string;
  readonly zone?: string;
}

export interface CollectionTarget {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly seed: CollectionTargetSeed;
  readonly access_methods: readonly CollectionTargetAccessMethod[];
  /** Credential reference only — `null` means "no credential bound yet". */
  readonly credential_ref: string | null;
  readonly hints: CollectionTargetHints;
  readonly contact_policy: CollectionTargetContactPolicy;
  readonly scope: readonly CollectionScopeFact[];
  readonly enabled: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  /** ISO timestamp of last dry-run plan; null until V1CE. */
  readonly last_planned_at: string | null;
}

export interface CollectionTargetValidationIssue {
  readonly field: string;
  readonly code:
    | "required"
    | "empty"
    | "duplicate"
    | "secret_in_reference"
    | "invalid_method"
    | "invalid_scope"
    | "non_read_only"
    | "invalid_timeout"
    | "invalid_attempts"
    | "expansion_scope_mismatch";
  readonly message: string;
}

export interface CollectionTargetValidationResult {
  readonly ok: boolean;
  readonly issues: readonly CollectionTargetValidationIssue[];
}

/** Default contact policy — safe, conservative, read-only. */
export const DEFAULT_CONTACT_POLICY: CollectionTargetContactPolicy = {
  read_only: true,
  max_attempts: 1,
  timeout_ms: 5_000,
  allow_neighbor_expansion: false,
  scope_limit: null,
};

/** Default scope — inventory + topology neighbours, the v0 minimum. */
export const DEFAULT_SCOPE: readonly CollectionScopeFact[] = [
  "inventory",
  "topology_neighbors",
];

const SECRET_HINTS = [
  "password",
  "secret",
  "token",
  "apikey",
  "api_key",
  "pwd",
];

function looksLikeSecret(value: string): boolean {
  const lower = value.toLowerCase();
  return SECRET_HINTS.some((s) => lower.includes(s));
}

const VALID_METHODS = new Set<CollectionTargetAccessMethod>([
  "ssh",
  "snmp",
  "api",
  "import",
  "manual",
]);

const VALID_SCOPE = new Set<CollectionScopeFact>([
  "inventory",
  "topology_neighbors",
  "interface_summary",
  "version_facts",
  "config_read",
]);

/**
 * Deterministic builder. Fills in defaults so callers can pass only
 * required fields. Caller supplies timestamps so the result stays pure.
 */
export interface BuildCollectionTargetInput {
  readonly id: string;
  readonly name: string;
  readonly seed: CollectionTargetSeed;
  readonly access_methods?: readonly CollectionTargetAccessMethod[];
  readonly credential_ref?: string | null;
  readonly hints?: CollectionTargetHints;
  readonly contact_policy?: Partial<CollectionTargetContactPolicy>;
  readonly scope?: readonly CollectionScopeFact[];
  readonly enabled?: boolean;
  readonly description?: string;
  readonly created_at: string;
  readonly updated_at?: string;
  readonly last_planned_at?: string | null;
}

export function buildCollectionTarget(
  input: BuildCollectionTargetInput,
): CollectionTarget {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    seed: input.seed,
    access_methods:
      input.access_methods && input.access_methods.length > 0
        ? input.access_methods
        : (["ssh"] as readonly CollectionTargetAccessMethod[]),
    credential_ref: input.credential_ref ?? null,
    hints: input.hints ?? {},
    contact_policy: {
      ...DEFAULT_CONTACT_POLICY,
      ...(input.contact_policy ?? {}),
      // V1CC contract — read_only flip is forbidden at this layer.
      read_only: true,
    },
    scope:
      input.scope && input.scope.length > 0 ? input.scope : DEFAULT_SCOPE,
    enabled: input.enabled ?? true,
    created_at: input.created_at,
    updated_at: input.updated_at ?? input.created_at,
    last_planned_at: input.last_planned_at ?? null,
  };
}

/**
 * Pure validator. Returns `{ ok, issues[] }`. Caller decides how to
 * surface failures. Does not mutate or throw.
 */
export function validateCollectionTarget(
  target: CollectionTarget,
): CollectionTargetValidationResult {
  const issues: CollectionTargetValidationIssue[] = [];

  if (!target.id.trim()) issues.push({ field: "id", code: "empty", message: "Target id is empty." });
  if (!target.name.trim()) issues.push({ field: "name", code: "empty", message: "Target name is empty." });
  if (!target.seed.value.trim()) issues.push({ field: "seed.value", code: "empty", message: "Target seed value is empty." });

  if (target.access_methods.length === 0) {
    issues.push({ field: "access_methods", code: "required", message: "At least one access method is required." });
  }
  for (const m of target.access_methods) {
    if (!VALID_METHODS.has(m)) {
      issues.push({ field: "access_methods", code: "invalid_method", message: `Unknown access method: ${m}` });
    }
  }

  for (const s of target.scope) {
    if (!VALID_SCOPE.has(s)) {
      issues.push({ field: "scope", code: "invalid_scope", message: `Unknown scope fact: ${s}` });
    }
  }
  const scopeSet = new Set(target.scope);
  if (scopeSet.size !== target.scope.length) {
    issues.push({ field: "scope", code: "duplicate", message: "Duplicate scope facts are not allowed." });
  }

  if (target.credential_ref !== null) {
    if (!target.credential_ref.trim()) {
      issues.push({ field: "credential_ref", code: "empty", message: "Credential reference is empty (use null instead)." });
    } else if (looksLikeSecret(target.credential_ref)) {
      issues.push({
        field: "credential_ref",
        code: "secret_in_reference",
        message:
          "Credential reference looks like a plaintext secret. Anthracite stores reference ids only.",
      });
    }
  }

  // contact_policy safety
  const p = target.contact_policy;
  if (p.read_only !== true) {
    issues.push({
      field: "contact_policy.read_only",
      code: "non_read_only",
      message: "Contact policy must be read_only at v0.",
    });
  }
  if (!Number.isInteger(p.max_attempts) || p.max_attempts < 1 || p.max_attempts > 5) {
    issues.push({
      field: "contact_policy.max_attempts",
      code: "invalid_attempts",
      message: "max_attempts must be an integer in [1, 5].",
    });
  }
  if (!Number.isFinite(p.timeout_ms) || p.timeout_ms < 250 || p.timeout_ms > 60_000) {
    issues.push({
      field: "contact_policy.timeout_ms",
      code: "invalid_timeout",
      message: "timeout_ms must be a finite number in [250, 60000].",
    });
  }
  if (p.scope_limit !== null && !p.allow_neighbor_expansion) {
    issues.push({
      field: "contact_policy.scope_limit",
      code: "expansion_scope_mismatch",
      message:
        "scope_limit only applies when allow_neighbor_expansion is true.",
    });
  }
  if (p.scope_limit !== null && (!Number.isInteger(p.scope_limit) || p.scope_limit < 1 || p.scope_limit > 10_000)) {
    issues.push({
      field: "contact_policy.scope_limit",
      code: "expansion_scope_mismatch",
      message: "scope_limit must be an integer in [1, 10000] when set.",
    });
  }

  return { ok: issues.length === 0, issues };
}

/** Convenience — `true` only when every field validates. */
export function isSafeReadOnlyTarget(target: CollectionTarget): boolean {
  return validateCollectionTarget(target).ok;
}
