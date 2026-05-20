/**
 * V1BL — Operate Overview model tests.
 *
 * Covers readiness priority chain, metrics/lanes consistency,
 * and Markdown receipt determinism + secret-material absence.
 */

import { describe, it, expect } from "vitest";
import {
  buildOperateOverview,
  toOperateOverviewMarkdown,
  type OperateOverviewInputs,
} from "../operateOverview";

const T = "2026-05-20T00:00:00.000Z";

function inputs(over: Partial<OperateOverviewInputs> = {}): OperateOverviewInputs {
  return {
    staged_seed_count: 0,
    crawl_frontier_count: 0,
    evidence_import_count: 0,
    topology_node_count: 0,
    topology_edge_count: 0,
    ...over,
  };
}

describe("operateOverview — readiness priority", () => {
  it("all zeros → no_sources + stage_discovery_seeds", () => {
    const summary = buildOperateOverview(inputs(), T);
    expect(summary.readiness).toBe("no_sources");
    expect(summary.next_action).toBe("stage_discovery_seeds");
  });

  it("staged_seed_count > 0, crawl_frontier_count === 0 → seeds_staged + build_crawl_preview", () => {
    const summary = buildOperateOverview(inputs({ staged_seed_count: 3 }), T);
    expect(summary.readiness).toBe("seeds_staged");
    expect(summary.next_action).toBe("build_crawl_preview");
  });

  it("crawl_frontier_count > 0, evidence/topology zero → crawl_preview_ready + import_evidence", () => {
    const summary = buildOperateOverview(
      inputs({ staged_seed_count: 1, crawl_frontier_count: 5 }),
      T,
    );
    expect(summary.readiness).toBe("crawl_preview_ready");
    expect(summary.next_action).toBe("import_evidence");
  });

  it("evidence_import_count > 0, topology_node_count === 0 → evidence_available + review_topology", () => {
    const summary = buildOperateOverview(
      inputs({
        staged_seed_count: 1,
        crawl_frontier_count: 5,
        evidence_import_count: 2,
      }),
      T,
    );
    expect(summary.readiness).toBe("evidence_available");
    expect(summary.next_action).toBe("review_topology");
  });

  it("topology_node_count > 0 → live_pipeline_deferred + connect_live_polling_future", () => {
    const summary = buildOperateOverview(
      inputs({
        staged_seed_count: 1,
        crawl_frontier_count: 5,
        evidence_import_count: 2,
        topology_node_count: 10,
        topology_edge_count: 8,
      }),
      T,
    );
    expect(summary.readiness).toBe("live_pipeline_deferred");
    expect(summary.next_action).toBe("connect_live_polling_future");
  });
});

describe("operateOverview — metrics", () => {
  it("always exactly 6 metrics", () => {
    const summary = buildOperateOverview(inputs(), T);
    expect(summary.metrics).toHaveLength(6);
    const ids = summary.metrics.map((m) => m.id);
    expect(ids).toEqual([
      "staged_seeds",
      "preview_frontier",
      "evidence_imports",
      "topology_nodes",
      "intake_parsed",
      "active_incidents",
    ]);
  });

  it("staged_seeds metric matches input", () => {
    const summary = buildOperateOverview(inputs({ staged_seed_count: 3 }), T);
    const metric = summary.metrics.find((m) => m.id === "staged_seeds");
    expect(metric?.value).toBe("3");
    expect(metric?.sub).toBe("staged");
  });

  it("staged_seeds = 0 shows 'no seeds'", () => {
    const summary = buildOperateOverview(inputs({ staged_seed_count: 0 }), T);
    const metric = summary.metrics.find((m) => m.id === "staged_seeds");
    expect(metric?.value).toBe("0");
    expect(metric?.sub).toBe("no seeds");
  });

  it("topology_nodes = 0 shows '—' with 'unavailable'", () => {
    const summary = buildOperateOverview(inputs({ topology_node_count: 0 }), T);
    const metric = summary.metrics.find((m) => m.id === "topology_nodes");
    expect(metric?.value).toBe("—");
    expect(metric?.sub).toBe("unavailable");
  });

  it("topology_nodes > 0 shows count", () => {
    const summary = buildOperateOverview(inputs({ topology_node_count: 10 }), T);
    const metric = summary.metrics.find((m) => m.id === "topology_nodes");
    expect(metric?.value).toBe("10");
    expect(metric?.sub).toBe("nodes");
  });

  it("active_incidents always '—' / 'deferred'", () => {
    const summary = buildOperateOverview(
      inputs({
        staged_seed_count: 5,
        crawl_frontier_count: 10,
        evidence_import_count: 3,
        topology_node_count: 20,
      }),
      T,
    );
    const metric = summary.metrics.find((m) => m.id === "active_incidents");
    expect(metric?.value).toBe("—");
    expect(metric?.sub).toBe("deferred");
  });
});

describe("operateOverview — lanes", () => {
  it("always exactly 6 lanes in fixed order", () => {
    const summary = buildOperateOverview(inputs(), T);
    expect(summary.lanes).toHaveLength(6);
    const ids = summary.lanes.map((l) => l.id);
    expect(ids).toEqual([
      "live_overview",
      "topology_operations",
      "polling_snmp",
      "baselines_drift",
      "sentinel",
      "events",
    ]);
  });

  it("live_overview preview when no_sources, available when seeds_staged+", () => {
    const no_sources = buildOperateOverview(inputs(), T);
    const live_no = no_sources.lanes.find((l) => l.id === "live_overview");
    expect(live_no?.status).toBe("preview");

    const seeds = buildOperateOverview(inputs({ staged_seed_count: 1 }), T);
    const live_yes = seeds.lanes.find((l) => l.id === "live_overview");
    expect(live_yes?.status).toBe("available");
  });

  it("topology_operations preview when topology_node_count > 0, else deferred", () => {
    const no_topo = buildOperateOverview(inputs(), T);
    const topo_no = no_topo.lanes.find((l) => l.id === "topology_operations");
    expect(topo_no?.status).toBe("deferred");

    const with_topo = buildOperateOverview(inputs({ topology_node_count: 5 }), T);
    const topo_yes = with_topo.lanes.find((l) => l.id === "topology_operations");
    expect(topo_yes?.status).toBe("preview");
  });

  it("polling_snmp, baselines_drift, sentinel always deferred", () => {
    const summary = buildOperateOverview(
      inputs({
        staged_seed_count: 5,
        crawl_frontier_count: 10,
        evidence_import_count: 3,
        topology_node_count: 20,
        topology_edge_count: 15,
      }),
      T,
    );
    expect(summary.lanes.find((l) => l.id === "polling_snmp")?.status).toBe(
      "deferred",
    );
    expect(summary.lanes.find((l) => l.id === "baselines_drift")?.status).toBe(
      "deferred",
    );
    expect(summary.lanes.find((l) => l.id === "sentinel")?.status).toBe(
      "deferred",
    );
  });

  it("events always preview", () => {
    const summary = buildOperateOverview(inputs(), T);
    expect(summary.lanes.find((l) => l.id === "events")?.status).toBe(
      "preview",
    );
  });
});

describe("operateOverview — Markdown receipt", () => {
  it("is deterministic for same input", () => {
    const md1 = toOperateOverviewMarkdown(
      buildOperateOverview(
        inputs({
          staged_seed_count: 3,
          crawl_frontier_count: 5,
        }),
        T,
      ),
    );
    const md2 = toOperateOverviewMarkdown(
      buildOperateOverview(
        inputs({
          staged_seed_count: 3,
          crawl_frontier_count: 5,
        }),
        T,
      ),
    );
    expect(md1).toBe(md2);
  });

  it("includes title '# Operate Live Overview'", () => {
    const md = toOperateOverviewMarkdown(buildOperateOverview(inputs(), T));
    expect(md).toContain("# Operate Live Overview");
  });

  it("includes honesty footer", () => {
    const md = toOperateOverviewMarkdown(buildOperateOverview(inputs(), T));
    expect(md).toContain(
      "Local readiness summary only — no live polling, no SNMP, no fabricated metrics.",
    );
  });

  it("includes readiness state", () => {
    const md = toOperateOverviewMarkdown(
      buildOperateOverview(inputs({ staged_seed_count: 1 }), T),
    );
    expect(md).toContain("## Readiness: seeds_staged");
  });

  it("includes next action with detail", () => {
    const md = toOperateOverviewMarkdown(buildOperateOverview(inputs(), T));
    expect(md).toContain("stage_discovery_seeds");
    expect(md).toContain(
      "No discovery seeds staged. Go to Discovery mode to declare your first seed",
    );
  });

  it("includes metrics strip", () => {
    const md = toOperateOverviewMarkdown(
      buildOperateOverview(inputs({ staged_seed_count: 3 }), T),
    );
    expect(md).toContain("Staged seeds : 3 staged");
    expect(md).toContain("Active incidents : — deferred");
  });

  it("includes lanes table with all 6 lanes", () => {
    const md = toOperateOverviewMarkdown(buildOperateOverview(inputs(), T));
    expect(md).toContain("Live Overview");
    expect(md).toContain("Topology Operations");
    expect(md).toContain("Polling / SNMP");
    expect(md).toContain("Baselines / Drift");
    expect(md).toContain("Sentinel");
    expect(md).toContain("Events");
  });

  it("does not contain forbidden labels", () => {
    const md = toOperateOverviewMarkdown(buildOperateOverview(inputs(), T));
    expect(md).not.toMatch(/Forge/i);
    expect(md).not.toMatch(/Intelligence/i);
    expect(md).not.toMatch(/\bAI\b/);
    expect(md).not.toMatch(/Library/i);
  });

  it("does not contain secret strings", () => {
    const md = toOperateOverviewMarkdown(buildOperateOverview(inputs(), T));
    expect(md).not.toMatch(/password/i);
    expect(md).not.toMatch(/private_key/i);
    expect(md).not.toMatch(/passphrase/i);
    expect(md).not.toMatch(/secret/i);
  });
});
