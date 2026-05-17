import { describe, expect, it, vi } from "vitest";
import { saveToFile } from "../saveFile";

describe("saveToFile", () => {
  it("returns error when showSaveFilePicker is unavailable", async () => {
    const outcome = await saveToFile("test", {
      suggestedName: "test.json",
      mimeType: "application/json",
      extension: "json",
    });
    expect(outcome).toEqual({
      error: true,
      message: "File save API not available in this context.",
    });
  });

  it("returns cancelled on AbortError", async () => {
    const abortError = new DOMException("aborted", "AbortError");
    const mockShowSaveFilePicker = vi
      .fn()
      .mockRejectedValue(abortError);
    const originalWindow = globalThis.window;
    // @ts-expect-error test-only partial mock
    globalThis.window = {
      showSaveFilePicker: mockShowSaveFilePicker,
    };

    try {
      const outcome = await saveToFile("test", {
        suggestedName: "test.json",
        mimeType: "application/json",
        extension: "json",
      });
      expect(outcome).toEqual({ cancelled: true });
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("returns error on non-Abort DOMException", async () => {
    const domError = new DOMException("denied", "NotAllowedError");
    const mockShowSaveFilePicker = vi
      .fn()
      .mockRejectedValue(domError);
    const originalWindow = globalThis.window;
    // @ts-expect-error test-only partial mock
    globalThis.window = {
      showSaveFilePicker: mockShowSaveFilePicker,
    };

    try {
      const outcome = await saveToFile("test", {
        suggestedName: "test.json",
        mimeType: "application/json",
        extension: "json",
      });
      expect(outcome).toEqual({
        error: true,
        message: "Save dialog failed: NotAllowedError: denied",
      });
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("writes text and returns ok on success", async () => {
    const mockWrite = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn().mockResolvedValue(undefined);
    const mockCreateWritable = vi.fn().mockResolvedValue({
      write: mockWrite,
      close: mockClose,
    });
    const mockShowSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable: mockCreateWritable,
    });
    const originalWindow = globalThis.window;
    // @ts-expect-error test-only partial mock
    globalThis.window = {
      showSaveFilePicker: mockShowSaveFilePicker,
    };

    try {
      const outcome = await saveToFile("hello", {
        suggestedName: "test.md",
        mimeType: "text/markdown",
        extension: "md",
      });
      expect(outcome).toEqual({ ok: true });
      expect(mockShowSaveFilePicker).toHaveBeenCalledWith({
        suggestedName: "test.md",
        types: [
          {
            description: "MD",
            accept: { "text/markdown": [".md"] },
          },
        ],
      });
      expect(mockWrite).toHaveBeenCalledWith("hello");
      expect(mockClose).toHaveBeenCalled();
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("returns error when createWritable fails", async () => {
    const mockCreateWritable = vi
      .fn()
      .mockRejectedValue(new Error("permission denied"));
    const mockShowSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable: mockCreateWritable,
    });
    const originalWindow = globalThis.window;
    // @ts-expect-error test-only partial mock
    globalThis.window = {
      showSaveFilePicker: mockShowSaveFilePicker,
    };

    try {
      const outcome = await saveToFile("test", {
        suggestedName: "test.json",
        mimeType: "application/json",
        extension: "json",
      });
      expect(outcome).toEqual({
        error: true,
        message: "Could not open file for writing: permission denied",
      });
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("returns error when write fails", async () => {
    const mockWrite = vi.fn().mockRejectedValue(new Error("disk full"));
    const mockClose = vi.fn().mockResolvedValue(undefined);
    const mockCreateWritable = vi.fn().mockResolvedValue({
      write: mockWrite,
      close: mockClose,
    });
    const mockShowSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable: mockCreateWritable,
    });
    const originalWindow = globalThis.window;
    // @ts-expect-error test-only partial mock
    globalThis.window = {
      showSaveFilePicker: mockShowSaveFilePicker,
    };

    try {
      const outcome = await saveToFile("test", {
        suggestedName: "test.json",
        mimeType: "application/json",
        extension: "json",
      });
      expect(outcome).toEqual({
        error: true,
        message: "Write failed: disk full",
      });
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
