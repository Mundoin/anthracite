import { describe, it, expect } from "vitest";
import {
  buildDemoCollectionTarget,
  listCollectionTargets,
  validateCollectionTargetCatalogue,
} from "../collectionTargetCatalogue";

describe("collectionTargetCatalogue", () => {
  it("demo target passes validation", () => {
    const t = buildDemoCollectionTarget();
    expect(t.id).toBe("tgt-demo-edge-01");
    expect(t.contact_policy.read_only).toBe(true);
    expect(t.credential_ref).toBe("cred://read-only-default");
  });

  it("catalogue returns at least one target", () => {
    const list = listCollectionTargets();
    expect(list.length).toBeGreaterThan(0);
  });

  it("catalogue passes bulk validation", () => {
    const result = validateCollectionTargetCatalogue(listCollectionTargets());
    expect(result.ok).toBe(true);
    expect(result.per_target.every((p) => p.result.ok)).toBe(true);
  });

  it("is deterministic — same target twice yields equal data", () => {
    expect(buildDemoCollectionTarget()).toEqual(buildDemoCollectionTarget());
  });
});
