/**
 * V1BU — Operate Overview Panel readiness context row tests.
 *
 * Tests for the new cross-workbench readiness context row:
 * - Absent when no readiness prop
 * - Absent when readiness.overall_state === "empty"
 * - Present and correct when overall_state is "partial" or "ready"
 * - Displays all readiness testids
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OperateOverviewPanel } from "../OperateOverviewPanel";
import type { AssessmentReadiness } from "../../../state/assessmentReadiness";

const T = "2026-05-20T00:00:00.000Z";

const mockClock = { now: () => T };

describe("OperateOverviewPanel — readiness context row", () => {
  it("no readiness prop — operate-readiness-context testid absent", () => {
    render(
      <OperateOverviewPanel clock={mockClock} />
    );
    expect(screen.queryByTestId("operate-readiness-context")).not.toBeInTheDocument();
  });

  it("readiness.overall_state === 'empty' — operate-readiness-context testid absent (no double display)", () => {
    const readiness: AssessmentReadiness = {
      overall_state: "empty",
      discovery_state: "no_seeds",
      topology_state: "no_topology",
      evidence_state: "no_evidence",
      intake_state: "no_parses",
      assess_state: "no_context",
      missing_inputs: ["discovery_seeds", "topology", "evidence", "intake"],
      available_inputs: [],
      next_actions: ["stage_seeds"],
      blocker_reason_codes: ["no_signals"],
    };

    render(
      <OperateOverviewPanel readiness={readiness} clock={mockClock} />
    );

    expect(screen.queryByTestId("operate-readiness-context")).not.toBeInTheDocument();
  });

  it("readiness.overall_state === 'partial' — row renders with correct testids", () => {
    const readiness: AssessmentReadiness = {
      overall_state: "partial",
      discovery_state: "seeds_only",
      topology_state: "nodes_only",
      evidence_state: "no_evidence",
      intake_state: "no_parses",
      assess_state: "context_partial",
      missing_inputs: ["evidence", "intake"],
      available_inputs: ["discovery_seeds", "topology"],
      next_actions: ["import_evidence", "parse_configs"],
      blocker_reason_codes: [],
    };

    render(
      <OperateOverviewPanel readiness={readiness} clock={mockClock} />
    );

    const contextRow = screen.getByTestId("operate-readiness-context");
    expect(contextRow).toBeInTheDocument();
    expect(screen.getByTestId("operate-readiness-overall")).toBeInTheDocument();
    expect(screen.getByTestId("operate-readiness-assess-state")).toBeInTheDocument();
    expect(screen.getByTestId("operate-readiness-available-count")).toBeInTheDocument();
    expect(screen.getByTestId("operate-readiness-top-next-action")).toBeInTheDocument();
  });

  it("readiness.overall_state === 'ready' with next_actions — row renders correctly", () => {
    const readiness: AssessmentReadiness = {
      overall_state: "ready",
      discovery_state: "preview_built",
      topology_state: "nodes_and_edges",
      evidence_state: "evidence_available",
      intake_state: "devices_parsed",
      assess_state: "context_ready",
      missing_inputs: [],
      available_inputs: ["discovery_seeds", "crawl_preview", "topology", "evidence", "intake"],
      next_actions: ["ready_for_assess_preflight", "configure_assess_profile"],
      blocker_reason_codes: [],
    };

    render(
      <OperateOverviewPanel readiness={readiness} clock={mockClock} />
    );

    const contextRow = screen.getByTestId("operate-readiness-context");
    expect(contextRow).toBeInTheDocument();
    expect(screen.getByTestId("operate-readiness-overall")).toHaveTextContent("ready");
    expect(screen.getByTestId("operate-readiness-assess-state")).toHaveTextContent("context_ready");
    expect(screen.getByTestId("operate-readiness-available-count")).toHaveTextContent("5");
    expect(screen.getByTestId("operate-readiness-top-next-action")).toHaveTextContent("ready_for_assess_preflight");
  });

  it("readiness with blocker_reason_codes — blockers testid present", () => {
    const readiness: AssessmentReadiness = {
      overall_state: "blocked",
      discovery_state: "no_seeds",
      topology_state: "no_topology",
      evidence_state: "imports_attempted",
      intake_state: "intake_failed",
      assess_state: "blocked",
      missing_inputs: ["discovery_seeds", "topology"],
      available_inputs: [],
      next_actions: ["stage_seeds"],
      blocker_reason_codes: ["intake_failed", "no_topology_after_evidence"],
    };

    render(
      <OperateOverviewPanel readiness={readiness} clock={mockClock} />
    );

    const blockersSpan = screen.getByTestId("operate-readiness-blockers");
    expect(blockersSpan).toBeInTheDocument();
    expect(blockersSpan.textContent).toContain("intake_failed");
    expect(blockersSpan.textContent).toContain("no_topology_after_evidence");
  });
});
