/**
 * Diagnose Seed — pure projection (V1AW).
 *
 * Deterministic rules over already-available data:
 *   - DiscoveryDeviceRecord[] (DeviceModel-backed, V1AF/V1AI/V1AK)
 *   - TopologyView (V1AJ/V1AS), optional
 *
 * No engine wire types, no I/O, no DeviceModel schema expansion. Same
 * input always yields the same DiagnoseModel.
 *
 * Doctrine: `docs/architecture/DIAGNOSE_SEED_CONTRACT.md`.
 */

import type { DiscoveryDeviceRecord } from "../../types/discovery";
import type { DeviceModel, ServiceKind } from "../../types/networkModel";
import type { TopologyView } from "../../types/topology";

import {
  DIAGNOSE_CATEGORY_ORDER,
  DIAGNOSE_SEVERITY_ORDER,
  type DiagnoseAnswer,
  type DiagnoseCategory,
  type DiagnoseCategoryCount,
  type DiagnoseEvidence,
  type DiagnoseModel,
  type DiagnoseSummary,
} from "./diagnoseTypes";

export interface DiagnoseProjectionInput {
  readonly devices: ReadonlyArray<DiscoveryDeviceRecord>;
  readonly topology: TopologyView | null;
  /** Optional override list — `platform_id` values currently known to
   *  have no parser. Default mirrors the V1AV-era parser gap matrix:
   *  `cisco-iosxr` and `mikrotik-routeros`. */
  readonly known_unsupported_platforms?: ReadonlyArray<string>;
}

const DEFAULT_UNSUPPORTED_PLATFORMS: ReadonlyArray<string> = Object.freeze([
  "cisco-iosxr",
  "mikrotik-routeros",
]);

const EMPTY_MODEL: DiagnoseModel = Object.freeze({
  answers: Object.freeze([]) as ReadonlyArray<DiagnoseAnswer>,
  summary: Object.freeze({
    total_answers: 0,
    critical_count: 0,
    warning_count: 0,
    info_count: 0,
    per_category: Object.freeze([]) as ReadonlyArray<DiagnoseCategoryCount>,
  }) as DiagnoseSummary,
  is_empty_input: true,
}) as DiagnoseModel;

// ---------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------

export function projectDiagnose(input: DiagnoseProjectionInput): DiagnoseModel {
  const devices = Array.isArray(input.devices) ? input.devices : [];
  const topology = input.topology ?? null;

  // Empty iff truly nothing to project over. A non-null TopologyView is
  // worth running even when its nodes/edges are empty — projection_stats
  // and evidence_stats may still expose rejections worth surfacing.
  if (devices.length === 0 && topology === null) {
    return EMPTY_MODEL;
  }

  const unsupportedSet = new Set(
    input.known_unsupported_platforms ?? DEFAULT_UNSUPPORTED_PLATFORMS,
  );

  const answers: DiagnoseAnswer[] = [];
  for (const device of devices) {
    if (!device || !device.device_model) continue;
    pushTelnetEnabled(device, answers);
    pushMissingHostname(device, answers);
    pushUnknownAdminStateInterfaces(device, answers);
    pushDescribedInterfacesWithoutAddressing(device, answers);
    pushUnsupportedPlatform(device, unsupportedSet, answers);
    pushOutOfScopeParserEvidence(device, answers);
  }
  pushTopologyEvidenceAnswers(topology, answers);

  answers.sort(compareAnswers);
  return {
    answers,
    summary: buildSummary(answers),
    is_empty_input: false,
  };
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function deviceLabel(record: DiscoveryDeviceRecord): string {
  const m: DeviceModel | undefined = record.device_model;
  return (
    m?.identity?.hostname?.trim() ||
    record.source_label?.trim() ||
    record.id
  );
}

function compareAnswers(a: DiagnoseAnswer, b: DiagnoseAnswer): number {
  const s = DIAGNOSE_SEVERITY_ORDER[a.severity] - DIAGNOSE_SEVERITY_ORDER[b.severity];
  if (s !== 0) return s;
  const c = DIAGNOSE_CATEGORY_ORDER[a.category] - DIAGNOSE_CATEGORY_ORDER[b.category];
  if (c !== 0) return c;
  const t = a.title.localeCompare(b.title);
  if (t !== 0) return t;
  return a.id.localeCompare(b.id);
}

function buildSummary(answers: ReadonlyArray<DiagnoseAnswer>): DiagnoseSummary {
  const perCategory = new Map<DiagnoseCategory, number>();
  let critical = 0;
  let warning = 0;
  let info = 0;
  for (const a of answers) {
    if (a.severity === "critical") critical++;
    else if (a.severity === "warning") warning++;
    else info++;
    perCategory.set(a.category, (perCategory.get(a.category) ?? 0) + 1);
  }
  const ordered: DiagnoseCategoryCount[] = [];
  const allCategories: DiagnoseCategory[] = [
    "management_access",
    "identity",
    "interfaces",
    "topology_evidence",
    "platform_support",
    "parser_scope",
  ];
  for (const cat of allCategories) {
    const n = perCategory.get(cat) ?? 0;
    if (n > 0) ordered.push({ category: cat, count: n });
  }
  return {
    total_answers: answers.length,
    critical_count: critical,
    warning_count: warning,
    info_count: info,
    per_category: ordered,
  };
}

// ---------------------------------------------------------------------
// Rule: telnet enabled (management_access · critical)
// ---------------------------------------------------------------------

function pushTelnetEnabled(
  record: DiscoveryDeviceRecord,
  out: DiagnoseAnswer[],
): void {
  const services = record.device_model?.services;
  if (!Array.isArray(services)) return;
  const telnet = services.find(
    (s): s is { readonly kind: ServiceKind } & typeof s => s?.kind === "telnet",
  );
  if (!telnet) return;
  const label = deviceLabel(record);
  const evidence: DiagnoseEvidence[] = [
    { label: "device", value: label, source: "discovery_inventory" },
    {
      label: "service",
      value: "telnet",
      source: telnet.notes ?? "device_model.services",
    },
  ];
  out.push({
    id: `management_access:telnet_enabled:${record.id}`,
    severity: "critical",
    category: "management_access",
    title: "Telnet enabled",
    affected_devices: [label],
    why_it_matters:
      "Telnet sends credentials and config in clear text. Disable it and require SSH on management vty lines.",
    evidence,
    suggested_inspection_target: `Inspect ${label} management vty / line vty configuration.`,
    source_label: "discovery_inventory",
  });
}

// ---------------------------------------------------------------------
// Rule: missing hostname (identity · warning)
// ---------------------------------------------------------------------

function pushMissingHostname(
  record: DiscoveryDeviceRecord,
  out: DiagnoseAnswer[],
): void {
  const h = record.device_model?.identity?.hostname ?? null;
  if (h !== null && h.trim() !== "") return;
  const label = record.source_label?.trim() || record.id;
  out.push({
    id: `identity:missing_hostname:${record.id}`,
    severity: "warning",
    category: "identity",
    title: "Device identity missing hostname",
    affected_devices: [label],
    why_it_matters:
      "Records without a parsed hostname cannot be reliably correlated across topology evidence or inventory exports.",
    evidence: [
      { label: "record_id", value: record.id, source: "discovery_inventory" },
      {
        label: "source_label",
        value: record.source_label ?? "(none)",
        source: "discovery_inventory",
      },
    ],
    suggested_inspection_target: `Open ${label} configuration and confirm hostname is set; reimport if the parser missed it.`,
    source_label: "discovery_inventory",
  });
}

// ---------------------------------------------------------------------
// Rule: interface admin state unknown (interfaces · info)
// ---------------------------------------------------------------------

function pushUnknownAdminStateInterfaces(
  record: DiscoveryDeviceRecord,
  out: DiagnoseAnswer[],
): void {
  const interfaces = record.device_model?.interfaces;
  if (!Array.isArray(interfaces)) return;
  const unknown = interfaces
    .filter((i) => i?.admin_state === "unknown")
    .map((i) => i.name);
  if (unknown.length === 0) return;
  const label = deviceLabel(record);
  const sorted = [...unknown].sort();
  out.push({
    id: `interfaces:unknown_admin_state:${record.id}`,
    severity: "info",
    category: "interfaces",
    title: "Interfaces with unspecified admin state",
    affected_devices: [label],
    why_it_matters:
      "Admin state could not be determined from the config. Inspect to confirm whether interfaces are intentionally left default.",
    evidence: [
      {
        label: "interfaces",
        value: sorted.slice(0, 10).join(", ") + (sorted.length > 10 ? `, … (${sorted.length} total)` : ""),
        source: "device_model.interfaces",
      },
    ],
    suggested_inspection_target: `Inspect ${label} interface admin/no-shutdown declarations.`,
    source_label: "discovery_inventory",
  });
}

// ---------------------------------------------------------------------
// Rule: interface described but no addressing (interfaces · info)
// ---------------------------------------------------------------------

function pushDescribedInterfacesWithoutAddressing(
  record: DiscoveryDeviceRecord,
  out: DiagnoseAnswer[],
): void {
  const interfaces = record.device_model?.interfaces;
  if (!Array.isArray(interfaces)) return;
  const matches = interfaces.filter(
    (i) =>
      !!i &&
      i.description !== null &&
      i.description !== undefined &&
      i.description.trim() !== "" &&
      (i.ipv4_addresses?.length ?? 0) === 0 &&
      (i.ipv6_addresses?.length ?? 0) === 0,
  );
  if (matches.length === 0) return;
  const label = deviceLabel(record);
  const sorted = [...matches.map((i) => i.name)].sort();
  out.push({
    id: `interfaces:described_no_addressing:${record.id}`,
    severity: "info",
    category: "interfaces",
    title: "Interfaces with description but no IP addressing",
    affected_devices: [label],
    why_it_matters:
      "An interface labelled for a purpose but lacking an IP often signals incomplete bring-up or an L2-only link. Worth confirming.",
    evidence: [
      {
        label: "interfaces",
        value: sorted.slice(0, 10).join(", ") + (sorted.length > 10 ? `, … (${sorted.length} total)` : ""),
        source: "device_model.interfaces",
      },
    ],
    suggested_inspection_target: `Inspect ${label} interface addressing on the listed ports.`,
    source_label: "discovery_inventory",
  });
}

// ---------------------------------------------------------------------
// Rule: unsupported platform (platform_support · warning)
// ---------------------------------------------------------------------

function pushUnsupportedPlatform(
  record: DiscoveryDeviceRecord,
  unsupported: ReadonlySet<string>,
  out: DiagnoseAnswer[],
): void {
  const platform = record.device_model?.platform;
  const platformId = platform?.platform_id ?? null;
  if (platformId === null) return;
  if (!unsupported.has(platformId)) return;
  const label = deviceLabel(record);
  out.push({
    id: `platform_support:unsupported_platform:${record.id}:${platformId}`,
    severity: "warning",
    category: "platform_support",
    title: `Platform parser not yet implemented: ${platformId}`,
    affected_devices: [label],
    why_it_matters:
      "Anthracite recognised the vendor but has no parser for this platform yet, so the canonical DeviceModel cannot be fully populated.",
    evidence: [
      {
        label: "platform_id",
        value: platformId,
        source: "device_model.platform",
      },
      {
        label: "vendor",
        value: platform?.vendor ?? "(unknown)",
        source: "device_model.platform",
      },
    ],
    suggested_inspection_target:
      "Wait for the platform parser to land, or manually review the raw config until then.",
    source_label: "discovery_inventory",
  });
}

// ---------------------------------------------------------------------
// Rule: out-of-scope parser evidence (parser_scope · info)
// ---------------------------------------------------------------------

function pushOutOfScopeParserEvidence(
  record: DiscoveryDeviceRecord,
  out: DiagnoseAnswer[],
): void {
  const unknownLines = record.device_model?.unknown_lines;
  if (!Array.isArray(unknownLines)) return;
  const oosCount = unknownLines.filter(
    (u) => u?.reason === "out_of_scope",
  ).length;
  if (oosCount === 0) return;
  const label = deviceLabel(record);
  const platformId = record.device_model?.platform?.platform_id ?? "unknown";
  out.push({
    id: `parser_scope:out_of_scope_evidence:${record.id}`,
    severity: "info",
    category: "parser_scope",
    title: "Parser left configured blocks out of scope",
    affected_devices: [label],
    why_it_matters:
      "The parser intentionally did not interpret some recognised vocabulary in this device's config. Those blocks may carry policy/security intent that Anthracite does not yet model.",
    evidence: [
      {
        label: "platform",
        value: platformId,
        source: "device_model.platform",
      },
      {
        label: "out_of_scope_line_count",
        value: String(oosCount),
        source: "device_model.unknown_lines",
      },
    ],
    suggested_inspection_target: `Spot-check ${label} raw config for the unknown_lines blocks before relying on the parsed model.`,
    source_label: "discovery_inventory",
  });
}

// ---------------------------------------------------------------------
// Rule: topology evidence honesty (topology_evidence · warning/info)
// ---------------------------------------------------------------------

function pushTopologyEvidenceAnswers(
  view: TopologyView | null,
  out: DiagnoseAnswer[],
): void {
  if (view === null || view === undefined) return;
  const evidence = view.evidence_stats;
  const projection = view.projection_stats;
  const nodes = Array.isArray(view.nodes) ? view.nodes : [];
  const edges = Array.isArray(view.edges) ? view.edges : [];

  const evidenceRejected =
    (evidence?.rejected_unknown_local ?? 0) +
    (evidence?.rejected_unknown_remote ?? 0) +
    (evidence?.rejected_self_link ?? 0);
  const factsRejected =
    (projection?.facts_rejected_unknown_node ?? 0) +
    (projection?.facts_rejected_self_link ?? 0);

  if (evidenceRejected > 0 || factsRejected > 0) {
    out.push({
      id: `topology_evidence:rejections_present:${view.environment_id ?? "all"}`,
      severity: "warning",
      category: "topology_evidence",
      title: "Topology evidence carries rejected entries",
      affected_devices: [],
      why_it_matters:
        "Some imported neighbour evidence or link facts could not be matched to known nodes and was rejected. Investigate the source so future imports resolve cleanly.",
      evidence: [
        {
          label: "evidence_rejected_total",
          value: String(evidenceRejected),
          source: "topology_view.evidence_stats",
        },
        {
          label: "facts_rejected_total",
          value: String(factsRejected),
          source: "topology_view.projection_stats",
        },
      ],
      suggested_inspection_target:
        "Open Topology Edge Review and inspect the rejection summary card.",
      source_label: "topology_view",
    });
  }

  const evidenceAccepted = evidence?.accepted ?? 0;
  if (evidenceAccepted > 0 && edges.length === 0) {
    out.push({
      id: `topology_evidence:accepted_but_no_edges:${view.environment_id ?? "all"}`,
      severity: "warning",
      category: "topology_evidence",
      title: "Accepted evidence but no projected edges",
      affected_devices: [],
      why_it_matters:
        "Evidence passed the resolver but did not produce any edges. The link-fact pipeline may be dropping facts at projection.",
      evidence: [
        {
          label: "evidence_accepted",
          value: String(evidenceAccepted),
          source: "topology_view.evidence_stats",
        },
        {
          label: "projected_edges",
          value: "0",
          source: "topology_view.edges",
        },
      ],
      suggested_inspection_target:
        "Open Topology Edge Review and check projection_stats for duplicate/self-link/unknown-node collapses.",
      source_label: "topology_view",
    });
  }

  if (
    view.adjacency_readiness?.fact_source_state === "none_available" &&
    nodes.length > 0
  ) {
    out.push({
      id: `topology_evidence:no_adjacency_sources:${view.environment_id ?? "all"}`,
      severity: "info",
      category: "topology_evidence",
      title: "No adjacency fact sources connected",
      affected_devices: [],
      why_it_matters:
        "Nodes are discovered but no LLDP / CDP / config-neighbour / manual fact source is feeding the topology engine yet. Edges will remain empty.",
      evidence: [
        {
          label: "node_count",
          value: String(nodes.length),
          source: "topology_view.nodes",
        },
        {
          label: "fact_source_state",
          value: "none_available",
          source: "topology_view.adjacency_readiness",
        },
      ],
      suggested_inspection_target:
        "Import neighbour evidence via Topology mode, or run the V1AT dry-run plan and the V1AU fixture simulator to bring edges online.",
      source_label: "topology_view",
    });
  }
}
