/**
 * V1CG — Inventory Truth projection tests.
 */

import { describe, it, expect } from "vitest";
import {
  projectInventoryTruthFromReceipt,
  buildDemoInventoryTruth,
} from "../inventoryTruthProjection";
import { buildDemoCollectionTarget } from "../collectionTargetCatalogue";
import { buildDemoSingleDeviceRun } from "../singleDeviceCollector";
import { buildCollectionReceipt } from "../../types/collectionReceipt";
import { validateInventoryDeviceTruth } from "../../types/inventoryTruth";

const T = "2026-05-25T12:00:00Z";

describe("projectInventoryTruthFromReceipt — V1CF demo path", () => {
  const run = buildDemoSingleDeviceRun();

  it("emits a row with hostname/vendor/platform parsed from inventory message", () => {
    const row = projectInventoryTruthFromReceipt({
      receipt: run.receipt!,
      target: buildDemoCollectionTarget(),
    });
    expect(row.hostname).toBe("edge-rtr-01");
    expect(row.vendor).toBe("Cisco");
    expect(row.platform).toBe("iosxe");
  });

  it("parses os_family + os_version from version_facts message", () => {
    const row = projectInventoryTruthFromReceipt({
      receipt: run.receipt!,
      target: buildDemoCollectionTarget(),
    });
    expect(row.os_family).toBe("IOS-XE");
    expect(row.os_version).toBe("17.9.4a");
  });

  it("enriches role/site/zone from V1CC target hints", () => {
    const row = projectInventoryTruthFromReceipt({
      receipt: run.receipt!,
      target: buildDemoCollectionTarget(),
    });
    expect(row.role).toBe("edge router");
    expect(row.site).toBe("Campus A");
    expect(row.zone).toBe("edge");
  });

  it("carries source_kind, method, last_observed, confidence from the receipt", () => {
    const row = projectInventoryTruthFromReceipt({
      receipt: run.receipt!,
      target: buildDemoCollectionTarget(),
    });
    expect(row.source_kind).toBe("demo");
    expect(row.method).toBe("ssh");
    expect(row.last_observed).toBe("2026-05-25T12:00:00Z");
    expect(row.confidence).not.toBeNull();
    expect(row.confidence!).toBeLessThanOrEqual(0.95);
  });

  it("retains receipt id + evidence refs for future drilldown", () => {
    const row = projectInventoryTruthFromReceipt({
      receipt: run.receipt!,
      target: buildDemoCollectionTarget(),
    });
    expect(row.receipt_ids).toContain(run.receipt!.id);
    expect(row.evidence_refs.length).toBeGreaterThan(0);
    for (const ref of row.evidence_refs) {
      expect(ref.receipt_id).toBe(run.receipt!.id);
    }
  });

  it("validates", () => {
    const row = projectInventoryTruthFromReceipt({
      receipt: run.receipt!,
      target: buildDemoCollectionTarget(),
    });
    expect(validateInventoryDeviceTruth(row).ok).toBe(true);
  });

  it("is deterministic", () => {
    const a = projectInventoryTruthFromReceipt({
      receipt: run.receipt!,
      target: buildDemoCollectionTarget(),
    });
    const b = projectInventoryTruthFromReceipt({
      receipt: run.receipt!,
      target: buildDemoCollectionTarget(),
    });
    expect(a).toEqual(b);
  });
});

describe("projectInventoryTruthFromReceipt — empty / invalid receipts", () => {
  it("emits a sparse row when receipt has no inventory / version evidence", () => {
    const receipt = buildCollectionReceipt({
      id: "rcpt-sparse",
      target_id: "tgt-x",
      source_kind: "manual",
      method: "manual",
      started_at: T,
      evidence: [],
    });
    const row = projectInventoryTruthFromReceipt({ receipt });
    expect(row.device_id).toBe("tgt-x");
    expect(row.hostname).toBeNull();
    expect(row.vendor).toBeNull();
    expect(row.os_version).toBeNull();
    expect(row.confidence).toBeNull();
  });

  it("sparse row fails validator due to no_evidence_refs (truth needs proof)", () => {
    const receipt = buildCollectionReceipt({
      id: "rcpt-empty",
      target_id: "tgt-y",
      source_kind: "manual",
      method: "manual",
      started_at: T,
      evidence: [],
    });
    const row = projectInventoryTruthFromReceipt({ receipt });
    const v = validateInventoryDeviceTruth(row);
    expect(v.ok).toBe(false);
    expect(v.issues.some((i) => i.code === "no_evidence_refs")).toBe(true);
  });

  it("falls back to receipt.id for device_id when target_id is null", () => {
    const receipt = buildCollectionReceipt({
      id: "rcpt-orphan",
      target_id: null,
      source_kind: "manual",
      method: "manual",
      started_at: T,
      evidence: [],
    });
    const row = projectInventoryTruthFromReceipt({ receipt });
    expect(row.device_id).toBe("rcpt-orphan");
  });
});

describe("buildDemoInventoryTruth", () => {
  it("returns the V1CF demo edge-rtr-01 row", () => {
    const row = buildDemoInventoryTruth();
    expect(row).not.toBeNull();
    expect(row!.device_id).toBe("tgt-demo-edge-01");
    expect(row!.hostname).toBe("edge-rtr-01");
    expect(row!.vendor).toBe("Cisco");
    expect(row!.os_version).toBe("17.9.4a");
  });
});
