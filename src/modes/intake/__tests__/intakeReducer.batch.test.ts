import { describe, expect, it } from "vitest";
import type { ConfigBatchSplitResult } from "../../../types/configBatch";
import { intakeReducer } from "../intakeReducer";
import { initialIntakeState, type IntakeState } from "../intakeTypes";

const SINGLE_RESULT: ConfigBatchSplitResult = {
  slices: [
    {
      slice_id: "slice-0",
      line_start: 1,
      line_end: 1,
      raw_text: "hostname r1\n",
      confidence: 1.0,
      hint: { kind: "none" },
    },
  ],
  method: { kind: "single_config" },
  warnings: [],
  total_line_count: 1,
  scanned_line_count: 1,
  splitter_version: "1",
};

const MULTI_RESULT: ConfigBatchSplitResult = {
  slices: [
    {
      slice_id: "slice-0",
      line_start: 1,
      line_end: 3,
      raw_text: "hostname r1\ninterface Gig0\nend\n",
      confidence: 1.0,
      hint: { kind: "hostname_present", hostname: "r1" },
    },
    {
      slice_id: "slice-1",
      line_start: 5,
      line_end: 7,
      raw_text: "hostname r2\ninterface Gig0\nend\n",
      confidence: 0.7,
      hint: { kind: "hostname_present", hostname: "r2" },
    },
  ],
  method: { kind: "heuristic" },
  warnings: [],
  total_line_count: 7,
  scanned_line_count: 7,
  splitter_version: "1",
};

const DETECTION_R1 = {
  best_match: {
    platform_id: "cisco-iosxe",
    vendor: "cisco",
    os_family: "iosxe",
    os_version_raw: null,
    os_version_normalized: null,
    detection_confidence: 0.95,
  },
  candidates: [],
  evidence: [],
  confidence: 0.95,
  warnings: [],
  scanned_line_count: 3,
  total_line_count: 3,
};

function seeded(text: string): IntakeState {
  return intakeReducer(initialIntakeState, { type: "SetConfigText", text });
}

describe("intakeReducer — V1O-A batch transitions", () => {
  it("SplitStart from input_ready moves to batchStatus=splitting", () => {
    const s = intakeReducer(seeded("hostname r1\n"), { type: "SplitStart" });
    expect(s.batchStatus).toBe("splitting");
  });

  it("SplitStart with empty text is ignored", () => {
    const s = intakeReducer(initialIntakeState, { type: "SplitStart" });
    expect(s.batchStatus).toBe("none");
  });

  it("SplitToSingle clears batch wrapper and transitions to detecting", () => {
    let s = seeded("hostname r1\n");
    s = intakeReducer(s, { type: "SplitStart" });
    s = intakeReducer(s, { type: "SplitToSingle", result: SINGLE_RESULT });
    expect(s.batchStatus).toBe("none");
    expect(s.batch).toBeNull();
    expect(s.status).toBe("detecting");
  });

  it("SplitToBatch records batch and seeds per-slice detection as pending", () => {
    let s = seeded("hostname r1\nend\nhostname r2\n");
    s = intakeReducer(s, { type: "SplitStart" });
    s = intakeReducer(s, { type: "SplitToBatch", result: MULTI_RESULT });
    expect(s.batchStatus).toBe("split_complete");
    expect(s.batch?.splitResult.slices).toHaveLength(2);
    expect(s.batch?.perSliceDetection["slice-0"].status).toBe("pending");
    expect(s.batch?.perSliceDetection["slice-1"].status).toBe("pending");
    expect(s.batch?.drilledSliceId).toBeNull();
  });

  it("SplitFailed transitions to split_error with message", () => {
    let s = seeded("hostname r1\n");
    s = intakeReducer(s, { type: "SplitStart" });
    s = intakeReducer(s, { type: "SplitFailed", message: "rpc down" });
    expect(s.batchStatus).toBe("split_error");
    expect(s.errorStage).toBe("split");
    expect(s.errorMessage).toBe("rpc down");
  });

  it("PerSliceDetectionSucceeded updates only the named slice entry", () => {
    let s = seeded("xx");
    s = intakeReducer(s, { type: "SplitStart" });
    s = intakeReducer(s, { type: "SplitToBatch", result: MULTI_RESULT });
    s = intakeReducer(s, {
      type: "PerSliceDetectionSucceeded",
      sliceId: "slice-1",
      result: DETECTION_R1,
    });
    expect(s.batch?.perSliceDetection["slice-1"].status).toBe("detected");
    expect(s.batch?.perSliceDetection["slice-0"].status).toBe("pending");
  });

  it("DrillIntoSlice copies slice.raw_text into the V1O sub-state", () => {
    let s = seeded("xx");
    s = intakeReducer(s, { type: "SplitStart" });
    s = intakeReducer(s, { type: "SplitToBatch", result: MULTI_RESULT });
    s = intakeReducer(s, {
      type: "PerSliceDetectionSucceeded",
      sliceId: "slice-1",
      result: DETECTION_R1,
    });
    s = intakeReducer(s, { type: "DrillIntoSlice", sliceId: "slice-1" });
    expect(s.batch?.drilledSliceId).toBe("slice-1");
    expect(s.text).toBe("hostname r2\ninterface Gig0\nend\n");
    expect(s.status).toBe("detected");
    expect(s.selectedPlatform?.platform_id).toBe("cisco-iosxe");
  });

  it("DrillIntoSlice with pending detection sets status=input_ready", () => {
    let s = seeded("xx");
    s = intakeReducer(s, { type: "SplitStart" });
    s = intakeReducer(s, { type: "SplitToBatch", result: MULTI_RESULT });
    s = intakeReducer(s, { type: "DrillIntoSlice", sliceId: "slice-0" });
    expect(s.batch?.drilledSliceId).toBe("slice-0");
    expect(s.status).toBe("input_ready");
    expect(s.detection).toBeNull();
  });

  it("BackToBatch restores original text and clears drilled slice", () => {
    let s = seeded("xx");
    s = intakeReducer(s, { type: "SplitStart" });
    s = intakeReducer(s, { type: "SplitToBatch", result: MULTI_RESULT });
    s = intakeReducer(s, { type: "DrillIntoSlice", sliceId: "slice-1" });
    s = intakeReducer(s, { type: "BackToBatch" });
    expect(s.batch?.drilledSliceId).toBeNull();
    expect(s.text).toBe("xx");
    expect(s.status).toBe("input_ready");
  });

  it("TreatAsSingleConfig drops batch and restores original text", () => {
    let s = seeded("xx");
    s = intakeReducer(s, { type: "SplitStart" });
    s = intakeReducer(s, { type: "SplitToBatch", result: MULTI_RESULT });
    s = intakeReducer(s, { type: "TreatAsSingleConfig" });
    expect(s.batchStatus).toBe("none");
    expect(s.batch).toBeNull();
    expect(s.text).toBe("xx");
    expect(s.status).toBe("input_ready");
  });

  it("SetConfigText invalidates an existing batch", () => {
    let s = seeded("xx");
    s = intakeReducer(s, { type: "SplitStart" });
    s = intakeReducer(s, { type: "SplitToBatch", result: MULTI_RESULT });
    s = intakeReducer(s, { type: "SetConfigText", text: "yy" });
    expect(s.batchStatus).toBe("none");
    expect(s.batch).toBeNull();
    expect(s.text).toBe("yy");
  });

  it("SplitToSingle / SplitToBatch outside of splitting are no-ops", () => {
    const s = initialIntakeState;
    const a = intakeReducer(s, { type: "SplitToSingle", result: SINGLE_RESULT });
    expect(a).toBe(s);
    const b = intakeReducer(s, { type: "SplitToBatch", result: MULTI_RESULT });
    expect(b).toBe(s);
  });

  it("DrillIntoSlice with unknown slice id is a no-op", () => {
    let s = seeded("xx");
    s = intakeReducer(s, { type: "SplitStart" });
    s = intakeReducer(s, { type: "SplitToBatch", result: MULTI_RESULT });
    const ignored = intakeReducer(s, {
      type: "DrillIntoSlice",
      sliceId: "slice-99",
    });
    expect(ignored).toBe(s);
  });
});
