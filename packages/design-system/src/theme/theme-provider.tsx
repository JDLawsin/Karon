"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import {
  applyResolvedTheme,
  parseThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference
} from "./theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

type ThemeProviderProps = {
  children: ReactNode;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [systemDark, setSystemDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setPreferenceState(
      parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY))
    );
    setSystemDark(media.matches);
    setReady(true);

    const syncSystem = () => {
      setSystemDark(media.matches);
    };
    media.addEventListener("change", syncSystem);
    return () => media.removeEventListener("change", syncSystem);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    applyResolvedTheme(resolveTheme(preference, systemDark));
  }, [preference, ready, systemDark]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({
      preference,
      resolved: resolveTheme(preference, systemDark),
      setPreference
    }),
    [preference, setPreference, systemDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return value;
};
