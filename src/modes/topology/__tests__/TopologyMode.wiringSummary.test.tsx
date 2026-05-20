/**
 * V1BT — Integration test: TopologyMode receives real-shaped App callbacks,
 * accepted JSON import emits sanitized event, App-side summary handler folds
 * it into EvidenceImportSummary, and Operate consumes the resulting count.
 *
 * Uses a small App-shaped harness (no Tauri invoke) so we exercise the full
 * wire path that App will use in product.
 */

import { describe, expect, it, vi } from "vitest";
import { useCallback, useState, type JSX } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { TopologyMode } from "../TopologyMode";
import { OperateOverviewPanel } from "../../operate/OperateOverviewPanel";
import {
  EMPTY_EVIDENCE_IMPORT_SUMMARY,
  applyEvidenceImportEvent,
  type EvidenceImportEvent,
  type EvidenceImportSummary,
} from "../evidenceImportSummary";
import type { TopologySourceView } from "../../../data/topologySource";
import type {
  NeighborEvidenceMappingStats,
  ProjectionStats,
  RawNeighborEvidenceImportResult,
  TopologyAdjacencyReadiness,
  TopologyEvidenceMutationResult,
  TopologyView,
} from "../../../types/topology";

const PROJECTION_STATS: ProjectionStats = {
  facts_total: 0,
  facts_accepted: 0,
  facts_rejected_unknown_node: 0,
  facts_rejected_self_link: 0,
  facts_collapsed_duplicate: 0,
  per_kind_counts: [],
};

const EVIDENCE_STATS: NeighborEvidenceMappingStats = {
  evidence_total: 0,
  accepted: 0,
  rejected_unknown_local: 0,
  rejected_unknown_remote: 0,
  rejected_self_link: 0,
};

const READINESS: TopologyAdjacencyReadiness = {
  eligible_node_count: 0,
  fact_source_state: "none_available",
  fact_sources: [
    { kind: "lldp", present: false, count: 0, note: "" },
    { kind: "cdp", present: false, count: 0, note: "" },
    { kind: "config_neighbor", present: false, count: 0, note: "" },
    { kind: "manual", present: false, count: 0, note: "" },
  ],
  accepted_kinds: ["lldp", "cdp", "config_neighbor", "manual"],
  reason: "no adjacency fact sources connected",
};

function makeView(): TopologySourceView {
  const view: TopologyView = {
    environment_id: "env-core-eu1",
    source_state: "empty",
    nodes: [],
    edges: [],
    summary: {
      environment_id: "env-core-eu1",
      node_count: 0,
      edge_count: 0,
      source_record_count: 0,
    },
    message: "topology empty",
    adjacency_readiness: READINESS,
    projection_stats: PROJECTION_STATS,
    evidence_stats: EVIDENCE_STATS,
  };
  return {
    sourceState: "empty",
    environmentId: "env-core-eu1",
    nodeCount: 0,
    edgeCount: 0,
    sourceRecordCount: 0,
    message: "topology empty",
    isEmpty: true,
    projectionStats: null,
    evidenceStats: null,
    view,
  };
}

/**
 * Tiny App-shaped harness mirroring App.tsx wiring decisions in V1BT.
 * It owns EvidenceImportSummary and forwards real-shaped callbacks into
 * TopologyMode, then renders OperateOverviewPanel with the derived count
 * so we can assert end-to-end.
 */
function AppHarness({
  mockImportEvidence,
}: {
  mockImportEvidence: (
    envId: string,
    evidence: readonly never[],
    mode: "replace" | "append" | "merge" | null,
  ) => Promise<TopologyEvidenceMutationResult>;
}): JSX.Element {
  const [summary, setSummary] = useState<EvidenceImportSummary>(
    EMPTY_EVIDENCE_IMPORT_SUMMARY,
  );

  const handleEvent = useCallback((event: EvidenceImportEvent) => {
    setSummary((prior) => applyEvidenceImportEvent(prior, event));
  }, []);

  return (
    <>
      <TopologyMode
        topology={makeView()}
        onImportEvidence={mockImportEvidence as never}
        onEvidenceImportEvent={handleEvent}
      />
      <OperateOverviewPanel
        inputs={{
          staged_seed_count: 0,
          crawl_frontier_count: 0,
          evidence_import_count: summary.accepted_evidence_total,
          topology_node_count: 0,
          topology_edge_count: 0,
        }}
      />
    </>
  );
}

describe("V1BT — Topology evidence import wiring + Operate count flow", () => {
  it("accepted JSON import flows through to Operate evidence_import_count", async () => {
    const mockImport = vi.fn().mockResolvedValue({
      mode: "append",
      previous_count: 0,
      incoming_count: 4,
      added_count: 4,
      replaced_count: 0,
      ignored_duplicate_count: 0,
      final_count: 4,
      evidence_set_id: "evset-1",
      source_labels: [],
      store_mutated: true,
    } satisfies TopologyEvidenceMutationResult);

    render(<AppHarness mockImportEvidence={mockImport} />);

    // Initial Operate count is 0
    expect(
      screen.getByTestId("operate-metric-evidence_imports").textContent,
    ).toContain("0");

    fireEvent.click(screen.getByTestId("tm-import-mode-append"));
    fireEvent.change(screen.getByTestId("tm-evidence-import-textarea"), {
      target: {
        value: JSON.stringify([
          { source_kind: "lldp", local_node_id: "r1", remote_node_id: "r2" },
        ]),
      },
    });
    fireEvent.click(screen.getByTestId("tm-evidence-import-button"));

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockImport).toHaveBeenCalledOnce();

    // Operate metric now reflects accepted_evidence_total = 4
    const metric = screen.getByTestId("operate-metric-evidence_imports");
    expect(metric.textContent).toContain("4");
  });

  it("raw import callback also flows through to Operate count", async () => {
    const mockRaw = vi.fn().mockResolvedValue({
      parsed_entries_total: 2,
      accepted_evidence_count: 2,
      rejected_count: 0,
      unresolved_count: 0,
      stored_evidence_count: 2,
      evidence_set_id: "evset-2",
      accepted_evidence: [],
      rejected_entries: [],
    } satisfies RawNeighborEvidenceImportResult);

    function RawHarness(): JSX.Element {
      const [summary, setSummary] = useState<EvidenceImportSummary>(
        EMPTY_EVIDENCE_IMPORT_SUMMARY,
      );
      const handleEvent = useCallback((event: EvidenceImportEvent) => {
        setSummary((prior) => applyEvidenceImportEvent(prior, event));
      }, []);
      return (
        <>
          <TopologyMode
            topology={makeView()}
            onImportRawNeighborOutput={mockRaw}
            onEvidenceImportEvent={handleEvent}
          />
          <OperateOverviewPanel
            inputs={{
              staged_seed_count: 0,
              crawl_frontier_count: 0,
              evidence_import_count: summary.accepted_evidence_total,
              topology_node_count: 0,
              topology_edge_count: 0,
            }}
          />
        </>
      );
    }

    render(<RawHarness />);

    fireEvent.click(screen.getByTestId("tm-evidence-tab-raw"));
    fireEvent.change(screen.getByTestId("tm-raw-local-node"), {
      target: { value: "r1" },
    });
    fireEvent.change(screen.getByTestId("tm-raw-output-textarea"), {
      target: { value: "show lldp neighbors\nfoo\n" },
    });
    fireEvent.click(screen.getByTestId("tm-raw-import-button"));

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRaw).toHaveBeenCalledOnce();
    expect(
      screen.getByTestId("operate-metric-evidence_imports").textContent,
    ).toContain("2");
  });
});
