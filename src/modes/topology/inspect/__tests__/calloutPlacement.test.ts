/**
 * V1BJ — calloutPlacement unit tests.
 *
 * Pure geometry helper. Covers default placement, horizontal flip,
 * vertical flip, both-flip, and clamping at viewport edges.
 */

import { describe, expect, it } from "vitest";
import { placeCallout } from "../calloutPlacement";

const SIZE = { w: 240, h: 140 };
const WRAP = { w: 1000, h: 700 };

describe("placeCallout — V1BJ edge-aware placement", () => {
  it("defaults to top-right of the pick when there is room", () => {
    const p = placeCallout({ x: 400, y: 400 }, SIZE, WRAP);
    expect(p.side).toBe("tr");
    expect(p.cardLeft).toBeGreaterThan(400);
    expect(p.cardTop).toBeLessThan(400);
    // leader attaches at card's bottom-left when card is top-right
    expect(p.leaderAttachX).toBe(p.cardLeft);
    expect(p.leaderAttachY).toBe(p.cardTop + SIZE.h);
  });

  it("flips to top-left when the right edge would overflow", () => {
    const p = placeCallout({ x: 920, y: 400 }, SIZE, WRAP);
    expect(p.side).toBe("tl");
    expect(p.cardLeft + SIZE.w).toBeLessThanOrEqual(WRAP.w);
    expect(p.leaderAttachX).toBe(p.cardLeft + SIZE.w);
  });

  it("flips to bottom-right when the top edge would overflow", () => {
    const p = placeCallout({ x: 400, y: 30 }, SIZE, WRAP);
    expect(p.side).toBe("br");
    expect(p.cardTop).toBeGreaterThanOrEqual(30);
    expect(p.leaderAttachY).toBe(p.cardTop);
  });

  it("flips to bottom-left when both right and top would overflow", () => {
    const p = placeCallout({ x: 980, y: 20 }, SIZE, WRAP);
    expect(p.side).toBe("bl");
    expect(p.cardLeft + SIZE.w).toBeLessThanOrEqual(WRAP.w);
    expect(p.cardTop).toBeGreaterThanOrEqual(8);
  });

  it("clamps so the card never overflows the wrap", () => {
    const p = placeCallout({ x: 10, y: 690 }, SIZE, WRAP);
    expect(p.cardLeft).toBeGreaterThanOrEqual(8);
    expect(p.cardTop + SIZE.h).toBeLessThanOrEqual(WRAP.h);
  });

  it("preserves the pick anchor for the renderer", () => {
    const p = placeCallout({ x: 123, y: 456 }, SIZE, WRAP);
    expect(p.pickX).toBe(123);
    expect(p.pickY).toBe(456);
  });
});
