import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Regression: V1AW white-screen.
 *
 * App.tsx had `useMemo(detailSubnav)` BELOW the early-return mode
 * branches. On mode switch from hierarchy to any other top-level mode
 * the count of hooks called dropped, triggering React's
 * "Rendered fewer hooks than expected" which unmounted the entire
 * React root (full white window — no shell, no boundary fallback).
 *
 * Lock the invariant statically: in App.tsx, every React hook call
 * must appear before the first `if (activeMode === …)` early return.
 */
describe("App.tsx — hook order discipline", () => {
  it("all React hook calls live above the first mode-branch early return", () => {
    const appPath = resolve(__dirname, "..", "App.tsx");
    const src = readFileSync(appPath, "utf8");
    const lines = src.split(/\r?\n/);

    const hookPattern = /\b(useState|useMemo|useCallback|useEffect|useReducer|useRef|useLayoutEffect)\s*[<(]/;
    const earlyReturnPattern = /^\s*if\s*\(\s*activeMode\s*===/;

    let firstEarlyReturnLine = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      if (earlyReturnPattern.test(line)) {
        firstEarlyReturnLine = i;
        break;
      }
    }
    expect(firstEarlyReturnLine).toBeGreaterThan(0);

    const offenders: { readonly line: number; readonly text: string }[] = [];
    for (let i = firstEarlyReturnLine + 1; i < lines.length; i++) {
      const line = lines[i] ?? "";
      // Skip import lines and comments — only real call sites matter.
      if (line.trimStart().startsWith("//")) continue;
      if (line.trimStart().startsWith("import ")) continue;
      if (hookPattern.test(line)) {
        offenders.push({ line: i + 1, text: line.trim() });
      }
    }

    expect(
      offenders,
      `Found React hook calls below the first early-return in App.tsx; ` +
        `this re-introduces the V1AW "Rendered fewer hooks than expected" ` +
        `unmount bug. Move these calls above the mode-branch returns:\n` +
        offenders
          .map((o) => `  - App.tsx:${o.line}  ${o.text}`)
          .join("\n"),
    ).toEqual([]);
  });
});
