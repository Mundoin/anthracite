/**
 * V1CC — Opus sanity check for TopologyConstructModel contract.
 */

import { describe, expect, it } from "vitest";
import {
  CONSTRUCT_HONESTY_LIMITATIONS,
  EMPTY_TOPOLOGY_CONSTRUCT,
  buildTopologyConstruct,
} from "../topologyConstructModel";
import { toTopologySourceView } from "../../../data/topologySource";
import { EMPTY_WORKBENCH_CONTEXT_SUMMARY } from "../../../state/workbenchContextSummary";
import { EMPTY_ASSESSMENT_READINESS } from "../../../state/assessmentReadiness";
import { EMPTY_DIAGNOSE_TRIAGE } from "../../diagnose/diagnoseTriage";

const FIXED_NOW = "2026-05-21T00:00:00.000Z";

describe("TopologyConstructModel — sanity", () => {
  it("EMPTY constant carries honesty limitations", () => {
    expect(EMPTY_TOPOLOGY_CONSTRUCT.limitations).toEqual(
      CONSTRUCT_HONESTY_LIMITATIONS,
    );
    expect(EMPTY_TOPOLOGY_CONSTRUCT.layers.length).toBeGreaterThan(0);
  });

  it("empty topology produces empty construct with limitations", () => {
    const c = buildTopologyConstruct({
      topology: toTopologySourceView(null),
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(c.node_count).toBe(0);
    expect(c.link_count).toBe(0);
    expect(c.nodes).toEqual([]);
    expect(c.links).toEqual([]);
    expect(c.layout_hints.density).toBe("empty");
    expect(c.layout_hints.supports_3d).toBe(false);
    expect(c.limitations).toEqual(CONSTRUCT_HONESTY_LIMITATIONS);
    expect(c.created_at).toBe(FIXED_NOW);
  });

  it("layers are present even on empty topology", () => {
    const c = buildTopologyConstruct({
      topology: toTopologySourceView(null),
      summary: EMPTY_WORKBENCH_CONTEXT_SUMMARY,
      triage: EMPTY_DIAGNOSE_TRIAGE,
      readiness: EMPTY_ASSESSMENT_READINESS,
      now: () => FIXED_NOW,
    });
    expect(c.layer_count).toBeGreaterThanOrEqual(5);
    const kinds = new Set(c.layers.map((l) => l.kind));
    expect(kinds.has("physical")).toBe(true);
    expect(kinds.has("logical")).toBe(true);
    expect(kinds.has("evidence")).toBe(true);
    expect(kinds.has("risk")).toBe(true);
  });
});
