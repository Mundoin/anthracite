import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";

export const THEME_IDS = [
  "light-industrial",
  "graphite-command",
  "technical-blueprint",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "light-industrial";

export const THEME_LABELS: Record<ThemeId, string> = {
  "light-industrial": "Light Industrial",
  "graphite-command": "Graphite Frame",
  "technical-blueprint": "Technical Blueprint",
};

export const THEME_DESCRIPTIONS: Record<ThemeId, string> = {
  "light-industrial":
    "Dark equipment fascia around a light work surface. Restrained amber signal.",
  "graphite-command":
    "Dark casing. Paper-toned text on graphite, electric blue action, signal-bright status.",
  "technical-blueprint":
    "Cyan blueprint. Navy ink, cyan action, cool sunken sections.",
};

export interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeAttribute(id: ThemeId): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = id;
}

export function ThemeProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial?: ThemeId;
}): JSX.Element {
  const [theme, setThemeState] = useState<ThemeId>(initial ?? DEFAULT_THEME);

  useEffect(() => {
    applyThemeAttribute(theme);
  }, [theme]);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme }),
    [theme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>.");
  }
  return ctx;
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}
