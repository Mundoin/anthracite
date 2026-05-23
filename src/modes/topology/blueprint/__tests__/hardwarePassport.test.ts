/**
 * V1BG — hardware passport unit tests.
 *
 * Verifies role → profile id resolution and faceplate-derived counts
 * against the actual hardware kit profile data. No Babylon — pure
 * helpers only.
 */

import { describe, expect, it } from "vitest";

import { defaultProfileIdFor } from "../blueprintGlyph";
import { passportFor, passportOrUnknown } from "../hardwarePassport";

describe("defaultProfileIdFor — 8 families → profile id", () => {
  it("maps every family per the role-to-glyph-to-primitive-map default column", () => {
    expect(defaultProfileIdFor("ACC-SW")).toBe("access24");
    expect(defaultProfileIdFor("DIST-SW")).toBe("dist2u");
    expect(defaultProfileIdFor("CORE-RT")).toBe("core4u_rt");
    expect(defaultProfileIdFor("EDGE-RT")).toBe("edge1u");
    expect(defaultProfileIdFor("FW")).toBe("fw1u");
    expect(defaultProfileIdFor("SRV")).toBe("server1u");
    expect(defaultProfileIdFor("WAP")).toBe("wap");
    expect(defaultProfileIdFor("UNK")).toBe("unk1u");
  });

  it("picks the glass profile when virtual flag is set", () => {
    expect(defaultProfileIdFor("EDGE-RT", { virtual: true })).toBe("vrouter");
    expect(defaultProfileIdFor("FW", { virtual: true })).toBe("vfirewall");
  });

  it("UNK never silently substitutes a real profile", () => {
    // V1BD doctrine rule 5 — no silent fallback to access24.
    expect(defaultProfileIdFor("UNK")).not.toBe("access24");
    expect(defaultProfileIdFor("UNK")).toBe("unk1u");
  });
});

describe("passportFor — faceplate-derived counts", () => {
  it("access24: 24 RJ45 + 4 SFP + 0 QSFP", () => {
    const p = passportFor("access24");
    expect(p).not.toBeNull();
    expect(p!.counts.rj45).toBe(24);
    expect(p!.counts.sfp).toBe(4);
    expect(p!.counts.qsfp).toBe(0);
    expect(p!.counts.totalPorts).toBe(28);
  });

  it("access48: 48 RJ45 + 4 SFP", () => {
    const p = passportFor("access48");
    expect(p!.counts.rj45).toBe(48);
    expect(p!.counts.sfp).toBe(4);
    expect(p!.counts.totalPorts).toBe(52);
  });

  it("leaf32q: 32 QSFP across two rows", () => {
    const p = passportFor("leaf32q");
    expect(p!.counts.qsfp).toBe(32);
    expect(p!.counts.rj45).toBe(0);
    expect(p!.counts.sfp).toBe(0);
  });

  it("core4u_rt: 6 module bays + 2 PSU", () => {
    const p = passportFor("core4u_rt");
    expect(p!.counts.bays).toBe(6);
    expect(p!.counts.psu).toBe(2);
    expect(p!.rackUnits).toBe(4);
  });

  it("blade10u: 8 blade slots + 3 PSU + 2 fans + 4 QSFP fabric ports", () => {
    const p = passportFor("blade10u");
    expect(p!.counts.blades).toBe(8);
    expect(p!.counts.psu).toBe(3);
    expect(p!.counts.fan).toBe(2);
    expect(p!.counts.qsfp).toBe(4);
  });

  it("vrouter: virtual flag propagates + glass finish via family field", () => {
    const p = passportFor("vrouter");
    expect(p!.virtual).toBe(true);
    expect(p!.chassisFamily).toBe("router");
  });

  it("unk1u: zero ports, generic fallback shape", () => {
    const p = passportFor("unk1u");
    expect(p!.profileId).toBe("unk1u");
    expect(p!.chassisFamily).toBe("unknown");
    expect(p!.counts.totalPorts).toBe(0);
    expect(p!.rackUnits).toBe(1);
  });

  it("returns null for unknown profile ids", () => {
    expect(passportFor("nonexistent-profile")).toBeNull();
  });
});

describe("passportOrUnknown — graceful fallback", () => {
  it("returns the resolved passport when id exists", () => {
    expect(passportOrUnknown("fw1u").profileId).toBe("fw1u");
  });

  it("falls back to unk1u when id is unknown", () => {
    expect(passportOrUnknown("nope").profileId).toBe("unk1u");
  });
});
