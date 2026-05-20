/**
 * V1BL — Discovery Crawl Preview (pure model).
 *
 * Operator-facing preview of a crawl attempt BEFORE any crawler engine or
 * live device contact exists. Takes a seed plan, options, and emits a
 * deterministic summary of what the crawler WOULD attempt.
 *
 * Hard discipline:
 *   - No device contact, no transport call, no network I/O, no recursive expansion.
 *   - CIDR ranges are STAGED INTENT only; never expanded into hosts.
 *   - Frontier is seeds-only at depth 0.
 *   - Receipt Markdown must never contain raw secret material.
 *
 * This file is engine-free. Build + Topology + Discovery transport are
 * untouched.
 */

import type { SeedEntry, SeedPlatformHint, SeedTransportIntent } from "./seedPlanner";

export type ExpansionSource = "lldp" | "cdp" | "static_neighbor" | "manual";
export type PreferredTransport = "ssh" | "snmp" | "manual" | "unknown";

export interface CrawlPreviewOptions {
  readonly max_depth: number;
  readonly max_nodes: number;
  readonly expansion_sources: ReadonlyArray<ExpansionSource>;
  readonly stop_on_duplicate: boolean;
  readonly stop_on_platform_unknown: boolean;
  readonly allow_cidr_expansion: boolean;
  readonly include_disabled_seeds: boolean;
  readonly preferred_transport: PreferredTransport;
}

export type CrawlPreviewNextAction =
  | "add_seed"
  | "fix_seed_plan"
  | "attach_credential_profile"
  | "adjust_crawl_limits"
  | "ready_for_crawl_execution_future";

export interface CrawlSeedPlan {
  readonly seed_id: string;
  readonly host_or_cidr: string;
  readonly platform_hint: SeedPlatformHint;
  readonly transport_intent: SeedTransportIntent;
  readonly planned_command_labels: ReadonlyArray<string>;
  readonly expansion_policy: ReadonlyArray<ExpansionSource>;
  readonly warnings: ReadonlyArray<string>;
}

export type BlockedSeedReason =
  | "invalid_seed"
  | "disabled_seed"
  | "missing_credential_profile"
  | "unknown_platform_blocked"
  | "cidr_expansion_deferred";

export interface BlockedSeed {
  readonly seed_id: string;
  readonly host_or_cidr: string;
  readonly reason: BlockedSeedReason;
  readonly message: string;
}

export interface CrawlPreviewSummary {
  readonly crawl_preview_id: string;
  readonly options: CrawlPreviewOptions;
  readonly active_seed_count: number;
  readonly excluded_seed_count: number;
  readonly seed_plans: ReadonlyArray<CrawlSeedPlan>;
  readonly frontier: ReadonlyArray<{ depth: number; host_or_cidr: string; seed_id: string }>;
  readonly planned_depths: ReadonlyArray<number>;
  readonly blocked_seeds: ReadonlyArray<BlockedSeed>;
  readonly warnings: ReadonlyArray<string>;
  readonly next_action: CrawlPreviewNextAction;
  readonly generated_at: string;
}

const SECRET_GUARD = /(password|private[_-]?key|passphrase|secret)/i;

function normaliseLabel(label: string): string {
  return label.trim();
}

function isLikelyCidr(s: string): boolean {
  return /^(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(s);
}

function getCommandLabelsForPlatform(
  platform: SeedPlatformHint,
  transport: SeedTransportIntent,
  expansionSources: ReadonlyArray<ExpansionSource>,
): string[] {
  if (transport !== "ssh" && transport !== "snmp") {
    return [];
  }

  const labels: string[] = [];
  const hasLldp = expansionSources.includes("lldp");
  const hasCdp = expansionSources.includes("cdp");

  if (transport === "ssh") {
    switch (platform) {
      case "iosxe":
      case "iosxr":
      case "nxos":
      case "eos":
        if (hasLldp) labels.push("show lldp neighbors");
        if (hasCdp) labels.push("show cdp neighbors");
        break;
      case "junos":
        if (hasLldp) labels.push("show lldp neighbors");
        break;
      case "fortios":
        if (hasLldp) labels.push("get system lldp neighbors");
        break;
      case "panos":
        if (hasLldp) labels.push("show lldp neighbors");
        break;
      case "mikrotik":
        if (hasLldp || hasCdp) labels.push("/ip neighbor print");
        break;
      case "vrp":
      case "sros":
      case "aoscx":
      case "vyos":
      case "checkpoint":
        if (hasLldp) labels.push("show lldp neighbors");
        break;
      case "unknown":
        break;
    }
  } else if (transport === "snmp") {
    if (hasLldp || hasCdp) {
      labels.push("bridge-mib lldp walk");
    }
  }

  return labels;
}

function validateSingleSeedForCrawl(seed: SeedEntry): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const host = seed.host_or_cidr.trim();

  if (host.length === 0) {
    issues.push("Host or CIDR is required.");
    return { valid: false, issues };
  }

  const isCidr = isLikelyCidr(host);
  const isHost = /^[a-zA-Z0-9_.-]+$/.test(host) && host.length <= 253;

  if (!isCidr && !isHost) {
    issues.push(`Host or CIDR "${host}" is not valid.`);
    return { valid: false, issues };
  }

  if (seed.port !== null && (seed.port < 1 || seed.port > 65535)) {
    issues.push(`Port ${seed.port} is invalid (1–65535).`);
    return { valid: false, issues };
  }

  const needsCred = seed.transport_intent === "ssh" || seed.transport_intent === "snmp";
  if (needsCred && normaliseLabel(seed.credential_profile_label).length === 0) {
    issues.push(`Credential profile label required for ${seed.transport_intent}.`);
    return { valid: false, issues };
  }

  return { valid: issues.length === 0, issues };
}

export function buildCrawlPreview(
  seeds: ReadonlyArray<SeedEntry>,
  options: CrawlPreviewOptions,
  generated_at: string,
  id_provider?: () => string,
): CrawlPreviewSummary {
  const idProvider = id_provider || (() => `crawl_preview_${Math.random().toString(36).slice(2, 9)}`);
  const previewId = idProvider();

  const seedPlans: CrawlSeedPlan[] = [];
  const blockedSeeds: BlockedSeed[] = [];
  const warnings: string[] = [];
  const frontierEntries: { depth: number; host_or_cidr: string; seed_id: string }[] = [];

  let activeSeedCount = 0;
  let excludedSeedCount = 0;

  for (const seed of seeds) {
    if (!seed.enabled) {
      excludedSeedCount += 1;
      continue;
    }

    const seedHost = seed.host_or_cidr.trim();
    const { valid, issues } = validateSingleSeedForCrawl(seed);

    if (!valid) {
      // Determine the specific blocked reason
      let reason: BlockedSeedReason = "invalid_seed";
      let message = issues.join(" ");

      blockedSeeds.push({ seed_id: seed.id, host_or_cidr: seedHost, reason, message });
      continue;
    }

    // Check for missing credential profile
    if (
      (seed.transport_intent === "ssh" || seed.transport_intent === "snmp") &&
      normaliseLabel(seed.credential_profile_label).length === 0
    ) {
      blockedSeeds.push({
        seed_id: seed.id,
        host_or_cidr: seedHost,
        reason: "missing_credential_profile",
        message: `Credential profile label required for ${seed.transport_intent}.`,
      });
      continue;
    }

    // Check if platform is unknown and should be blocked
    if (
      seed.platform_hint === "unknown" &&
      options.stop_on_platform_unknown
    ) {
      blockedSeeds.push({
        seed_id: seed.id,
        host_or_cidr: seedHost,
        reason: "unknown_platform_blocked",
        message: "Unknown platform and stop_on_platform_unknown is enabled.",
      });
      continue;
    }

    // Seed is active — build the plan
    activeSeedCount += 1;

    const seedWarnings: string[] = [];
    if (seed.platform_hint === "unknown" && !options.stop_on_platform_unknown) {
      seedWarnings.push("Unknown platform — crawler will need a hint.");
    }

    if (isLikelyCidr(seedHost)) {
      seedWarnings.push("CIDR expansion deferred — crawl treats as single frontier entry.");
    }

    const commandLabels = getCommandLabelsForPlatform(
      seed.platform_hint,
      seed.transport_intent,
      options.expansion_sources,
    );

    seedPlans.push({
      seed_id: seed.id,
      host_or_cidr: seedHost,
      platform_hint: seed.platform_hint,
      transport_intent: seed.transport_intent,
      planned_command_labels: commandLabels,
      expansion_policy: [...options.expansion_sources],
      warnings: seedWarnings,
    });

    // Add to frontier at depth 0
    frontierEntries.push({
      depth: 0,
      host_or_cidr: seedHost,
      seed_id: seed.id,
    });
  }

  // Compute planned depths
  const plannedDepths: number[] = [0];
  for (let d = 1; d <= options.max_depth; d++) {
    plannedDepths.push(d);
  }

  // Warnings about limits
  if (activeSeedCount > options.max_nodes) {
    warnings.push(
      `Active seed count (${activeSeedCount}) exceeds max_nodes (${options.max_nodes}). Adjust crawl limits.`,
    );
  }

  // Determine next action
  let nextAction: CrawlPreviewNextAction = "ready_for_crawl_execution_future";

  if (blockedSeeds.some((b) => b.reason === "invalid_seed")) {
    nextAction = "fix_seed_plan";
  } else if (activeSeedCount === 0 && blockedSeeds.length === 0) {
    nextAction = "add_seed";
  } else if (blockedSeeds.some((b) => b.reason === "missing_credential_profile")) {
    nextAction = "attach_credential_profile";
  } else if (activeSeedCount > options.max_nodes) {
    nextAction = "adjust_crawl_limits";
  }

  return {
    crawl_preview_id: previewId,
    options,
    active_seed_count: activeSeedCount,
    excluded_seed_count: excludedSeedCount,
    seed_plans: seedPlans,
    frontier: frontierEntries,
    planned_depths: plannedDepths,
    blocked_seeds: blockedSeeds,
    warnings,
    next_action: nextAction,
    generated_at,
  };
}

export function toCrawlPreviewMarkdown(summary: CrawlPreviewSummary): string {
  const lines: string[] = [];

  lines.push("# Discovery Crawl Preview");
  lines.push("");
  lines.push(`- Generated: ${summary.generated_at}`);
  lines.push(`- Preview ID: ${summary.crawl_preview_id}`);
  lines.push(`- Next action: ${summary.next_action}`);
  lines.push("");

  lines.push("## Options");
  lines.push(`- Max depth: ${summary.options.max_depth}`);
  lines.push(`- Max nodes: ${summary.options.max_nodes}`);
  lines.push(`- Expansion sources: ${summary.options.expansion_sources.join(", ") || "(none)"}`);
  lines.push(`- Preferred transport: ${summary.options.preferred_transport}`);
  lines.push(`- Stop on duplicate: ${summary.options.stop_on_duplicate}`);
  lines.push(`- Stop on unknown platform: ${summary.options.stop_on_platform_unknown}`);
  lines.push(`- Allow CIDR expansion: ${summary.options.allow_cidr_expansion}`);
  lines.push(`- Include disabled seeds: ${summary.options.include_disabled_seeds}`);
  lines.push("");

  lines.push("## Summary");
  lines.push(`- Active seeds: ${summary.active_seed_count}`);
  lines.push(`- Excluded seeds: ${summary.excluded_seed_count}`);
  lines.push(`- Blocked seeds: ${summary.blocked_seeds.length}`);
  lines.push(`- Planned depths: ${summary.planned_depths.join(", ")}`);
  lines.push("");

  if (summary.frontier.length > 0) {
    lines.push("## Frontier");
    for (const entry of summary.frontier) {
      lines.push(`- Depth ${entry.depth}: ${entry.host_or_cidr} (${entry.seed_id})`);
    }
    lines.push("");
  }

  if (summary.seed_plans.length > 0) {
    lines.push("## Per-seed plan");
    for (const plan of summary.seed_plans) {
      lines.push(`### ${plan.host_or_cidr}`);
      lines.push(`- Seed ID: ${plan.seed_id}`);
      lines.push(`- Platform: ${plan.platform_hint}`);
      lines.push(`- Transport: ${plan.transport_intent}`);
      if (plan.planned_command_labels.length > 0) {
        lines.push(`- Command labels: ${plan.planned_command_labels.join(", ")}`);
      } else {
        lines.push("- Command labels: (none)");
      }
      lines.push(
        `- Expansion policy: ${plan.expansion_policy.join(", ") || "(none)"}`,
      );
      if (plan.warnings.length > 0) {
        lines.push("- Warnings:");
        for (const w of plan.warnings) {
          lines.push(`  - ${w}`);
        }
      }
      lines.push("");
    }
  }

  if (summary.blocked_seeds.length > 0) {
    lines.push("## Blocked seeds");
    for (const blocked of summary.blocked_seeds) {
      lines.push(`- ${blocked.host_or_cidr} [${blocked.reason}]`);
      lines.push(`  ${blocked.message}`);
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

  lines.push("> Preview only — no device contact, no recursive crawl execution.");

  const result = lines.join("\n");
  if (SECRET_GUARD.test(result)) {
    return result.replace(SECRET_GUARD, "[redacted]");
  }
  return result;
}

let _idCounter = 0;

export function nextCrawlPreviewId(prefix = "crawl_preview"): string {
  _idCounter += 1;
  return `${prefix}_${_idCounter}`;
}

export function _resetCrawlPreviewIdCounter(): void {
  _idCounter = 0;
}
