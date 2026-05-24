/**
 * V1BN — blueprintIdentity resolver tests.
 * Table-driven keyword / vendor / fallback rules.
 */

import { describe, expect, it } from "vitest";

import { resolveIdentity } from "../blueprintIdentity";
import type { GraphReadyTopologyNode } from "../../topologyReview";

function mk(
  id: string,
  opts: {
    label?: string;
    vendor?: string | null;
    platform_id?: string | null;
    role_hint?: string;
  } = {},
): GraphReadyTopologyNode {
  return {
    id,
    label: opts.label ?? id,
    vendor: opts.vendor ?? null,
    platform_id: opts.platform_id ?? null,
    role_hint: opts.role_hint ?? "",
    layer: "physical",
  };
}

describe("resolveIdentity — keyword matches", () => {
  it("fw-fortinet-001 → FW", () => {
    expect(resolveIdentity(mk("fw-fortinet-001")).family).toBe("FW");
  });
  it("rtr-cisco-002 → EDGE-RT", () => {
    expect(resolveIdentity(mk("rtr-cisco-002")).family).toBe("EDGE-RT");
  });
  it("core-router-003 → CORE-RT (specific beats generic)", () => {
    expect(resolveIdentity(mk("core-router-003")).family).toBe("CORE-RT");
  });
  it("sw-cisco-003 → ACC-SW", () => {
    expect(resolveIdentity(mk("sw-cisco-003")).family).toBe("ACC-SW");
  });
  it("dist-cisco-004 → DIST-SW", () => {
    expect(resolveIdentity(mk("dist-cisco-004")).family).toBe("DIST-SW");
  });
  it("ap-aruba-005 → WAP", () => {
    expect(resolveIdentity(mk("ap-aruba-005")).family).toBe("WAP");
  });
  it("cam-axis-007 → SRV (endpoint)", () => {
    expect(resolveIdentity(mk("cam-axis-007")).family).toBe("SRV");
  });
  it("srv-vmware-008 → SRV", () => {
    expect(resolveIdentity(mk("srv-vmware-008")).family).toBe("SRV");
  });
  it("fritzbox-home-009 → EDGE-RT", () => {
    expect(resolveIdentity(mk("fritzbox-home-009")).family).toBe("EDGE-RT");
  });
});

describe("resolveIdentity — vendor / platform inference", () => {
  it("vendor=fortinet → FW even with generic id", () => {
    expect(
      resolveIdentity(mk("node-001", { vendor: "Fortinet" })).family,
    ).toBe("FW");
  });
  it("platform=catalyst-9300 → ACC-SW", () => {
    expect(
      resolveIdentity(
        mk("node-002", { platform_id: "catalyst-9300" }),
      ).family,
    ).toBe("ACC-SW");
  });
});

describe("resolveIdentity — fallback paths", () => {
  it("role_hint='access switch' (V1BF rule) → ACC-SW", () => {
    expect(
      resolveIdentity(mk("anon-001", { role_hint: "access switch" })).family,
    ).toBe("ACC-SW");
  });
  it("no signal at all → UNK with low confidence", () => {
    const id = resolveIdentity(mk("anon-002"));
    expect(id.family).toBe("UNK");
    expect(id.confidence).toBe("low");
    expect(id.profileId).toBe("unk1u");
    expect(id.roleLabel).toBe("Unclassified");
  });
});

describe("resolveIdentity — virtual detection", () => {
  it("vm- prefix maps to vrouter profile when family is router", () => {
    const id = resolveIdentity(
      mk("vm-router-010", { role_hint: "router" }),
    );
    expect(id.profileId).toBe("vrouter");
  });
});

describe("resolveIdentity — output shape", () => {
  it("returns the documented shape (family/confidence/reason/displayLabel/roleLabel/profileId)", () => {
    const id = resolveIdentity(
      mk("fw-fortinet-001", { label: "fw-fortinet-001" }),
    );
    expect(id.family).toBeDefined();
    expect(id.confidence).toBeDefined();
    expect(typeof id.reason).toBe("string");
    expect(typeof id.displayLabel).toBe("string");
    expect(typeof id.roleLabel).toBe("string");
    expect(typeof id.profileId).toBe("string");
  });
});
