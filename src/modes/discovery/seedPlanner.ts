/**
 * V1BK — Discovery Seed Planner (pure model).
 *
 * Operator-facing staging layer BEFORE any crawler or live device contact
 * exists. Lets the operator declare seed targets, validate them locally,
 * see a plan summary, and emit a deterministic Markdown receipt.
 *
 * Hard discipline:
 *   - No device contact, no transport call, no network I/O.
 *   - Credentials are referenced by LABEL only — never by secret material.
 *   - CIDR ranges are STAGED INTENT only; this module never expands them
 *     into hosts.
 *   - Receipt Markdown must never contain raw secret material.
 *
 * This file is engine-free. Build + Topology + Discovery transport are
 * untouched.
 */

/* eslint-disable no-useless-escape */

export type SeedSourceKind =
  | "seed_device"
  | "ip_range"
  | "manual"
  | "evidence";

export type SeedTransportIntent = "ssh" | "snmp" | "manual" | "unknown";

export type SeedPlatformHint =
  | "iosxe"
  | "iosxr"
  | "nxos"
  | "eos"
  | "junos"
  | "fortios"
  | "panos"
  | "mikrotik"
  | "vrp"
  | "sros"
  | "aoscx"
  | "vyos"
  | "checkpoint"
  | "unknown";

export interface SeedEntry {
  readonly id: string;
  readonly host_or_cidr: string;
  readonly label: string;
  readonly platform_hint: SeedPlatformHint;
  readonly transport_intent: SeedTransportIntent;
  readonly port: number | null;
  readonly credential_profile_label: string;
  readonly source_kind: SeedSourceKind;
  readonly notes: string;
  readonly enabled: boolean;
}

export type SeedNextAction =
  | "add_seed"
  | "fix_seed_errors"
  | "attach_credential_profile"
  | "review_manual_plan"
  | "ready_for_crawl_preview";

export interface SeedIssue {
  readonly seed_id: string;
  readonly kind:
    | "host_missing"
    | "host_format"
    | "port_required"
    | "port_invalid"
    | "platform_unknown"
    | "credential_label_missing"
    | "duplicate_host";
  readonly message: string;
}

export interface SeedPlanSummary {
  readonly seeds: ReadonlyArray<SeedEntry>;
  readonly valid_count: number;
  readonly invalid_count: number;
  readonly disabled_count: number;
  readonly active_count: number;
  readonly platform_distribution: ReadonlyArray<{
    readonly platform: SeedPlatformHint;
    readonly count: number;
  }>;
  readonly transport_distribution: ReadonlyArray<{
    readonly transport: SeedTransportIntent;
    readonly count: number;
  }>;
  readonly issues: ReadonlyArray<SeedIssue>;
  readonly warnings: ReadonlyArray<string>;
  readonly next_action: SeedNextAction;
  readonly generated_at: string;
}

const HOST_LITERAL_RE = /^[a-zA-Z0-9_.-]+$/;
const CIDR_RE = /^(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

function isPortValid(port: number | null, required: boolean): boolean {
  if (port === null || port === undefined) return !required;
  if (!Number.isInteger(port)) return false;
  return port >= 1 && port <= 65535;
}

function normaliseLabel(label: string): string {
  return label.trim();
}

function isLikelyCidr(s: string): boolean {
  return CIDR_RE.test(s);
}

function isLikelyHost(s: string): boolean {
  return HOST_LITERAL_RE.test(s) && s.length <= 253;
}

function validateSingleSeed(seed: SeedEntry, hostCounts: Map<string, number>): SeedIssue[] {
  const issues: SeedIssue[] = [];
  const host = seed.host_or_cidr.trim();

  if (host.length === 0) {
    issues.push({
      seed_id: seed.id,
      kind: "host_missing",
      message: "Host or CIDR is required.",
    });
  } else if (!isLikelyCidr(host) && !isLikelyHost(host)) {
    issues.push({
      seed_id: seed.id,
      kind: "host_format",
      message: `Host or CIDR "${host}" is not a recognised host name, IP, or CIDR range.`,
    });
  } else {
    const dupCount = hostCounts.get(host) ?? 0;
    if (dupCount > 1) {
      issues.push({
        seed_id: seed.id,
        kind: "duplicate_host",
        message: `Host "${host}" appears in more than one seed.`,
      });
    }
  }

  const portRequired =
    seed.transport_intent === "ssh" || seed.transport_intent === "snmp";
  if (portRequired && (seed.port === null || seed.port === undefined)) {
    issues.push({
      seed_id: seed.id,
      kind: "port_required",
      message: `Port is required for ${seed.transport_intent} transport.`,
    });
  } else if (seed.port !== null && !isPortValid(seed.port, portRequired)) {
    issues.push({
      seed_id: seed.id,
      kind: "port_invalid",
      message: `Port ${seed.port} is invalid. Use 1–65535.`,
    });
  }

  return issues;
}

/** Build a plan summary from the current seed list. Pure function. */
export function buildSeedPlanSummary(
  seeds: ReadonlyArray<SeedEntry>,
  generated_at: string,
): SeedPlanSummary {
  const hostCounts = new Map<string, number>();
  for (const s of seeds) {
    const k = s.host_or_cidr.trim();
    if (k.length === 0) continue;
    hostCounts.set(k, (hostCounts.get(k) ?? 0) + 1);
  }

  const issues: SeedIssue[] = [];
  const warnings: string[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let disabledCount = 0;

  const platformCounts = new Map<SeedPlatformHint, number>();
  const transportCounts = new Map<SeedTransportIntent, number>();

  for (const seed of seeds) {
    if (!seed.enabled) {
      disabledCount += 1;
      continue;
    }
    const seedIssues = validateSingleSeed(seed, hostCounts);
    if (seedIssues.length === 0) {
      validCount += 1;
    } else {
      invalidCount += 1;
      issues.push(...seedIssues);
    }
    platformCounts.set(
      seed.platform_hint,
      (platformCounts.get(seed.platform_hint) ?? 0) + 1,
    );
    transportCounts.set(
      seed.transport_intent,
      (transportCounts.get(seed.transport_intent) ?? 0) + 1,
    );
    if (seed.platform_hint === "unknown") {
      warnings.push(
        `Seed "${seed.host_or_cidr.trim() || seed.id}" has unknown platform — crawler will need a hint.`,
      );
    }
    const needsCred =
      seed.transport_intent === "ssh" || seed.transport_intent === "snmp";
    if (needsCred && normaliseLabel(seed.credential_profile_label).length === 0) {
      issues.push({
        seed_id: seed.id,
        kind: "credential_label_missing",
        message: `Credential profile label is required for ${seed.transport_intent} transport.`,
      });
      // Already counted above as valid — demote
      if (seedIssues.length === 0) {
        validCount -= 1;
        invalidCount += 1;
      }
    }
  }

  const activeCount = validCount + invalidCount;

  const platform_distribution = [...platformCounts.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([platform, count]) => ({ platform, count }));
  const transport_distribution = [...transportCounts.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([transport, count]) => ({ transport, count }));

  const next_action = resolveNextAction({
    activeCount,
    validCount,
    invalidCount,
    seeds,
  });

  return {
    seeds,
    valid_count: validCount,
    invalid_count: invalidCount,
    disabled_count: disabledCount,
    active_count: activeCount,
    platform_distribution,
    transport_distribution,
    issues,
    warnings,
    next_action,
    generated_at,
  };
}

function resolveNextAction(args: {
  activeCount: number;
  validCount: number;
  invalidCount: number;
  seeds: ReadonlyArray<SeedEntry>;
}): SeedNextAction {
  if (args.activeCount === 0) return "add_seed";
  if (args.invalidCount > 0) return "fix_seed_errors";

  // valid_count > 0, invalid_count === 0
  const liveSshOrSnmp = args.seeds.filter(
    (s) =>
      s.enabled &&
      (s.transport_intent === "ssh" || s.transport_intent === "snmp"),
  );
  const liveManualOrEvidence = args.seeds.filter(
    (s) =>
      s.enabled &&
      (s.transport_intent === "manual" || s.transport_intent === "unknown"),
  );

  if (
    liveSshOrSnmp.length > 0 &&
    liveSshOrSnmp.some(
      (s) => normaliseLabel(s.credential_profile_label).length === 0,
    )
  ) {
    return "attach_credential_profile";
  }
  if (liveSshOrSnmp.length === 0 && liveManualOrEvidence.length > 0) {
    return "review_manual_plan";
  }
  return "ready_for_crawl_preview";
}

export const NEXT_ACTION_DETAILS: Record<SeedNextAction, string> = {
  add_seed: "Add at least one seed to start a plan.",
  fix_seed_errors: "Resolve seed validation errors before planning a crawl.",
  attach_credential_profile:
    "Attach a credential profile label to every SSH / SNMP seed.",
  review_manual_plan:
    "All active seeds are manual or evidence-only — review the manual plan before staging a crawl.",
  ready_for_crawl_preview:
    "Seed plan is staged and ready for crawl preview when the crawler engine lands.",
};

const SECRET_GUARD = /(password|private[_-]?key|passphrase|secret)/i;

/** Deterministic Markdown receipt. Never includes secret material. */
export function toSeedPlanMarkdown(summary: SeedPlanSummary): string {
  const lines: string[] = [];
  lines.push("# Discovery Seed Plan");
  lines.push("");
  lines.push(`- Generated: ${summary.generated_at}`);
  lines.push(`- Active seeds: ${summary.active_count}`);
  lines.push(`- Valid: ${summary.valid_count}`);
  lines.push(`- Invalid: ${summary.invalid_count}`);
  lines.push(`- Disabled: ${summary.disabled_count}`);
  lines.push(`- Next action: ${summary.next_action}`);
  lines.push(`- ${NEXT_ACTION_DETAILS[summary.next_action]}`);
  lines.push("");

  if (summary.platform_distribution.length > 0) {
    lines.push("## Platform distribution");
    for (const row of summary.platform_distribution) {
      lines.push(`- ${row.platform}: ${row.count}`);
    }
    lines.push("");
  }

  if (summary.transport_distribution.length > 0) {
    lines.push("## Transport distribution");
    for (const row of summary.transport_distribution) {
      lines.push(`- ${row.transport}: ${row.count}`);
    }
    lines.push("");
  }

  const active = summary.seeds.filter((s) => s.enabled);
  if (active.length > 0) {
    lines.push("## Active seeds");
    for (const s of active) {
      const host = s.host_or_cidr.trim() || "(no host)";
      const label = normaliseLabel(s.label);
      const credLabel = normaliseLabel(s.credential_profile_label);
      const port = s.port !== null && s.port !== undefined ? `:${s.port}` : "";
      const parts: string[] = [];
      parts.push(`- ${host}${port}`);
      if (label) parts.push(`label=${label}`);
      parts.push(`platform=${s.platform_hint}`);
      parts.push(`transport=${s.transport_intent}`);
      parts.push(`source=${s.source_kind}`);
      if (credLabel) parts.push(`cred_profile=${credLabel}`);
      lines.push(parts.join(" · "));
    }
    lines.push("");
  }

  const disabled = summary.seeds.filter((s) => !s.enabled);
  if (disabled.length > 0) {
    lines.push("## Disabled seeds");
    for (const s of disabled) {
      const host = s.host_or_cidr.trim() || "(no host)";
      lines.push(`- ${host} (disabled)`);
    }
    lines.push("");
  }

  if (summary.warnings.length > 0) {
    lines.push("## Warnings");
    for (const w of summary.warnings) {
      lines.push(`- ${w}`);
    }
    lines.push("");
  }

  if (summary.issues.length > 0) {
    lines.push("## Issues");
    for (const i of summary.issues) {
      lines.push(`- [${i.kind}] ${i.message}`);
    }
    lines.push("");
  }

  const result = lines.join("\n");
  if (SECRET_GUARD.test(result)) {
    // Defensive guard: if any caller has somehow injected secret-looking
    // text, redact rather than emit. This should never trip in normal use.
    return result.replace(SECRET_GUARD, "[redacted]");
  }
  return result;
}

let _idCounter = 0;
/** Test-friendly stable id generator. Resettable in tests. */
export function nextSeedId(prefix = "seed"): string {
  _idCounter += 1;
  return `${prefix}_${_idCounter}`;
}

/** Reset counter — only used by tests. */
export function _resetSeedIdCounter(): void {
  _idCounter = 0;
}
