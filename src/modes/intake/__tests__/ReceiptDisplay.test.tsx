import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReceiptView } from "../../../types/receipt";
import { ReceiptDisplay } from "../components/ReceiptDisplay";

function build(overrides: Partial<ReceiptView> = {}): ReceiptView {
  return {
    hostname: "r1",
    platform_id: "cisco-iosxe",
    os_version: "17.6.4",
    source: "router.cfg",
    source_kind: "config_file",
    byte_size: 1024,
    line_count: 120,
    parser_version: "cisco-iosxe-v3",
    registry_version: "registry-v1",
    score: 0.94,
    coverage_ratio: 0.85,
    parsed_line_count: 102,
    unknown_line_count: 18,
    observed_maturity: "l2topology",
    areas: [
      { name: "interfaces", status: "populated", populated_count: 12 },
      { name: "bgp", status: "absent", populated_count: 0 },
    ],
    warnings: ["interface Ethernet5/14: speed clamp suspicious"],
    unknowns: [
      {
        line_start: 87,
        line_end: 89,
        context_path: "router bgp 65000",
        reason: "unsupported_block",
        raw: "  bgp listen range 10.0.0.0/8 peer-group PG",
      },
    ],
    unknowns_truncated: false,
    ...overrides,
  };
}

describe("ReceiptDisplay", () => {
  it("displays parser_version visibly", () => {
    render(<ReceiptDisplay receipt={build()} isManualOverride={false} />);
    expect(screen.getByText(/cisco-iosxe-v3/)).toBeInTheDocument();
  });

  it("renders parser warnings verbatim", () => {
    render(<ReceiptDisplay receipt={build()} isManualOverride={false} />);
    expect(
      screen.getByText("interface Ethernet5/14: speed clamp suspicious"),
    ).toBeInTheDocument();
  });

  it("renders unknown lines including raw text and reason", () => {
    render(<ReceiptDisplay receipt={build()} isManualOverride={false} />);
    // Raw text rendered verbatim — match by substring so leading whitespace
    // doesn't make the assertion brittle. Honest-evidence rule still asserted.
    expect(
      screen.getByText(/bgp listen range 10\.0\.0\.0\/8 peer-group PG/),
    ).toBeInTheDocument();
    expect(screen.getByText("unsupported_block")).toBeInTheDocument();
    expect(screen.getByText("87–89")).toBeInTheDocument();
    // And the textContent of the rendered cell preserves the leading spaces
    // exactly — assert against the raw element to lock the verbatim contract.
    const cell = screen.getByText(/bgp listen range 10\.0\.0\.0\/8 peer-group PG/);
    expect(cell.textContent).toBe("  bgp listen range 10.0.0.0/8 peer-group PG");
  });

  it("shows (not set) for null/empty fields instead of hiding them", () => {
    render(
      <ReceiptDisplay
        receipt={build({ hostname: null, os_version: null, parser_version: null })}
        isManualOverride={false}
      />,
    );
    const notSet = screen.getAllByText("(not set)");
    expect(notSet.length).toBeGreaterThanOrEqual(2);
  });

  it("marks selection mode when manual override was used", () => {
    render(<ReceiptDisplay receipt={build()} isManualOverride />);
    expect(screen.getByText("manual override")).toBeInTheDocument();
  });

  it("surfaces TRUNCATED tag when unknowns_truncated is true", () => {
    render(
      <ReceiptDisplay receipt={build({ unknowns_truncated: true })} isManualOverride={false} />,
    );
    expect(screen.getByText("TRUNCATED")).toBeInTheDocument();
  });
});
