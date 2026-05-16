import { describe, expect, it } from "vitest";
import type { ConfigDetectionResult } from "../../../types/configDetection";
import type { DeviceModel, PlatformRef } from "../../../types/networkModel";
import type { ReceiptView } from "../../../types/receipt";
import type { VendorPlatform } from "../../../types/vendor";
import { intakeReducer } from "../intakeReducer";
import { initialIntakeState, type IntakeState } from "../intakeTypes";

const PLATFORMS: ReadonlyArray<VendorPlatform> = [
  {
    id: "cisco-iosxe",
    vendor: "cisco",
    os_family: "iosxe",
    primary_role: "router",
    config_style: "ios-cli",
    priority_tier: "t1",
    initial_parser_target_level: "l2topology",
    capability_families: ["interfaces"],
    notes: "",
  },
];

const REF: PlatformRef = {
  platform_id: "cisco-iosxe",
  vendor: "cisco",
  os_family: "iosxe",
  os_version_raw: null,
  os_version_normalized: null,
  detection_confidence: 0.95,
};

const DETECTION: ConfigDetectionResult = {
  best_match: REF,
  candidates: [
    {
      platform_id: "cisco-iosxe",
      score: 12.5,
      normalized_score: 0.95,
      match_count: 8,
      distinct_signature_count: 5,
    },
  ],
  evidence: [],
  confidence: 0.95,
  warnings: [],
  scanned_line_count: 100,
  total_line_count: 100,
};

const DEVICE = { identity: { hostname: "r1" } } as unknown as DeviceModel;
const RECEIPT = {
  hostname: "r1",
  parser_version: "cisco-iosxe-v3",
  areas: [],
  warnings: [],
  unknowns: [],
  unknowns_truncated: false,
  coverage_ratio: 1,
  parsed_line_count: 100,
  unknown_line_count: 0,
} as unknown as ReceiptView;

function withPlatforms(state: IntakeState = initialIntakeState): IntakeState {
  return intakeReducer(state, {
    type: "VendorPlatformsLoaded",
    platforms: PLATFORMS,
  });
}

describe("intakeReducer", () => {
  it("loads vendor platforms without changing flow status", () => {
    const s = withPlatforms();
    expect(s.status).toBe("idle");
    expect(s.vendorPlatforms).toHaveLength(1);
  });

  it("transitions idle -> input_ready on non-empty text", () => {
    const s = intakeReducer(withPlatforms(), {
      type: "SetConfigText",
      text: "hostname r1",
    });
    expect(s.status).toBe("input_ready");
    expect(s.text).toBe("hostname r1");
    expect(s.source?.kind).toBe("paste");
  });

  it("transitions back to idle when text is cleared to empty", () => {
    const s1 = intakeReducer(withPlatforms(), {
      type: "SetConfigText",
      text: "hostname r1",
    });
    const s2 = intakeReducer(s1, { type: "SetConfigText", text: "" });
    expect(s2.status).toBe("idle");
    expect(s2.vendorPlatforms).toHaveLength(1);
  });

  it("FileLoaded sets source to file with filename and byte_size", () => {
    const s = intakeReducer(withPlatforms(), {
      type: "FileLoaded",
      text: "hostname r1",
      filename: "router.cfg",
      byte_size: 11,
    });
    expect(s.status).toBe("input_ready");
    expect(s.source?.kind).toBe("file");
    expect(s.source?.filename).toBe("router.cfg");
    expect(s.source?.byte_size).toBe(11);
  });

  it("DetectStart requires input_ready and non-empty text", () => {
    const idle = intakeReducer(withPlatforms(), { type: "DetectStart" });
    expect(idle.status).toBe("idle");

    const ready = intakeReducer(withPlatforms(), {
      type: "SetConfigText",
      text: "hostname r1",
    });
    const detecting = intakeReducer(ready, { type: "DetectStart" });
    expect(detecting.status).toBe("detecting");
  });

  it("DetectSucceeded -> detected and preselects best_match without manual", () => {
    const detecting = intakeReducer(
      intakeReducer(withPlatforms(), { type: "SetConfigText", text: "x" }),
      { type: "DetectStart" },
    );
    const detected = intakeReducer(detecting, {
      type: "DetectSucceeded",
      result: DETECTION,
    });
    expect(detected.status).toBe("detected");
    expect(detected.selectedPlatform?.platform_id).toBe("cisco-iosxe");
    expect(detected.isManualOverride).toBe(false);
  });

  it("SelectPlatform with manual flag marks override and stays in detected", () => {
    const detected = intakeReducer(
      intakeReducer(
        intakeReducer(withPlatforms(), { type: "SetConfigText", text: "x" }),
        { type: "DetectStart" },
      ),
      { type: "DetectSucceeded", result: DETECTION },
    );
    const overridden = intakeReducer(detected, {
      type: "SelectPlatform",
      platform: { ...REF, platform_id: "juniper-junos", vendor: "juniper", os_family: "junos" },
      isManualOverride: true,
    });
    expect(overridden.status).toBe("detected");
    expect(overridden.selectedPlatform?.platform_id).toBe("juniper-junos");
    expect(overridden.isManualOverride).toBe(true);
  });

  it("ParseStart -> parsing requires detected + selectedPlatform", () => {
    const detected = intakeReducer(
      intakeReducer(
        intakeReducer(withPlatforms(), { type: "SetConfigText", text: "x" }),
        { type: "DetectStart" },
      ),
      { type: "DetectSucceeded", result: DETECTION },
    );
    const parsing = intakeReducer(detected, { type: "ParseStart" });
    expect(parsing.status).toBe("parsing");

    const ignored = intakeReducer(withPlatforms(), { type: "ParseStart" });
    expect(ignored.status).toBe("idle");
  });

  it("ParseSucceeded stores device + receipt", () => {
    let s = withPlatforms();
    s = intakeReducer(s, { type: "SetConfigText", text: "x" });
    s = intakeReducer(s, { type: "DetectStart" });
    s = intakeReducer(s, { type: "DetectSucceeded", result: DETECTION });
    s = intakeReducer(s, { type: "ParseStart" });
    s = intakeReducer(s, { type: "ParseSucceeded", device: DEVICE, receipt: RECEIPT });
    expect(s.status).toBe("parsed");
    expect(s.receipt?.parser_version).toBe("cisco-iosxe-v3");
  });

  it("ParseFailed -> error with stage=parse", () => {
    let s = withPlatforms();
    s = intakeReducer(s, { type: "SetConfigText", text: "x" });
    s = intakeReducer(s, { type: "DetectStart" });
    s = intakeReducer(s, { type: "DetectSucceeded", result: DETECTION });
    s = intakeReducer(s, { type: "ParseStart" });
    s = intakeReducer(s, { type: "ParseFailed", message: "boom" });
    expect(s.status).toBe("error");
    expect(s.errorStage).toBe("parse");
    expect(s.errorMessage).toBe("boom");
  });

  it("DismissError returns to input_ready when text remains", () => {
    let s = withPlatforms();
    s = intakeReducer(s, { type: "SetConfigText", text: "x" });
    s = intakeReducer(s, { type: "DetectStart" });
    s = intakeReducer(s, { type: "DetectFailed", message: "down" });
    expect(s.status).toBe("error");
    const dismissed = intakeReducer(s, { type: "DismissError" });
    expect(dismissed.status).toBe("input_ready");
    expect(dismissed.errorMessage).toBeNull();
    expect(dismissed.text).toBe("x");
  });

  it("ClearAll resets everything but preserves vendor list", () => {
    let s = withPlatforms();
    s = intakeReducer(s, { type: "SetConfigText", text: "x" });
    s = intakeReducer(s, { type: "DetectStart" });
    s = intakeReducer(s, { type: "DetectSucceeded", result: DETECTION });
    s = intakeReducer(s, { type: "ClearAll" });
    expect(s.status).toBe("idle");
    expect(s.text).toBe("");
    expect(s.detection).toBeNull();
    expect(s.vendorPlatforms).toHaveLength(1);
  });

  it("ignores SetConfigText while detecting (illegal transition)", () => {
    let s = withPlatforms();
    s = intakeReducer(s, { type: "SetConfigText", text: "x" });
    s = intakeReducer(s, { type: "DetectStart" });
    const ignored = intakeReducer(s, { type: "SetConfigText", text: "changed" });
    expect(ignored).toBe(s);
  });

  it("ignores ParseSucceeded when not parsing", () => {
    const s = withPlatforms();
    const ignored = intakeReducer(s, {
      type: "ParseSucceeded",
      device: DEVICE,
      receipt: RECEIPT,
    });
    expect(ignored).toBe(s);
  });
});
