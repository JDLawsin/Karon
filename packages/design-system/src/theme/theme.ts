export const THEME_STORAGE_KEY = "karon-theme";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const parseThemePreference = (value: string | null): ThemePreference =>
  value === "light" || value === "dark" ? value : "system";

export const resolveTheme = (
  preference: ThemePreference,
  systemDark: boolean
): ResolvedTheme =>
  preference === "system" ? (systemDark ? "dark" : "light") : preference;

export const applyResolvedTheme = (resolved: ResolvedTheme): void => {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
};

export const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var v=localStorage.getItem(k);var p=v==="light"||v==="dark"?v:"system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=d?"dark":"light";var e=document.documentElement;e.dataset.theme=r;e.style.colorScheme=r;}catch(err){}})();`;
