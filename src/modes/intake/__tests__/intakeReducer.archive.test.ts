/**
 * V1O-B archive reducer transition lock.
 *
 * Exhaustively walks every legal and illegal archive-related action
 * through the reducer to lock the V1O-B state machine before the UI
 * tests build on it. Companion to
 * `intakeReducer.batch.test.ts` (V1O-A) and
 * `intakeReducer.test.ts` (V1O).
 */

import { describe, expect, it } from "vitest";

import type {
  ArchiveEntryRef,
  ArchiveIntakeResult,
} from "../../../types/archiveIntake";
import type { ConfigBatchSplitResult } from "../../../types/configBatch";
import { intakeReducer } from "../intakeReducer";
import { initialIntakeState, type IntakeState } from "../intakeTypes";

const ZIP_KIND = { kind: "zip" as const };

function inventoryStub(
  extracted: number,
  warnings: ArchiveIntakeResult["warnings"] = [],
): ArchiveIntakeResult {
  return {
    archive_kind_supplied: ZIP_KIND,
    archive_kind_detected: ZIP_KIND,
    entries: Array.from({ length: extracted }, (_, i) => ({
      entry_id: `entry-${i}`,
      entry_index: i,
      path: `r${i + 1}.cfg`,
      raw_path: null,
      size_bytes_compressed: 32,
      size_bytes_uncompressed: 32,
      status: { kind: "extracted" as const },
      raw_text: `hostname r${i + 1}\nend\n`,
      decode_warning: null,
    })),
    warnings,
    total_uncompressed_size: 32 * extracted,
    total_compressed_size: 32 * extracted,
    entry_count: extracted,
    extracted_count: extracted,
    skipped_count: 0,
    archive_intake_version: "1",
  };
}

const FLAT_BATCH_RESULT: ConfigBatchSplitResult = {
  slices: [
    {
      slice_id: "entry-0/slice-0",
      line_start: 1,
      line_end: 2,
      raw_text: "hostname r1\nend\n",
      confidence: 1.0,
      hint: { kind: "hostname_present", hostname: "r1" },
    },
    {
      slice_id: "entry-1/slice-0",
      line_start: 1,
      line_end: 2,
      raw_text: "hostname r2\nend\n",
      confidence: 1.0,
      hint: { kind: "hostname_present", hostname: "r2" },
    },
  ],
  method: { kind: "heuristic" },
  warnings: [],
  total_line_count: 4,
  scanned_line_count: 4,
  splitter_version: "1",
};

const PROVENANCE: Record<string, ArchiveEntryRef> = {
  "entry-0/slice-0": {
    entry_id: "entry-0",
    entry_path: "r1.cfg",
    archive_name: "configs.zip",
  },
  "entry-1/slice-0": {
    entry_id: "entry-1",
    entry_path: "r2.cfg",
    archive_name: "configs.zip",
  },
};

function loadingState(): IntakeState {
  return intakeReducer(initialIntakeState, {
    type: "ArchiveOpenStart",
    filename: "configs.zip",
    byte_size: 1024,
  });
}

describe("intakeReducer — V1O-B archive transitions", () => {
  it("ArchiveOpenStart from idle moves to archive_loading with archive source", () => {
    const next = loadingState();
    expect(next.batchStatus).toBe("archive_loading");
    expect(next.source).toEqual({
      kind: "archive",
      filename: "configs.zip",
      byte_size: 1024,
    });
    expect(next.batch).toBeNull();
    expect(next.text).toBe("");
  });

  it("ArchiveOpenStart is ignored while detecting", () => {
    const detecting: IntakeState = { ...initialIntakeState, status: "detecting" };
    const next = intakeReducer(detecting, {
      type: "ArchiveOpenStart",
      filename: "configs.zip",
      byte_size: 10,
    });
    expect(next).toBe(detecting);
  });

  it("ArchiveOpenFailed from archive_loading routes to archive_error + error stage", () => {
    const next = intakeReducer(loadingState(), {
      type: "ArchiveOpenFailed",
      message: "boom",
    });
    expect(next.batchStatus).toBe("archive_error");
    expect(next.status).toBe("error");
    expect(next.errorStage).toBe("archive");
    expect(next.errorMessage).toBe("boom");
  });

  it("ArchiveIntakeSplittingStart transitions loading → splitting", () => {
    const next = intakeReducer(loadingState(), {
      type: "ArchiveIntakeSplittingStart",
    });
    expect(next.batchStatus).toBe("archive_splitting");
  });

  it("ArchiveSingleConfigPassthrough drops batch wrapper and enters detecting", () => {
    const next = intakeReducer(loadingState(), {
      type: "ArchiveSingleConfigPassthrough",
      text: "hostname r1\nend\n",
      entry_path: "r1.cfg",
      archive_name: "configs.zip",
      inventory: inventoryStub(1),
    });
    // R11 regression lock: V1O single-config UX rendered, no batch chrome.
    expect(next.batchStatus).toBe("none");
    expect(next.batch).toBeNull();
    expect(next.status).toBe("detecting");
    expect(next.text).toBe("hostname r1\nend\n");
    expect(next.source).toEqual({
      kind: "archive",
      filename: "configs.zip / r1.cfg",
      byte_size: "hostname r1\nend\n".length,
    });
  });

  it("ArchiveBatchAssembled wires provenance + inventory into the batch wrapper", () => {
    const splitting = intakeReducer(loadingState(), {
      type: "ArchiveIntakeSplittingStart",
    });
    const inventory = inventoryStub(2);
    const next = intakeReducer(splitting, {
      type: "ArchiveBatchAssembled",
      result: FLAT_BATCH_RESULT,
      inventory,
      provenance: PROVENANCE,
      archive_name: "configs.zip",
    });
    expect(next.batchStatus).toBe("split_complete");
    expect(next.batch).not.toBeNull();
    expect(next.batch?.splitResult.slices).toHaveLength(2);
    expect(next.batch?.archiveInventory).toBe(inventory);
    expect(next.batch?.archiveProvenance).toBe(PROVENANCE);
    expect(next.batch?.archiveName).toBe("configs.zip");
    // Every slice starts with pending detection.
    expect(next.batch?.perSliceDetection["entry-0/slice-0"]).toEqual({
      status: "pending",
    });
    expect(next.batch?.perSliceDetection["entry-1/slice-0"]).toEqual({
      status: "pending",
    });
  });

  it("ArchiveBatchAssembled is ignored when not in an archive flow", () => {
    const next = intakeReducer(initialIntakeState, {
      type: "ArchiveBatchAssembled",
      result: FLAT_BATCH_RESULT,
      inventory: inventoryStub(2),
      provenance: PROVENANCE,
      archive_name: "configs.zip",
    });
    expect(next).toBe(initialIntakeState);
  });

  it("ClearAll from archive_error returns to initial state", () => {
    const errored = intakeReducer(loadingState(), {
      type: "ArchiveOpenFailed",
      message: "boom",
    });
    const next = intakeReducer(errored, { type: "ClearAll" });
    expect(next.batchStatus).toBe("none");
    expect(next.batch).toBeNull();
    expect(next.source).toBeNull();
    expect(next.status).toBe("idle");
  });

  it("Drill-into-slice + back-to-batch preserves archive provenance map", () => {
    const splitting = intakeReducer(loadingState(), {
      type: "ArchiveIntakeSplittingStart",
    });
    const ready = intakeReducer(splitting, {
      type: "ArchiveBatchAssembled",
      result: FLAT_BATCH_RESULT,
      inventory: inventoryStub(2),
      provenance: PROVENANCE,
      archive_name: "configs.zip",
    });
    const drilled = intakeReducer(ready, {
      type: "DrillIntoSlice",
      sliceId: "entry-1/slice-0",
    });
    expect(drilled.batch?.drilledSliceId).toBe("entry-1/slice-0");
    expect(drilled.batch?.archiveProvenance["entry-1/slice-0"]?.entry_path).toBe(
      "r2.cfg",
    );
    const back = intakeReducer(drilled, { type: "BackToBatch" });
    expect(back.batch?.drilledSliceId).toBeNull();
    expect(back.batch?.archiveProvenance).toBe(PROVENANCE);
    expect(back.batch?.archiveName).toBe("configs.zip");
  });
});
