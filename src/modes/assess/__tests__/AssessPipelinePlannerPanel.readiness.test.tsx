import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssessPipelinePlannerPanel } from "../AssessPipelinePlannerPanel";
import { EMPTY_ASSESSMENT_READINESS, type AssessmentReadiness } from "../../../state/assessmentReadiness";

describe("AssessPipelinePlannerPanel — Readiness Preflight", () => {
  it("no readiness prop → assess-readiness-preflight testid absent (backward compat)", () => {
    render(<AssessPipelinePlannerPanel />);
    expect(screen.queryByTestId("assess-readiness-preflight")).not.toBeInTheDocument();
  });

  it("with EMPTY_ASSESSMENT_READINESS → preflight section renders with overall_state=empty + next_action stage_seeds", () => {
    render(<AssessPipelinePlannerPanel readiness={EMPTY_ASSESSMENT_READINESS} />);

    expect(screen.getByTestId("assess-readiness-preflight")).toBeInTheDocument();
    expect(screen.getByTestId("assess-readiness-overall")).toHaveTextContent("empty");
    expect(screen.getByTestId("assess-readiness-next-stage_seeds")).toBeInTheDocument();
  });

  it("with ready readiness fixture → overall_state=ready + action ready_for_assess_preflight", () => {
    const readyFixture: AssessmentReadiness = {
      overall_state: "ready",
      discovery_state: "preview_built",
      topology_state: "nodes_and_edges",
      evidence_state: "evidence_available",
      intake_state: "devices_parsed",
      assess_state: "context_ready",
      missing_inputs: [],
      available_inputs: ["discovery_seeds", "crawl_preview", "topology", "evidence", "intake"],
      next_actions: ["configure_assess_profile", "ready_for_assess_preflight"],
      blocker_reason_codes: [],
    };

    render(<AssessPipelinePlannerPanel readiness={readyFixture} />);

    expect(screen.getByTestId("assess-readiness-overall")).toHaveTextContent("ready");
    expect(screen.getByTestId("assess-readiness-assess-state")).toHaveTextContent("context_ready");
    expect(screen.getByTestId("assess-readiness-next-ready_for_assess_preflight")).toBeInTheDocument();
  });

  it("missing/available inputs render their respective testids", () => {
    const partialFixture: AssessmentReadiness = {
      overall_state: "partial",
      discovery_state: "seeds_only",
      topology_state: "no_topology",
      evidence_state: "imports_attempted",
      intake_state: "parsing_active",
      assess_state: "context_partial",
      missing_inputs: ["topology", "intake"],
      available_inputs: ["discovery_seeds", "evidence"],
      next_actions: ["build_crawl_preview", "import_evidence"],
      blocker_reason_codes: [],
    };

    render(<AssessPipelinePlannerPanel readiness={partialFixture} />);

    expect(screen.getByTestId("assess-readiness-available")).toHaveTextContent("discovery_seeds, evidence");
    expect(screen.getByTestId("assess-readiness-missing")).toHaveTextContent("topology, intake");
  });

  it("blocker reason codes render when present", () => {
    const blockedFixture: AssessmentReadiness = {
      overall_state: "blocked",
      discovery_state: "no_seeds",
      topology_state: "no_topology",
      evidence_state: "no_evidence",
      intake_state: "intake_failed",
      assess_state: "blocked",
      missing_inputs: ["discovery_seeds", "topology", "evidence", "intake"],
      available_inputs: [],
      next_actions: ["stage_seeds"],
      blocker_reason_codes: ["evidence_rejected_majority", "intake_failed"],
    };

    render(<AssessPipelinePlannerPanel readiness={blockedFixture} />);

    expect(screen.getByTestId("assess-readiness-blockers")).toHaveTextContent(
      "evidence_rejected_majority, intake_failed",
    );
  });

  it("honesty footer text visible when readiness provided", () => {
    render(<AssessPipelinePlannerPanel readiness={EMPTY_ASSESSMENT_READINESS} />);

    const honestyText = screen.getByText(
      /Preflight readiness — derived from local workbench context\. No assessment executed yet\./,
    );
    expect(honestyText).toBeInTheDocument();
  });

  it("sub-states render in grid with correct testids", () => {
    const fixture: AssessmentReadiness = {
      overall_state: "partial",
      discovery_state: "seeds_only",
      topology_state: "nodes_only",
      evidence_state: "imports_attempted",
      intake_state: "devices_parsed",
      assess_state: "context_partial",
      missing_inputs: [],
      available_inputs: ["discovery_seeds", "topology", "evidence", "intake"],
      next_actions: ["review_topology"],
      blocker_reason_codes: [],
    };

    render(<AssessPipelinePlannerPanel readiness={fixture} />);

    expect(screen.getByTestId("assess-readiness-discovery-state")).toHaveTextContent("seeds_only");
    expect(screen.getByTestId("assess-readiness-topology-state")).toHaveTextContent("nodes_only");
    expect(screen.getByTestId("assess-readiness-evidence-state")).toHaveTextContent("imports_attempted");
    expect(screen.getByTestId("assess-readiness-intake-state")).toHaveTextContent("devices_parsed");
  });

  it("preflight section renders above profile section", () => {
    render(<AssessPipelinePlannerPanel readiness={EMPTY_ASSESSMENT_READINESS} />);

    const preflightSection = screen.getByTestId("assess-readiness-preflight");
    const profileSection = screen.getByText("Profile", { selector: "h3" });

    // Verify preflight comes before profile in the DOM
    expect(preflightSection.compareDocumentPosition(profileSection)).toBe(
      preflightSection.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
