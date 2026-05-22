/**
 * D3C — Narrow viewport hook.
 *
 * Returns true when the window width is below the threshold (default 1100px).
 * The shell uses this to suppress the ContextSidebar column at narrow widths
 * (a simplified Concept B fallback — full inline-disclosure rail is deferred).
 *
 * Obeys D3_NAV_SPEC §8.
 */

import { useEffect, useState } from "react";

export function useNarrowViewport(threshold: number = 1100): boolean {
  const [narrow, setNarrow] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < threshold : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = (): void => {
      setNarrow(window.innerWidth < threshold);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [threshold]);

  return narrow;
}
