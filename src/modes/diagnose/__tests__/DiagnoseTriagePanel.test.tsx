/**
 * V1BW — DiagnoseTriagePanel render contract.
 */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiagnoseTriagePanel } from "../DiagnoseTriagePanel";
import {
  EMPTY_DIAGNOSE_TRIAGE,
  buildDiagnoseTriage,
} from "../diagnoseTriage";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../../../state/workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../../../state/assessmentReadiness";
import { EMPTY_OPERATOR_ACTIVITY_LEDGER } from "../../../state/operatorActivityLedger";

describe("DiagnoseTriagePanel", () => {
  it("renders clean-state body when no findings", () => {
    render(<DiagnoseTriagePanel triage={EMPTY_DIAGNOSE_TRIAGE} />);
    expect(screen.getByTestId("dx-triage-clean")).toBeInTheDocument();
    expect(screen.queryByTestId("dx-triage-list")).not.toBeInTheDocument();
    expect(screen.getByTestId("dx-triage-total")).toHaveTextContent("0");
  });

  it("renders findings list with severity, category, reason, action", () => {
    const triage = buildDiagnoseTriage({
      summary: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 5,
          edge_count: 0,
        },
      },
      readiness: EMPTY_ASSESSMENT_READINESS,
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    });
    render(<DiagnoseTriagePanel triage={triage} />);
    expect(screen.getByTestId("dx-triage-list")).toBeInTheDocument();
    expect(
      screen.getByTestId("dx-triage-triage-topology-no-edges"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("dx-triage-reason-triage-topology-no-edges"),
    ).toHaveTextContent("topology_without_edges");
    expect(
      screen.getByTestId("dx-triage-severity-triage-topology-no-edges"),
    ).toHaveTextContent("Warning");
    expect(
      screen.getByTestId("dx-triage-category-triage-topology-no-edges"),
    ).toHaveTextContent("Topology");
  });

  it("summary counts reflect triage totals", () => {
    const triage = buildDiagnoseTriage({
      summary: {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        evidence_import: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
          accepted_evidence_total: 1,
        },
      },
      readiness: { ...EMPTY_ASSESSMENT_READINESS, overall_state: "blocked" },
      ledger: EMPTY_OPERATOR_ACTIVITY_LEDGER,
    });
    render(<DiagnoseTriagePanel triage={triage} />);
    expect(screen.getByTestId("dx-triage-critical")).toHaveTextContent(
      String(triage.critical_count),
    );
    expect(screen.getByTestId("dx-triage-total")).toHaveTextContent(
      String(triage.total_count),
    );
  });
});
