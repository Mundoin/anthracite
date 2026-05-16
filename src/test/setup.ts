import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom 25 ships Blob/File without `arrayBuffer()`. WebView2 (production)
// provides it; the test env does not. Polyfill via FileReader so
// `readUtf8File()` exercises the same code path under test as in prod.
type BlobPrototypePatch = {
  arrayBuffer?: () => Promise<ArrayBuffer>;
};

if (
  typeof Blob !== "undefined" &&
  typeof (Blob.prototype as BlobPrototypePatch).arrayBuffer !== "function"
) {
  (Blob.prototype as BlobPrototypePatch).arrayBuffer = function (
    this: Blob,
  ): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (): void => {
        const result = reader.result;
        if (result instanceof ArrayBuffer) resolve(result);
        else reject(new Error("FileReader returned non-ArrayBuffer result"));
      };
      reader.onerror = (): void =>
        reject(reader.error ?? new Error("FileReader failed"));
      reader.readAsArrayBuffer(this);
    });
  };
}

afterEach(() => {
  cleanup();
});
