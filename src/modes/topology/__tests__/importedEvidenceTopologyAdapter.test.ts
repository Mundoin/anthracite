/**
 * V1CB — Imported Evidence Topology Adapter tests.
 */

import { describe, it, expect } from "vitest";
import {
  attachImportedSourceToTopologyView,
  looksLikeImportedTopology,
} from "../importedEvidenceTopologyAdapter";
import { createFabricatedTopologySourceInfo } from "../topologySource";
import type {
  GraphReadyTopologyEdge,
  GraphReadyTopologyNode,
  GraphReadyTopologyView,
} from "../topologyReview";

function node(id: string, label?: string): GraphReadyTopologyNode {
  return {
    id,
    label: label ?? id,
    vendor: "cisco",
    platform_id: "iosxe",
    role_hint: "switch",
    layer: "physical",
  };
}

function edge(
  id: string,
  a: string,
  b: string,
  evidence_count = 1,
): GraphReadyTopologyEdge {
  return {
    id,
    source_node_id: a,
    target_node_id: b,
    kind: "lldp",
    local_interface: null,
    remote_interface: null,
    evidence_count,
  };
}

function view(
  nodes: GraphReadyTopologyNode[],
  edges: GraphReadyTopologyEdge[],
  env = "env-import-1",
): GraphReadyTopologyView {
  return {
    environment_id: env,
    nodes,
    edges,
    renderer_attached: false,
    note: "imported",
  };
}

describe("attachImportedSourceToTopologyView", () => {
  it("stamps source.kind = 'imported' on the view", () => {
    const v = view([node("n1")], []);
    const out = attachImportedSourceToTopologyView({ view: v });
    expect(out.source?.kind).toBe("imported");
  });

  it("derives freshness 'unknown' when observed_at is absent", () => {
    const v = view([node("n1")], []);
    const out = attachImportedSourceToTopologyView({ view: v });
    expect(out.source?.freshness).toBe("unknown");
  });

  it("derives freshness 'fresh' when observed_at is provided", () => {
    const v = view([node("n1")], []);
    const out = attachImportedSourceToTopologyView({
      view: v,
      observed_at: "2026-05-25T10:00:00Z",
    });
    expect(out.source?.freshness).toBe("fresh");
    expect(out.source?.observed_at).toBe("2026-05-25T10:00:00Z");
  });

  it("respects explicit freshness override", () => {
    const v = view([node("n1")], []);
    const out = attachImportedSourceToTopologyView({
      view: v,
      observed_at: "2026-05-25T10:00:00Z",
      freshness: "stale",
    });
    expect(out.source?.freshness).toBe("stale");
  });

  it("preserves nodes/edges identity (no synthesis)", () => {
    const n = [node("n1"), node("n2")];
    const e = [edge("e1", "n1", "n2", 3)];
    const v = view(n, e);
    const out = attachImportedSourceToTopologyView({ view: v });
    expect(out.nodes).toEqual(v.nodes);
    expect(out.edges).toEqual(v.edges);
    expect(out.environment_id).toBe(v.environment_id);
  });

  it("does not mutate the input view", () => {
    const v = view([node("n1")], []);
    const snapshot = JSON.stringify(v);
    attachImportedSourceToTopologyView({ view: v });
    expect(JSON.stringify(v)).toBe(snapshot);
  });

  it("falls back to a derived label when no label is given", () => {
    const v = view([node("n1")], [], "env-X");
    const out = attachImportedSourceToTopologyView({ view: v });
    expect(out.source?.label).toBe("Imported · env-X");
  });

  it("uses the caller's label verbatim when provided", () => {
    const v = view([node("n1")], []);
    const out = attachImportedSourceToTopologyView({
      view: v,
      label: "Capture #4 (Site A LLDP)",
    });
    expect(out.source?.label).toBe("Capture #4 (Site A LLDP)");
  });

  it("carries evidence tags and producer through to source info", () => {
    const v = view([node("n1")], []);
    const out = attachImportedSourceToTopologyView({
      view: v,
      evidence: ["pcap", "lldp-import"],
      producer: "import-pipeline/0.2",
    });
    expect(out.source?.evidence).toEqual(["pcap", "lldp-import"]);
    expect(out.source?.producer).toBe("import-pipeline/0.2");
  });

  it("replaces any pre-existing source.kind on the view", () => {
    // A fabricated view that somehow reaches the importer (rare but
    // legal under V1BY) — the importer's intent wins.
    const fab = createFabricatedTopologySourceInfo({
      environment_id: "env-fab",
      environment_name: "lab",
    });
    const v: GraphReadyTopologyView = {
      ...view([node("n1")], []),
      source: fab,
    };
    const out = attachImportedSourceToTopologyView({ view: v });
    expect(out.source?.kind).toBe("imported");
  });
});

describe("looksLikeImportedTopology", () => {
  it("returns true when source.kind is imported", () => {
    const v = view([node("n1")], []);
    const stamped = attachImportedSourceToTopologyView({ view: v });
    expect(looksLikeImportedTopology(stamped)).toBe(true);
  });

  it("returns true when any edge carries evidence_count > 0", () => {
    const v = view([node("n1"), node("n2")], [edge("e1", "n1", "n2", 2)]);
    expect(looksLikeImportedTopology(v)).toBe(true);
  });

  it("returns false for a Fabricator-style view (no evidence, no source)", () => {
    const v = view([node("n1"), node("n2")], [edge("e1", "n1", "n2", 0)]);
    expect(looksLikeImportedTopology(v)).toBe(false);
  });

  it("returns false for an empty view with no source", () => {
    const v = view([], []);
    expect(looksLikeImportedTopology(v)).toBe(false);
  });
});
