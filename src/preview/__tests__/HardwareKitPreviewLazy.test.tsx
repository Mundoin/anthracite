/**
 * V1BE-A — assert the hardware preview is behind a real lazy boundary.
 *
 * The test compiles a small probe that imports App.tsx and inspects its
 * module dependency graph at the source level: the eager import of
 * HardwareKitPreview must be gone, replaced by a dynamic `import(...)`
 * call inside a React.lazy wrapper. We do not boot Babylon here — the
 * Suspense fallback is rendered + verified instead.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import App from "../../App";

function readApp(): string {
  return readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
}

describe("V1BE-A — hardware preview lazy boundary", () => {
  it("App.tsx no longer eager-imports HardwareKitPreview", () => {
    const src = readApp();
    expect(src).not.toMatch(
      /^\s*import\s+\{\s*HardwareKitPreview\s*\}\s+from\s+["'].\/preview\/HardwareKitPreview["']/m,
    );
  });

  it("App.tsx uses React.lazy with a dynamic import for the preview", () => {
    const src = readApp();
    expect(src).toMatch(/lazy\(\s*\(\)\s*=>/);
    expect(src).toMatch(/import\(\s*["'].\/preview\/HardwareKitPreview["']\s*\)/);
  });

  it("App.tsx wraps the preview route in <Suspense>", () => {
    const src = readApp();
    expect(src).toMatch(/<Suspense\b[\s\S]*?<HardwareKitPreview\s*\/>/);
  });

  it("renders the Suspense fallback before the preview chunk resolves", async () => {
    const originalSearch = window.location.search;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, search: "?preview=hardware-kit" },
    });
    try {
      render(<App />);
      // Fallback text is rendered synchronously while the dynamic
      // import promise is pending. We do not await resolution — Babylon
      // would attempt WebGL setup inside jsdom, which is out of scope.
      expect(
        screen.getByText(/loading hardware kit/i),
      ).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, "location", {
        writable: true,
        value: { ...window.location, search: originalSearch },
      });
    }
  });
});
