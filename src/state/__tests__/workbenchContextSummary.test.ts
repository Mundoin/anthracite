/**
 * V1BO — WorkbenchContextSummary unit tests.
 */

import { describe, expect, it } from "vitest";
import {
  EMPTY_WORKBENCH_CONTEXT_SUMMARY,
  EMPTY_WORKBENCH_INTAKE_SUMMARY,
  buildWorkbenchContextSummary,
  type WorkbenchIntakeSummary,
} from "../workbenchContextSummary";
import type { DiscoveryPlanningSummary } from "../../modes/discovery/discoveryPlanningSummary";
import type { TopologySourceView } from "../../data/topologySource";
import { toTopologySourceView } from "../../data/topologySource";
import {
  EMPTY_CRAWL_PREVIEW_CONTEXT_SUMMARY,
  type CrawlPreviewContextSummary,
} from "../../modes/discovery/crawlPreviewContextSummary";
import {
  EMPTY_EVIDENCE_IMPORT_SUMMARY,
  type EvidenceImportSummary,
} from "../../modes/topology/evidenceImportSummary";

const EMPTY_PLANNING: DiscoveryPlanningSummary = {
  staged_seed_count: 0,
  total_seed_count: 0,
  history_entry_count: 0,
};

const EMPTY_TOPOLOGY: TopologySourceView = toTopologySourceView(null);

describe("buildWorkbenchContextSummary", () => {
  it("returns zeroed summary when inputs are empty", () => {
    const summary = buildWorkbenchContextSummary({
      discoveryPlanning: EMPTY_PLANNING,
      topology: EMPTY_TOPOLOGY,
    });

    expect(summary.discovery.seed_count).toBe(0);
    expect(summary.discovery.total_seed_count).toBe(0);
    expect(summary.discovery.history_entry_count).toBe(0);
    expect(summary.topology.node_count).toBe(0);
    expect(summary.topology.edge_count).toBe(0);
    expect(summary.topology.has_view).toBe(false);
    expect(summary.intake).toEqual(EMPTY_WORKBENCH_INTAKE_SUMMARY);
  });

  it("maps discovery planning counts through to discovery summary", () => {
    const summary = buildWorkbenchContextSummary({
      discoveryPlanning: {
        staged_seed_count: 3,
        total_seed_count: 5,
        history_entry_count: 7,
      },
      topology: EMPTY_TOPOLOGY,
    });

    expect(summary.discovery.seed_count).toBe(3);
    expect(summary.discovery.total_seed_count).toBe(5);
    expect(summary.discovery.history_entry_count).toBe(7);
  });

  it("maps topology source view through to topology summary", () => {
    const topology: TopologySourceView = {
      sourceState: "real",
      environmentId: "env-1",
      nodeCount: 12,
      edgeCount: 17,
      sourceRecordCount: 24,
      message: "ok",
      isEmpty: false,
      projectionStats: null,
      evidenceStats: null,
      view: {} as unknown as TopologySourceView["view"], // truthy so has_view === true
    };

    const summary = buildWorkbenchContextSummary({
      discoveryPlanning: EMPTY_PLANNING,
      topology,
    });

    expect(summary.topology.node_count).toBe(12);
    expect(summary.topology.edge_count).toBe(17);
    expect(summary.topology.source_record_count).toBe(24);
    expect(summary.topology.environment_id).toBe("env-1");
    expect(summary.topology.source_state).toBe("real");
    expect(summary.topology.has_view).toBe(true);
  });

  it("uses EMPTY_WORKBENCH_INTAKE_SUMMARY when intake is omitted", () => {
    const summary = buildWorkbenchContextSummary({
      discoveryPlanning: EMPTY_PLANNING,
      topology: EMPTY_TOPOLOGY,
    });

    expect(summary.intake).toBe(EMPTY_WORKBENCH_INTAKE_SUMMARY);
  });

  it("V1BQ: uses EMPTY_CRAWL_PREVIEW_CONTEXT_SUMMARY when crawlPreview is omitted", () => {
    const summary = buildWorkbenchContextSummary({
      discoveryPlanning: EMPTY_PLANNING,
      topology: EMPTY_TOPOLOGY,
    });

    expect(summary.crawl_preview).toBe(EMPTY_CRAWL_PREVIEW_CONTEXT_SUMMARY);
  });

  it("V1BR: uses EMPTY_EVIDENCE_IMPORT_SUMMARY when evidenceImport is omitted", () => {
    const summary = buildWorkbenchContextSummary({
      discoveryPlanning: EMPTY_PLANNING,
      topology: EMPTY_TOPOLOGY,
    });

    expect(summary.evidence_import).toBe(EMPTY_EVIDENCE_IMPORT_SUMMARY);
  });

  it("V1BR: passes through provided evidence import summary", () => {
    const evidenceImport: EvidenceImportSummary = {
      attempted_import_count: 4,
      accepted_import_count: 3,
      rejected_import_count: 1,
      accepted_evidence_total: 12,
      rejected_evidence_total: 2,
      last_event_at: "2026-05-20T10:00:00Z",
      last_source_label: "env-1",
      last_reason_code: null,
    };

    const summary = buildWorkbenchContextSummary({
      discoveryPlanning: EMPTY_PLANNING,
      topology: EMPTY_TOPOLOGY,
      evidenceImport,
    });

    expect(summary.evidence_import).toEqual(evidenceImport);
  });

  it("V1BQ: passes through provided crawl preview summary", () => {
    const crawlPreview: CrawlPreviewContextSummary = {
      frontier_count: 5,
      active_seed_count: 5,
      blocked_seed_count: 2,
      warning_count: 1,
      last_preview_id: "p_demo",
      last_preview_generated_at: "2026-05-20T10:00:00Z",
    };

    const summary = buildWorkbenchContextSummary({
      discoveryPlanning: EMPTY_PLANNING,
      topology: EMPTY_TOPOLOGY,
      crawlPreview,
    });

    expect(summary.crawl_preview).toEqual(crawlPreview);
  });

  it("passes through provided intake summary", () => {
    const intake: WorkbenchIntakeSummary = {
      current_platform_id: "iosxe",
      parse_status: "parsed",
      parsed_device_count: 4,
      finding_count: 2,
    };

    const summary = buildWorkbenchContextSummary({
      discoveryPlanning: EMPTY_PLANNING,
      topology: EMPTY_TOPOLOGY,
      intake,
    });

    expect(summary.intake).toEqual(intake);
  });

  it("is deterministic: identical inputs produce identical output", () => {
    const planning: DiscoveryPlanningSummary = {
      staged_seed_count: 2,
      total_seed_count: 4,
      history_entry_count: 1,
    };

    const a = buildWorkbenchContextSummary({
      discoveryPlanning: planning,
      topology: EMPTY_TOPOLOGY,
    });
    const b = buildWorkbenchContextSummary({
      discoveryPlanning: planning,
      topology: EMPTY_TOPOLOGY,
    });

    expect(a).toEqual(b);
  });

  it("EMPTY_WORKBENCH_CONTEXT_SUMMARY round-trips through builder when given empties", () => {
    const summary = buildWorkbenchContextSummary({
      discoveryPlanning: EMPTY_PLANNING,
      topology: EMPTY_TOPOLOGY,
    });

    expect(summary).toEqual(EMPTY_WORKBENCH_CONTEXT_SUMMARY);
  });
});
