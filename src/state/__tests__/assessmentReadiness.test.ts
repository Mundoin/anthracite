/**
 * V1BU — Comprehensive tests for AssessmentReadiness model.
 *
 * Tests cover: state transitions, overall readiness rules, next actions ordering,
 * available/missing inputs, determinism, and redaction safety.
 */

import { describe, expect, it } from "vitest";
import {
  buildAssessmentReadiness,
  EMPTY_ASSESSMENT_READINESS,
} from "../assessmentReadiness";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../workbenchContextSummary";
import { EMPTY_EVIDENCE_IMPORT_SUMMARY } from "../../modes/topology/evidenceImportSummary";
import { EMPTY_CRAWL_PREVIEW_CONTEXT_SUMMARY } from "../../modes/discovery/crawlPreviewContextSummary";

describe("AssessmentReadiness — comprehensive", () => {
  // ============================================================================
  // DISCOVERY STATE TRANSITIONS
  // ============================================================================

  describe("discovery_state transitions", () => {
    it("seed_count=0, frontier=0 → no_seeds", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.discovery,
          seed_count: 0,
        },
        crawl_preview: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.crawl_preview,
          frontier_count: 0,
        },
      });
      expect(r.discovery_state).toBe("no_seeds");
    });

    it("seed_count=2, frontier=0 → seeds_only", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.discovery,
          seed_count: 2,
        },
        crawl_preview: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.crawl_preview,
          frontier_count: 0,
        },
      });
      expect(r.discovery_state).toBe("seeds_only");
    });

    it("seed_count=2, frontier=3 → preview_built", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.discovery,
          seed_count: 2,
        },
        crawl_preview: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.crawl_preview,
          frontier_count: 3,
        },
      });
      expect(r.discovery_state).toBe("preview_built");
    });
  });

  // ============================================================================
  // TOPOLOGY STATE TRANSITIONS
  // ============================================================================

  describe("topology_state transitions", () => {
    it("node_count=0, edge_count=0 → no_topology", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 0,
          edge_count: 0,
        },
      });
      expect(r.topology_state).toBe("no_topology");
    });

    it("node_count=5, edge_count=0 → nodes_only", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 5,
          edge_count: 0,
        },
      });
      expect(r.topology_state).toBe("nodes_only");
    });

    it("node_count=5, edge_count=3 → nodes_and_edges", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 5,
          edge_count: 3,
        },
      });
      expect(r.topology_state).toBe("nodes_and_edges");
    });
  });

  // ============================================================================
  // EVIDENCE STATE TRANSITIONS
  // ============================================================================

  describe("evidence_state transitions", () => {
    it("all zero → no_evidence", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        evidence_import: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
          attempted_import_count: 0,
          accepted_evidence_total: 0,
        },
      });
      expect(r.evidence_state).toBe("no_evidence");
    });

    it("attempted=2, accepted_evidence_total=0 → imports_attempted", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        evidence_import: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
          attempted_import_count: 2,
          accepted_evidence_total: 0,
        },
      });
      expect(r.evidence_state).toBe("imports_attempted");
    });

    it("accepted_evidence_total=4 → evidence_available", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        evidence_import: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
          attempted_import_count: 1,
          accepted_evidence_total: 4,
        },
      });
      expect(r.evidence_state).toBe("evidence_available");
    });
  });

  // ============================================================================
  // INTAKE STATE TRANSITIONS
  // ============================================================================

  describe("intake_state transitions", () => {
    it("all defaults → no_parses", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        intake: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
          parse_status: "idle",
          parsed_device_count: 0,
        },
      });
      expect(r.intake_state).toBe("no_parses");
    });

    it("parse_status=parsing → parsing_active", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        intake: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
          parse_status: "parsing",
          parsed_device_count: 0,
        },
      });
      expect(r.intake_state).toBe("parsing_active");
    });

    it("parsed_device_count=3 → devices_parsed", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        intake: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
          parse_status: "parsed",
          parsed_device_count: 3,
        },
      });
      expect(r.intake_state).toBe("devices_parsed");
    });

    it("parse_status=failed → intake_failed with blocker code emitted", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        intake: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
          parse_status: "failed",
          parsed_device_count: 0,
        },
      });
      expect(r.intake_state).toBe("intake_failed");
      expect(r.blocker_reason_codes).toContain("intake_failed");
    });
  });

  // ============================================================================
  // OVERALL STATE RULES
  // ============================================================================

  describe("overall_state rules", () => {
    it("empty: all zero summary → overall_state=empty", () => {
      const r = buildAssessmentReadiness(EMPTY_WORKBENCH_CONTEXT_SUMMARY);
      expect(r.overall_state).toBe("empty");
    });

    it("partial: only seeds_only signal → overall_state=partial", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.discovery,
          seed_count: 2,
        },
      });
      expect(r.overall_state).toBe("partial");
    });

    it("ready: topology+evidence present → overall_state=ready, assess_state=context_ready", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 3,
          edge_count: 2,
        },
        evidence_import: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
          attempted_import_count: 1,
          accepted_evidence_total: 2,
        },
      });
      expect(r.overall_state).toBe("ready");
      expect(r.assess_state).toBe("context_ready");
    });

    it("ready by category count: 3+ categories with signal → overall_state=ready", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.discovery,
          seed_count: 2,
        },
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 3,
        },
        intake: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
          parsed_device_count: 1,
        },
      });
      expect(r.overall_state).toBe("ready");
    });

    it("blocked: intake_failed with no other signals → overall_state=empty (no_signals + intake_failed blockers)", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        intake: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
          parse_status: "failed",
        },
      });
      // intake_failed contributes no available_inputs (only devices_parsed does).
      // With no available_inputs and blockers including "no_signals",
      // overall_state is "empty". Both "no_signals" and "intake_failed" are blockers.
      expect(r.overall_state).toBe("empty");
      expect(r.blocker_reason_codes).toContain("intake_failed");
      expect(r.blocker_reason_codes).toContain("no_signals");
    });

    it("evidence_rejected_majority: rejected > accepted with attempts > 0 → blocker code present", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        evidence_import: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
          attempted_import_count: 3,
          accepted_evidence_total: 1,
          rejected_evidence_total: 5,
        },
      });
      expect(r.blocker_reason_codes).toContain("evidence_rejected_majority");
    });
  });

  // ============================================================================
  // NEXT ACTIONS ORDERING
  // ============================================================================

  describe("next_actions ordering", () => {
    it("empty → first next_action is stage_seeds", () => {
      const r = buildAssessmentReadiness(EMPTY_WORKBENCH_CONTEXT_SUMMARY);
      expect(r.next_actions[0]).toBe("stage_seeds");
    });

    it("seeds_only → first next_action is build_crawl_preview", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.discovery,
          seed_count: 2,
        },
      });
      expect(r.next_actions[0]).toBe("build_crawl_preview");
    });

    it("no_evidence AND no_topology → contains import_evidence", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.discovery,
          seed_count: 1,
        },
      });
      expect(r.next_actions).toContain("import_evidence");
    });

    it("ready → contains ready_for_assess_preflight, capped at <=3", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 3,
          edge_count: 2,
        },
        evidence_import: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
          accepted_evidence_total: 2,
        },
      });
      expect(r.next_actions).toContain("ready_for_assess_preflight");
      expect(r.next_actions.length).toBeLessThanOrEqual(3);
    });
  });

  // ============================================================================
  // AVAILABLE / MISSING INPUTS
  // ============================================================================

  describe("available_inputs & missing_inputs", () => {
    it("EMPTY summary → available_inputs is empty, missing_inputs contains all 4 categories", () => {
      const r = buildAssessmentReadiness(EMPTY_WORKBENCH_CONTEXT_SUMMARY);
      expect(r.available_inputs.length).toBe(0);
      expect(r.missing_inputs).toEqual([
        "discovery_seeds",
        "topology",
        "evidence",
        "intake",
      ]);
    });

    it("seeds present → available_inputs includes discovery_seeds", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.discovery,
          seed_count: 2,
        },
      });
      expect(r.available_inputs).toContain("discovery_seeds");
    });

    it("preview_built → available_inputs includes both discovery_seeds and crawl_preview", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.discovery,
          seed_count: 2,
        },
        crawl_preview: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.crawl_preview,
          frontier_count: 3,
        },
      });
      expect(r.available_inputs).toContain("discovery_seeds");
      expect(r.available_inputs).toContain("crawl_preview");
    });

    it("topology present → available_inputs includes topology", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 3,
          edge_count: 2,
        },
      });
      expect(r.available_inputs).toContain("topology");
    });

    it("evidence_available → available_inputs includes evidence", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        evidence_import: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
          accepted_evidence_total: 4,
        },
      });
      expect(r.available_inputs).toContain("evidence");
    });

    it("devices_parsed → available_inputs includes intake", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        intake: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
          parsed_device_count: 3,
        },
      });
      expect(r.available_inputs).toContain("intake");
    });

    it("full readiness → no missing_inputs for populated categories", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.discovery,
          seed_count: 2,
        },
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 3,
          edge_count: 2,
        },
        evidence_import: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
          accepted_evidence_total: 2,
        },
        intake: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
          parsed_device_count: 2,
        },
      });
      expect(r.missing_inputs.length).toBe(0);
      expect(r.available_inputs.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // DETERMINISM
  // ============================================================================

  describe("determinism", () => {
    it("same input → identical output (deep equality)", () => {
      const input = {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.discovery,
          seed_count: 5,
        },
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 10,
          edge_count: 8,
        },
        evidence_import: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
          attempted_import_count: 3,
          accepted_evidence_total: 6,
          rejected_evidence_total: 2,
        },
      };

      const r1 = buildAssessmentReadiness(input);
      const r2 = buildAssessmentReadiness(input);

      expect(r1).toEqual(r2);
      expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
    });
  });

  // ============================================================================
  // REDACTION SAFETY
  // ============================================================================

  describe("redaction safety", () => {
    it("REDACTION: no secrets leak into readiness output", () => {
      const secretInput = {
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          environment_id: "env-secret",
          node_count: 5,
          edge_count: 3,
        },
        intake: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
          current_platform_id: "platform-secret",
          parsed_device_count: 2,
        },
        evidence_import: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
          last_source_label: "env-secret",
          last_reason_code: "custom-secret-code",
          accepted_evidence_total: 1,
        },
      };

      const r = buildAssessmentReadiness(secretInput);
      const output = JSON.stringify(r);

      // Assert that NONE of the secrets appear in the serialized output
      expect(output).not.toContain("env-secret");
      expect(output).not.toContain("platform-secret");
      expect(output).not.toContain("custom-secret-code");

      // Verify that only counts, states, and short tokens are present
      expect(r.topology_state).toBe("nodes_and_edges");
      expect(r.intake_state).toBe("devices_parsed");
      expect(r.evidence_state).toBe("evidence_available");
      expect(r.overall_state).toBe("ready");
    });
  });

  // ============================================================================
  // EDGE CASES & COMBINATIONS
  // ============================================================================

  describe("edge cases & combinations", () => {
    it("topology without evidence → no_topology_after_evidence blocker NOT emitted", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 5,
          edge_count: 3,
        },
      });
      expect(r.blocker_reason_codes).not.toContain("no_topology_after_evidence");
    });

    it("evidence without topology → no_topology_after_evidence blocker emitted", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        evidence_import: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.evidence_import,
          accepted_evidence_total: 3,
        },
      });
      expect(r.blocker_reason_codes).toContain("no_topology_after_evidence");
    });

    it("parsing_active does NOT contribute to ready overall_state", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        intake: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.intake,
          parse_status: "parsing",
        },
      });
      // parsing_active is transient; only devices_parsed counts as available_inputs
      expect(r.available_inputs).not.toContain("intake");
      expect(r.overall_state).toBe("empty");
    });

    it("nodes_only without edges contributes to available but not ready threshold", () => {
      const r = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        topology: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.topology,
          node_count: 5,
          edge_count: 0,
        },
      });
      expect(r.topology_state).toBe("nodes_only");
      expect(r.available_inputs).toContain("topology");
      expect(r.overall_state).toBe("partial");
    });

    it("no_signals blocker emitted only when available_inputs is empty", () => {
      const r1 = buildAssessmentReadiness(EMPTY_WORKBENCH_CONTEXT_SUMMARY);
      expect(r1.blocker_reason_codes).toContain("no_signals");

      const r2 = buildAssessmentReadiness({
        ...EMPTY_WORKBENCH_CONTEXT_SUMMARY,
        discovery: {
          ...EMPTY_WORKBENCH_CONTEXT_SUMMARY.discovery,
          seed_count: 1,
        },
      });
      expect(r2.blocker_reason_codes).not.toContain("no_signals");
    });
  });
});
