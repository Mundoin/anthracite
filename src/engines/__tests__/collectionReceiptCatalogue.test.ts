import { describe, it, expect } from "vitest";
import {
  buildImportedDemoReceipt,
  buildTargetDemoReceipt,
  listCollectionReceipts,
  validateCollectionReceiptCatalogue,
} from "../collectionReceiptCatalogue";

describe("collectionReceiptCatalogue", () => {
  it("imported demo receipt references V1CB demo and validates", () => {
    const r = buildImportedDemoReceipt();
    expect(r.source_kind).toBe("imported");
    expect(r.counts.attempted).toBe(4);
    expect(r.counts.accepted).toBe(4);
  });

  it("target demo receipt references V1CC demo target id", () => {
    const r = buildTargetDemoReceipt();
    expect(r.target_id).toBe("tgt-demo-edge-01");
    expect(r.counts.rejected).toBe(1);
    expect(r.warnings.length).toBe(1);
  });

  it("catalogue list returns 2 receipts", () => {
    expect(listCollectionReceipts().length).toBe(2);
  });

  it("catalogue passes bulk validation", () => {
    const result = validateCollectionReceiptCatalogue(listCollectionReceipts());
    expect(result.ok).toBe(true);
  });

  it("is deterministic — identical receipts across calls", () => {
    expect(buildImportedDemoReceipt()).toEqual(buildImportedDemoReceipt());
    expect(buildTargetDemoReceipt()).toEqual(buildTargetDemoReceipt());
  });
});
