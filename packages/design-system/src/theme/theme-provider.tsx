"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode
} from "react";

import {
  applyResolvedTheme,
  DEFAULT_THEME_PREFERENCE,
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
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";
const THEME_CHANGE_EVENT = "karon-theme-change";

const subscribeToThemePreference = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
};

const getThemePreference = (): ThemePreference =>
  parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));

const getServerThemePreference = (): ThemePreference => DEFAULT_THEME_PREFERENCE;

const subscribeToSystemTheme = (onStoreChange: () => void) => {
  const media = window.matchMedia(SYSTEM_THEME_QUERY);
  media.addEventListener("change", onStoreChange);

  return () => media.removeEventListener("change", onStoreChange);
};

const getSystemDark = (): boolean => window.matchMedia(SYSTEM_THEME_QUERY).matches;

const getServerSystemDark = (): boolean => false;

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const preference = useSyncExternalStore(
    subscribeToThemePreference,
    getThemePreference,
    getServerThemePreference
  );
  const systemDark = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemDark,
    getServerSystemDark
  );

  useEffect(() => {
    applyResolvedTheme(resolveTheme(preference, systemDark));
  }, [preference, systemDark]);

  const setPreference = useCallback((next: ThemePreference) => {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
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
