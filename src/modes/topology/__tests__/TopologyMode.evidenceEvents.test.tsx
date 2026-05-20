/**
 * V1BS — TopologyMode evidence-import event emission tests.
 *
 * Asserts that EvidenceImportPanel emits sanitized events through the new
 * onEvidenceImportEvent callback when import callbacks resolve or reject.
 */

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TopologyMode } from "../TopologyMode";
import type { TopologySourceView } from "../../../data/topologySource";
import type {
  NeighborEvidenceMappingStats,
  ProjectionStats,
  RawNeighborEvidenceImportResult,
  TopologyAdjacencyReadiness,
  TopologyEvidenceMutationResult,
  TopologyView,
} from "../../../types/topology";
import type { EvidenceImportEvent } from "../evidenceImportSummary";

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

describe("TopologyMode — V1BS evidence-import event emission", () => {
  it("emits accepted event when JSON import resolves with added_count > 0", async () => {
    const mockImport = vi.fn().mockResolvedValue({
      mode: "append",
      previous_count: 0,
      incoming_count: 2,
      added_count: 2,
      replaced_count: 0,
      ignored_duplicate_count: 0,
      final_count: 2,
      evidence_set_id: "evset-x",
      source_labels: [],
      store_mutated: true,
    } satisfies TopologyEvidenceMutationResult);

    const onEvent = vi.fn();

    render(
      <TopologyMode
        topology={makeView()}
        onImportEvidence={mockImport}
        onEvidenceImportEvent={onEvent}
      />,
    );

    fireEvent.click(screen.getByTestId("tm-import-mode-append"));

    const textarea = screen.getByTestId("tm-evidence-import-textarea");
    const importBtn = screen.getByTestId("tm-evidence-import-button");

    fireEvent.change(textarea, {
      target: {
        value: JSON.stringify([
          {
            source_kind: "lldp",
            local_node_id: "r1",
            remote_node_id: "r2",
          },
        ]),
      },
    });
    fireEvent.click(importBtn);

    await Promise.resolve();
    await Promise.resolve();

    expect(onEvent).toHaveBeenCalledOnce();
    const event = onEvent.mock.calls[0][0] as EvidenceImportEvent;
    expect(event.kind).toBe("json_append");
    expect(event.status).toBe("accepted");
    expect(event.accepted_count).toBe(2);
    expect(event.source_label).toBe("env-core-eu1");

    // Redaction: serialized event must not leak evidence_set_id
    expect(JSON.stringify(event)).not.toContain("evset-x");
  });

  it("emits rejected event on parse_error when JSON is invalid", async () => {
    const mockImport = vi.fn();
    const onEvent = vi.fn();

    render(
      <TopologyMode
        topology={makeView()}
        onImportEvidence={mockImport}
        onEvidenceImportEvent={onEvent}
      />,
    );

    const textarea = screen.getByTestId("tm-evidence-import-textarea");
    const importBtn = screen.getByTestId("tm-evidence-import-button");

    fireEvent.change(textarea, { target: { value: "{not valid json" } });
    fireEvent.click(importBtn);

    await Promise.resolve();
    await Promise.resolve();

    // Underlying import API should NOT have been called
    expect(mockImport).not.toHaveBeenCalled();

    expect(onEvent).toHaveBeenCalledOnce();
    const event = onEvent.mock.calls[0][0] as EvidenceImportEvent;
    expect(event.status).toBe("rejected");
    expect(event.reason_code).toBe("parse_error");
    expect(event.accepted_count).toBe(0);
  });

  it("emits rejected event when raw import callback throws", async () => {
    const mockRaw = vi.fn().mockRejectedValue(new Error("boom"));
    const onEvent = vi.fn();

    render(
      <TopologyMode
        topology={makeView()}
        onImportRawNeighborOutput={mockRaw}
        onEvidenceImportEvent={onEvent}
      />,
    );

    fireEvent.click(screen.getByTestId("tm-evidence-tab-raw"));

    fireEvent.change(screen.getByTestId("tm-raw-local-node"), {
      target: { value: "r1" },
    });
    fireEvent.change(screen.getByTestId("tm-raw-output-textarea"), {
      target: { value: "show lldp neighbors\nfoo bar\n" },
    });

    fireEvent.click(screen.getByTestId("tm-raw-import-button"));

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(onEvent).toHaveBeenCalledOnce();
    const event = onEvent.mock.calls[0][0] as EvidenceImportEvent;
    expect(event.kind).toBe("raw_lldp");
    expect(event.status).toBe("rejected");
    expect(event.reason_code).toBe("import_failed");

    // Redaction: err.message ("boom") must not flow into the event
    expect(JSON.stringify(event)).not.toContain("boom");
  });

  it("emits accepted event for raw import with counts only", async () => {
    const mockRaw = vi.fn().mockResolvedValue({
      parsed_entries_total: 3,
      accepted_evidence_count: 3,
      rejected_count: 0,
      unresolved_count: 0,
      stored_evidence_count: 3,
      evidence_set_id: "evset-secret",
      accepted_evidence: [],
      rejected_entries: [],
    } satisfies RawNeighborEvidenceImportResult);

    const onEvent = vi.fn();

    render(
      <TopologyMode
        topology={makeView()}
        onImportRawNeighborOutput={mockRaw}
        onEvidenceImportEvent={onEvent}
      />,
    );

    fireEvent.click(screen.getByTestId("tm-evidence-tab-raw"));

    fireEvent.change(screen.getByTestId("tm-raw-local-node"), {
      target: { value: "r1" },
    });
    fireEvent.change(screen.getByTestId("tm-raw-output-textarea"), {
      target: { value: "show lldp neighbors\nfoo bar\n" },
    });
    fireEvent.click(screen.getByTestId("tm-raw-import-button"));

    await Promise.resolve();
    await Promise.resolve();

    expect(onEvent).toHaveBeenCalledOnce();
    const event = onEvent.mock.calls[0][0] as EvidenceImportEvent;
    expect(event.kind).toBe("raw_lldp");
    expect(event.status).toBe("accepted");
    expect(event.accepted_count).toBe(3);

    // Redaction: evidence_set_id must not leak
    expect(JSON.stringify(event)).not.toContain("evset-secret");
  });
});
