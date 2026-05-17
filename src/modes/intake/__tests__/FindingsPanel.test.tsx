/**
 * V1P FindingsPanel — render lock.
 *
 * Synthesizes ValidationReport fixtures inline (no Tauri command).
 * Locks honesty rules: counts from findings array verbatim, severity
 * renders directly, clean+skipped visible-but-collapsed.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  Finding,
  Severity,
  ValidationReport,
  ValidatorContext,
} from "../../../types/validator";
import { FindingsPanel } from "../components/FindingsPanel";

const CONTEXT: ValidatorContext = {
  platform_id: "cisco-iosxe",
  parser_id: "cisco-iosxe",
  parser_version: "3",
  selection_mode: "manual_override",
  detection_confidence: null,
  detection_source: "manual_override",
  source_context: null,
};

function finding(
  ruleId: string,
  severity: Severity,
  title: string,
  key?: string,
): Finding {
  return {
    finding_key: key ?? `${ruleId}:test:${title}`,
    rule_id: ruleId,
    rule_version: 1,
    severity,
    signal: "hard",
    title,
    evidence: [
      {
        kind: "model_path",
        model_path: "services[0]",
        line_start: null,
        line_end: null,
        raw_excerpt: null,
        note: "evidence detail here",
      },
    ],
    affected_area: "services_snmp",
    recommendation: "Do the thing.",
  };
}

function report(
  findings: ReadonlyArray<Finding>,
  clean: ReadonlyArray<string> = [],
  skipped: ReadonlyArray<{ rule_id: string; reason: "area_not_in_scope" | "area_absent" | "insufficient_data" }> = [],
): ValidationReport {
  return {
    validator_version: 1,
    rule_pack_version: 1,
    context: CONTEXT,
    findings,
    clean_rules: clean,
    skipped_rules: skipped.map((s) => ({ ...s, area: "services_snmp" })),
  };
}

describe("FindingsPanel", () => {
  it("renders header with validator_version and rule_pack_version", () => {
    render(<FindingsPanel report={report([])} />);
    expect(screen.getByText(/validator v1/)).toBeInTheDocument();
    expect(screen.getByText(/pack v1/)).toBeInTheDocument();
  });

  it("renders 'No findings' when findings array is empty", () => {
    render(<FindingsPanel report={report([])} />);
    expect(screen.getByText("No findings.")).toBeInTheDocument();
  });

  it("renders correct severity counts from a mixed report", () => {
    const r = report([
      finding("MGMT-HYG-001", "high", "h1"),
      finding("MGMT-HYG-002", "medium", "m1"),
      finding("MGMT-HYG-003", "medium", "m2"),
      finding("MGMT-HYG-004", "low", "l1"),
    ]);
    render(<FindingsPanel report={r} />);
    expect(screen.getByText("HIGH 1")).toBeInTheDocument();
    expect(screen.getByText("MED 2")).toBeInTheDocument();
    expect(screen.getByText("LOW 1")).toBeInTheDocument();
    expect(screen.getByText("INFO 0")).toBeInTheDocument();
    expect(screen.getByText("total 4")).toBeInTheDocument();
  });

  it("hides CRIT count when zero, shows when present", () => {
    const { rerender } = render(<FindingsPanel report={report([])} />);
    expect(screen.queryByText(/CRIT/)).toBeNull();
    rerender(
      <FindingsPanel
        report={report([finding("MGMT-HYG-099", "critical", "boom")])}
      />,
    );
    expect(screen.getByText("CRIT 1")).toBeInTheDocument();
  });

  it("renders one row per finding with rule_id and title", () => {
    const r = report([
      finding("MGMT-HYG-001", "high", "Default SNMP community"),
    ]);
    render(<FindingsPanel report={r} />);
    // rule_id appears twice (row summary + meta footer inside drilldown).
    expect(screen.getAllByText("MGMT-HYG-001").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Default SNMP community")).toBeInTheDocument();
  });

  it("renders evidence + recommendation + meta inside drill-down", () => {
    const r = report([
      finding("MGMT-HYG-001", "high", "Default SNMP community"),
    ]);
    render(<FindingsPanel report={r} />);
    expect(screen.getByText("services[0]")).toBeInTheDocument();
    expect(screen.getByText(/evidence detail here/)).toBeInTheDocument();
    expect(screen.getByText("Do the thing.")).toBeInTheDocument();
    expect(screen.getByText(/rule v1/)).toBeInTheDocument();
    expect(screen.getByText(/area: services_snmp/)).toBeInTheDocument();
  });

  it("omits the recommendation block when recommendation is null", () => {
    const f = finding("MGMT-HYG-001", "high", "no-rec");
    const fNoRec = { ...f, recommendation: null };
    render(<FindingsPanel report={report([fNoRec])} />);
    expect(screen.queryByText("Recommendation")).toBeNull();
  });

  it("renders severity modifier classes per row", () => {
    const r = report([finding("MGMT-HYG-099", "critical", "boom")]);
    render(<FindingsPanel report={r} />);
    const li = document.querySelector(".intake-findings__row--critical");
    expect(li).not.toBeNull();
  });

  it("clean + skipped footer carries the rule lists", () => {
    const r = report(
      [],
      ["MGMT-HYG-001", "MGMT-HYG-002"],
      [{ rule_id: "MGMT-HYG-003", reason: "area_not_in_scope" }],
    );
    render(<FindingsPanel report={r} />);
    expect(screen.getByText(/Clean: 2 rule\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/Skipped: 1 rule\(s\)/)).toBeInTheDocument();
    // Open both footer details to make their inner items findable.
    for (const el of document.querySelectorAll(
      "details.intake-findings__group",
    )) {
      (el as HTMLDetailsElement).open = true;
    }
    expect(screen.getByText("MGMT-HYG-001")).toBeInTheDocument();
    expect(screen.getByText("MGMT-HYG-002")).toBeInTheDocument();
    expect(screen.getByText("MGMT-HYG-003")).toBeInTheDocument();
    expect(screen.getByText(/area not in scope/)).toBeInTheDocument();
  });
});
