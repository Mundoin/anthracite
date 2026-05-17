import { describe, expect, it } from "vitest";

import type {
  BatchRunExport,
  BatchRunExportDevice,
  BatchRunExportFinding,
} from "../../../types/batchRunExport";
import type { Severity } from "../../../types/validator";
import {
  applyTriage,
  defaultExpandedSliceIds,
  deviceIdentity,
  distinctRuleIds,
  EMPTY_FILTERS,
  filtersAreActive,
  findingMatches,
  groupBySeverity,
  presentSeverityChips,
  ruleIdCounts,
  severityChipCounts,
  type TriageFilters,
} from "../triage";

function finding(
  rule_id: string,
  severity: Severity,
  title = `title-${rule_id}`,
): BatchRunExportFinding {
  return {
    finding_key: `${rule_id}-${title}`,
    rule_id,
    rule_version: 1,
    severity,
    signal: "hard",
    title,
    evidence: [],
    affected_area: "x",
    recommendation: null,
  };
}

function device(
  slice_id: string,
  opts: {
    hostname?: string | null;
    platform_id?: string | null;
    vendor?: string | null;
    stage_status?: BatchRunExportDevice["stage_status"];
    findings?: BatchRunExportFinding[];
    skipped?: string[];
  } = {},
): BatchRunExportDevice {
  const findings = opts.findings ?? [];
  const skipped = (opts.skipped ?? []).map((rule_id) => ({
    rule_id,
    reason: "area_absent" as const,
    area: null,
  }));
  return {
    slice_id,
    hostname_hint: opts.hostname ?? null,
    source_provenance: null,
    stage_status: opts.stage_status ?? "complete",
    selected_platform:
      opts.platform_id !== undefined
        ? {
            platform_id: opts.platform_id ?? "",
            vendor: opts.vendor ?? null,
            os_family: null,
            os_version_raw: null,
            os_version_normalized: null,
            detection_confidence: null,
          }
        : null,
    is_manual_override: false,
    detection_summary: null,
    receipt_summary: null,
    validation_report:
      opts.stage_status === "complete" ||
      opts.stage_status === undefined ||
      findings.length > 0 ||
      skipped.length > 0
        ? {
            validator_version: 1,
            rule_pack_version: 1,
            context: {
              platform_id: opts.platform_id ?? null,
              parser_id: opts.platform_id ?? null,
              parser_version: null,
              selection_mode: "from_detection",
              detection_confidence: null,
              detection_source: null,
              source_context: null,
            },
            findings,
            clean_rules: [],
            skipped_rules: skipped,
          }
        : null,
    finding_counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    stage_error: null,
  };
}

function artifact(devices: BatchRunExportDevice[]): BatchRunExport {
  return {
    export_version: 1,
    kind: "batch_run_export",
    batch_run_status: "complete",
    source: { kind: "paste" },
    summary: {
      total_count: devices.length,
      parsed_count: devices.length,
      failed_count: 0,
      skipped_count: 0,
      pending_count: 0,
      with_findings_count: devices.filter(
        (d) => (d.validation_report?.findings.length ?? 0) > 0,
      ).length,
      clean_count: devices.filter(
        (d) =>
          d.stage_status === "complete" &&
          (d.validation_report?.findings.length ?? 0) === 0,
      ).length,
      severity_counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    },
    generated_by: { app_name: "Anthracite", stage: "V1R" },
    versions: {
      validator_versions: [1],
      rule_pack_versions: [1],
      parser_versions: ["1.0.0"],
      registry_versions: ["1"],
    },
    devices,
    omitted: {
      raw_config_text: "omitted_by_default",
      detection_evidence_preview: "omitted_to_avoid_raw_config_excerpt",
      finding_raw_excerpt: "omitted_to_avoid_raw_config_excerpt",
      device_model: "omitted_use_receipt_summary",
      timestamps: "omitted_for_determinism",
      batch_run_epoch: "omitted_frontend_control_only",
    },
  };
}

// -----------------------------------------------------------------------------
// deviceIdentity
// -----------------------------------------------------------------------------

describe("deviceIdentity", () => {
  it("derives hostname, platform, vendor, finding count and highest severity", () => {
    const d = device("slc-1", {
      hostname: "rtr-a",
      platform_id: "cisco-iosxe",
      vendor: "cisco",
      findings: [
        finding("R-1", "low"),
        finding("R-2", "critical"),
        finding("R-3", "medium"),
      ],
    });
    const id = deviceIdentity(d);
    expect(id.slice_id).toBe("slc-1");
    expect(id.hostname).toBe("rtr-a");
    expect(id.platform_id).toBe("cisco-iosxe");
    expect(id.vendor).toBe("cisco");
    expect(id.findingCount).toBe(3);
    expect(id.highestSeverity).toBe("critical");
    expect(id.isClean).toBe(false);
    expect(id.hasSkippedRules).toBe(false);
  });

  it("flags clean device when complete + zero findings + validation report present", () => {
    const d = device("slc-clean", { findings: [] });
    expect(deviceIdentity(d).isClean).toBe(true);
  });

  it("flags skipped rules presence", () => {
    const d = device("slc-skip", { findings: [], skipped: ["R-x"] });
    expect(deviceIdentity(d).hasSkippedRules).toBe(true);
    expect(deviceIdentity(d).isClean).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// defaultExpandedSliceIds
// -----------------------------------------------------------------------------

describe("defaultExpandedSliceIds", () => {
  it("expands devices with findings, collapses clean devices", () => {
    const art = artifact([
      device("a", { findings: [finding("R-1", "high")] }),
      device("b", { findings: [] }),
      device("c", { findings: [finding("R-2", "info")] }),
    ]);
    const expanded = defaultExpandedSliceIds(art);
    expect([...expanded].sort()).toEqual(["a", "c"]);
  });
});

// -----------------------------------------------------------------------------
// chip / rule option derivation
// -----------------------------------------------------------------------------

describe("presentSeverityChips", () => {
  it("includes only severities actually present, plus clean/skipped when applicable", () => {
    const art = artifact([
      device("a", {
        findings: [finding("R-1", "high"), finding("R-2", "info")],
      }),
      device("b", { findings: [] }),
      device("c", { findings: [], skipped: ["R-z"] }),
    ]);
    expect(presentSeverityChips(art)).toEqual([
      "high",
      "info",
      "clean",
      "skipped",
    ]);
  });

  it("returns empty array when artifact has no devices", () => {
    expect(presentSeverityChips(artifact([]))).toEqual([]);
  });
});

describe("distinctRuleIds", () => {
  it("returns sorted unique rule ids across all devices", () => {
    const art = artifact([
      device("a", {
        findings: [finding("R-2", "high"), finding("R-1", "low")],
      }),
      device("b", { findings: [finding("R-1", "high")] }),
    ]);
    expect(distinctRuleIds(art)).toEqual(["R-1", "R-2"]);
  });
});

// -----------------------------------------------------------------------------
// counts
// -----------------------------------------------------------------------------

describe("severityChipCounts", () => {
  it("counts findings per severity and devices per clean/skipped chip", () => {
    const art = artifact([
      device("a", {
        findings: [finding("R-1", "high"), finding("R-2", "high")],
      }),
      device("b", { findings: [] }),
      device("c", { findings: [], skipped: ["R-x"] }),
      device("d", { findings: [finding("R-3", "info")] }),
    ]);
    const counts = severityChipCounts(art);
    expect(counts.get("high")).toBe(2);
    expect(counts.get("info")).toBe(1);
    // device 'b' is clean (no findings, no skipped); device 'c' has a
    // skipped rule so it is counted only under "skipped".
    expect(counts.get("clean")).toBe(1);
    expect(counts.get("skipped")).toBe(1);
  });
});

describe("ruleIdCounts", () => {
  it("counts findings per rule_id across all devices", () => {
    const art = artifact([
      device("a", {
        findings: [finding("R-1", "low"), finding("R-1", "low")],
      }),
      device("b", { findings: [finding("R-2", "high")] }),
    ]);
    const counts = ruleIdCounts(art);
    expect(counts.get("R-1")).toBe(2);
    expect(counts.get("R-2")).toBe(1);
  });
});

// -----------------------------------------------------------------------------
// findingMatches
// -----------------------------------------------------------------------------

describe("findingMatches", () => {
  it("returns true when no filters are active", () => {
    expect(findingMatches(finding("R-1", "high"), EMPTY_FILTERS)).toBe(true);
  });

  it("severity filter narrows to matching severities only", () => {
    const filters: TriageFilters = {
      search: "",
      severities: new Set(["critical", "high"]),
      ruleIds: new Set(),
    };
    expect(findingMatches(finding("R-1", "high"), filters)).toBe(true);
    expect(findingMatches(finding("R-1", "low"), filters)).toBe(false);
  });

  it("rule filter narrows to matching rule ids only", () => {
    const filters: TriageFilters = {
      search: "",
      severities: new Set(),
      ruleIds: new Set(["R-1"]),
    };
    expect(findingMatches(finding("R-1", "high"), filters)).toBe(true);
    expect(findingMatches(finding("R-2", "high"), filters)).toBe(false);
  });

  it("search matches rule_id or title (case-insensitive)", () => {
    const filters: TriageFilters = {
      search: "MGMT",
      severities: new Set(),
      ruleIds: new Set(),
    };
    expect(findingMatches(finding("mgmt-hyg-001", "high"), filters)).toBe(
      true,
    );
    expect(
      findingMatches(finding("DIAG", "high", "MGMT-style note"), filters),
    ).toBe(true);
    expect(findingMatches(finding("X", "high", "unrelated"), filters)).toBe(
      false,
    );
  });
});

// -----------------------------------------------------------------------------
// applyTriage
// -----------------------------------------------------------------------------

describe("applyTriage", () => {
  const ART = artifact([
    device("dev-a", {
      hostname: "rtr-a",
      platform_id: "cisco-iosxe",
      vendor: "cisco",
      findings: [
        finding("R-1", "high", "NTP missing"),
        finding("R-2", "low", "DNS missing"),
      ],
    }),
    device("dev-b", {
      hostname: "rtr-b",
      platform_id: "juniper-junos",
      vendor: "juniper",
      findings: [finding("R-3", "info", "Banner missing")],
    }),
    device("dev-c", {
      hostname: "rtr-c",
      platform_id: "cisco-nxos",
      vendor: "cisco",
      findings: [],
    }),
    device("dev-d", {
      hostname: "rtr-d",
      platform_id: "arista-eos",
      vendor: "arista",
      findings: [],
      skipped: ["R-9"],
    }),
  ]);

  it("returns every device with all findings when no filters active", () => {
    const out = applyTriage(ART, EMPTY_FILTERS);
    expect(out).toHaveLength(4);
    expect(out[0].visibleFindings).toHaveLength(2);
    expect(out[2].visibleFindings).toHaveLength(0);
  });

  it("severity filter hides devices with no surviving findings", () => {
    const out = applyTriage(ART, {
      search: "",
      severities: new Set(["high"]),
      ruleIds: new Set(),
    });
    expect(out.map((v) => v.identity.slice_id)).toEqual(["dev-a"]);
    expect(out[0].visibleFindings).toHaveLength(1);
    expect(out[0].visibleFindings[0].rule_id).toBe("R-1");
  });

  it("rule filter narrows findings and hides devices with none", () => {
    const out = applyTriage(ART, {
      search: "",
      severities: new Set(),
      ruleIds: new Set(["R-3"]),
    });
    expect(out.map((v) => v.identity.slice_id)).toEqual(["dev-b"]);
  });

  it("clean chip alone shows clean devices with all their (zero) findings", () => {
    const out = applyTriage(ART, {
      search: "",
      severities: new Set(["clean"]),
      ruleIds: new Set(),
    });
    expect(out.map((v) => v.identity.slice_id)).toEqual(["dev-c"]);
  });

  it("skipped chip alone shows devices with at least one skipped rule", () => {
    const out = applyTriage(ART, {
      search: "",
      severities: new Set(["skipped"]),
      ruleIds: new Set(),
    });
    expect(out.map((v) => v.identity.slice_id)).toEqual(["dev-d"]);
  });

  it("identity-only search keeps matching devices visible even with zero findings", () => {
    const out = applyTriage(ART, {
      search: "rtr-c",
      severities: new Set(),
      ruleIds: new Set(),
    });
    expect(out.map((v) => v.identity.slice_id)).toEqual(["dev-c"]);
  });

  it("combined severity + search narrows correctly", () => {
    const out = applyTriage(ART, {
      search: "NTP",
      severities: new Set(["high"]),
      ruleIds: new Set(),
    });
    expect(out.map((v) => v.identity.slice_id)).toEqual(["dev-a"]);
    expect(out[0].visibleFindings).toHaveLength(1);
  });

  it("does not mutate the input artifact", () => {
    const before = JSON.stringify(ART);
    applyTriage(ART, {
      search: "x",
      severities: new Set(["high", "low"]),
      ruleIds: new Set(["R-1"]),
    });
    expect(JSON.stringify(ART)).toBe(before);
  });
});

// -----------------------------------------------------------------------------
// groupBySeverity
// -----------------------------------------------------------------------------

describe("groupBySeverity", () => {
  it("groups visible findings under severity headings in canonical order", () => {
    const visible = applyTriage(
      artifact([
        device("a", {
          findings: [finding("R-1", "high"), finding("R-2", "low")],
        }),
        device("b", { findings: [finding("R-3", "high")] }),
      ]),
      EMPTY_FILTERS,
    );
    const groups = groupBySeverity(visible);
    expect(groups.map((g) => g.severity)).toEqual(["high", "low"]);
    expect(groups[0].rows).toHaveLength(2);
    expect(groups[1].rows).toHaveLength(1);
  });

  it("omits severities with zero rows", () => {
    const visible = applyTriage(
      artifact([device("a", { findings: [finding("R-1", "info")] })]),
      EMPTY_FILTERS,
    );
    const groups = groupBySeverity(visible);
    expect(groups.map((g) => g.severity)).toEqual(["info"]);
  });
});

// -----------------------------------------------------------------------------
// filtersAreActive
// -----------------------------------------------------------------------------

describe("filtersAreActive", () => {
  it("returns false for EMPTY_FILTERS", () => {
    expect(filtersAreActive(EMPTY_FILTERS)).toBe(false);
  });

  it("returns true when any field is populated", () => {
    expect(
      filtersAreActive({
        search: "x",
        severities: new Set(),
        ruleIds: new Set(),
      }),
    ).toBe(true);
    expect(
      filtersAreActive({
        search: "",
        severities: new Set(["high"]),
        ruleIds: new Set(),
      }),
    ).toBe(true);
    expect(
      filtersAreActive({
        search: "",
        severities: new Set(),
        ruleIds: new Set(["R-1"]),
      }),
    ).toBe(true);
  });
});
