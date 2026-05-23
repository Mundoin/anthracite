import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEnvSelectionStyle } from "../useEnvSelectionStyle";

describe("useEnvSelectionStyle", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should default to 'border'", () => {
    const { result } = renderHook(() => useEnvSelectionStyle());
    expect(result.current.style).toBe("border");
  });

  it("should persist to localStorage when setStyle is called", () => {
    const { result } = renderHook(() => useEnvSelectionStyle());

    act(() => {
      result.current.setStyle("ring");
    });

    expect(result.current.style).toBe("ring");
    expect(localStorage.getItem("anth.env.selection_style")).toBe("ring");
  });

  it("should read existing value from localStorage on mount", () => {
    localStorage.setItem("anth.env.selection_style", "chip");

    const { result } = renderHook(() => useEnvSelectionStyle());

    expect(result.current.style).toBe("chip");
  });

  it("should fall back to default for invalid stored value", () => {
    localStorage.setItem("anth.env.selection_style", "invalid");

    const { result } = renderHook(() => useEnvSelectionStyle());

    expect(result.current.style).toBe("border");
  });

  it("should fall back to default for invalid setStyle argument", () => {
    const { result } = renderHook(() => useEnvSelectionStyle());

    act(() => {
      result.current.setStyle("invalid" as any);
    });

    expect(result.current.style).toBe("border");
    expect(localStorage.getItem("anth.env.selection_style")).toBe("border");
  });

  it("should handle localStorage unavailable gracefully", () => {
    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;

    Storage.prototype.getItem = () => {
      throw new Error("localStorage unavailable");
    };
    Storage.prototype.setItem = () => {
      throw new Error("localStorage unavailable");
    };

    const { result } = renderHook(() => useEnvSelectionStyle());

    act(() => {
      result.current.setStyle("ring");
    });

    expect(result.current.style).toBe("ring");

    Storage.prototype.getItem = originalGetItem;
    Storage.prototype.setItem = originalSetItem;
  });
});
