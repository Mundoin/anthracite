import { describe, it, expect } from "vitest";
import { deriveLinkState } from "../linkState";
import type { LabOperationalState } from "../../../../types/labEnvironment";

describe("deriveLinkState", () => {
  const STATES: readonly (LabOperationalState | undefined)[] = [
    "healthy", "warning", "degraded", "down", "maintenance", "unknown", undefined,
  ];

  it("returns 'healthy' when both endpoints healthy", () => {
    expect(deriveLinkState("healthy", "healthy")).toBe("healthy");
  });

  it("returns 'warning' when one endpoint warning, other healthy", () => {
    expect(deriveLinkState("warning", "healthy")).toBe("warning");
    expect(deriveLinkState("healthy", "warning")).toBe("warning");
  });

  it("degraded beats warning", () => {
    expect(deriveLinkState("degraded", "warning")).toBe("degraded");
    expect(deriveLinkState("warning", "degraded")).toBe("degraded");
  });

  it("down beats all others", () => {
    expect(deriveLinkState("down", "warning")).toBe("down");
    expect(deriveLinkState("down", "degraded")).toBe("down");
    expect(deriveLinkState("maintenance", "down")).toBe("down");
    expect(deriveLinkState("down", "healthy")).toBe("down");
  });

  it("maintenance beats unknown + healthy but loses to warning+", () => {
    expect(deriveLinkState("maintenance", "healthy")).toBe("maintenance");
    expect(deriveLinkState("maintenance", "unknown")).toBe("maintenance");
    expect(deriveLinkState("maintenance", "warning")).toBe("warning");
    expect(deriveLinkState("maintenance", "degraded")).toBe("degraded");
  });

  it("treats undefined as 'unknown'", () => {
    expect(deriveLinkState(undefined, "healthy")).toBe("unknown");
    expect(deriveLinkState("healthy", undefined)).toBe("unknown");
    expect(deriveLinkState(undefined, undefined)).toBe("unknown");
    expect(deriveLinkState(undefined, "warning")).toBe("warning");
  });

  it("is commutative for all state pairs", () => {
    for (const a of STATES) {
      for (const b of STATES) {
        expect(deriveLinkState(a, b)).toBe(deriveLinkState(b, a));
      }
    }
  });
});
