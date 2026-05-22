/**
 * D3C — useNarrowViewport hook tests.
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useNarrowViewport } from "../useNarrowViewport";

const originalInnerWidth = window.innerWidth;

function setWidth(px: number): void {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: px,
  });
  window.dispatchEvent(new Event("resize"));
}

describe("useNarrowViewport", () => {
  beforeEach(() => {
    setWidth(1400);
  });

  afterEach(() => {
    setWidth(originalInnerWidth);
  });

  it("returns false at default threshold when width is wide", () => {
    const { result } = renderHook(() => useNarrowViewport());
    expect(result.current).toBe(false);
  });

  it("returns true at default threshold when width is narrow", () => {
    setWidth(900);
    const { result } = renderHook(() => useNarrowViewport());
    expect(result.current).toBe(true);
  });

  it("flips when window resizes across threshold", () => {
    const { result } = renderHook(() => useNarrowViewport(1100));
    expect(result.current).toBe(false);
    act(() => setWidth(800));
    expect(result.current).toBe(true);
    act(() => setWidth(1300));
    expect(result.current).toBe(false);
  });

  it("respects custom threshold", () => {
    setWidth(900);
    const { result } = renderHook(() => useNarrowViewport(800));
    expect(result.current).toBe(false);
  });
});
