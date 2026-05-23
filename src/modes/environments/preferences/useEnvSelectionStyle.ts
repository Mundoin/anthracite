import { useState, useEffect } from "react";

export type EnvSelectionStyle = "border" | "ring" | "chip";

const STORAGE_KEY = "anth.env.selection_style";
const DEFAULT_STYLE: EnvSelectionStyle = "border";
const VALID_STYLES = new Set<EnvSelectionStyle>(["border", "ring", "chip"]);

export function useEnvSelectionStyle(): {
  style: EnvSelectionStyle;
  setStyle: (s: EnvSelectionStyle) => void;
} {
  const [style, setStyleState] = useState<EnvSelectionStyle>(DEFAULT_STYLE);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VALID_STYLES.has(stored as EnvSelectionStyle)) {
        setStyleState(stored as EnvSelectionStyle);
      }
    } catch {
      // SSR or localStorage unavailable — use default
    }
  }, []);

  const setStyle = (s: EnvSelectionStyle) => {
    if (!VALID_STYLES.has(s)) {
      setStyleState(DEFAULT_STYLE);
      try {
        localStorage.setItem(STORAGE_KEY, DEFAULT_STYLE);
      } catch {
        // localStorage unavailable
      }
      return;
    }
    setStyleState(s);
    try {
      localStorage.setItem(STORAGE_KEY, s);
    } catch {
      // localStorage unavailable
    }
  };

  return { style, setStyle };
}
