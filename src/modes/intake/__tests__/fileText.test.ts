import { describe, expect, it } from "vitest";
import { describeError, readUtf8File } from "../fileText";

function makeFile(content: BlobPart, name: string, type = "text/plain"): File {
  return new File([content], name, { type });
}

describe("readUtf8File", () => {
  it("reads valid UTF-8 text and returns filename + byte_size", async () => {
    const f = makeFile("hostname r1\n", "router.cfg");
    const r = await readUtf8File(f);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.text).toBe("hostname r1\n");
      expect(r.value.filename).toBe("router.cfg");
      expect(r.value.byte_size).toBe(12);
    }
  });

  it("rejects an empty file with a clear message", async () => {
    const f = makeFile("", "empty.cfg");
    const r = await readUtf8File(f);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toMatch(/empty/i);
    }
  });

  it("rejects non-UTF-8 bytes", async () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0xfd]);
    const f = makeFile(bytes, "bad.bin");
    const r = await readUtf8File(f);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toMatch(/UTF-8/);
    }
  });
});

describe("describeError", () => {
  it("returns Error.message for Error instances", () => {
    expect(describeError(new Error("boom"))).toBe("boom");
  });

  it("returns the string as-is for string errors", () => {
    expect(describeError("bad")).toBe("bad");
  });

  it("serializes other values", () => {
    expect(describeError({ code: 42 })).toContain("42");
  });
});
