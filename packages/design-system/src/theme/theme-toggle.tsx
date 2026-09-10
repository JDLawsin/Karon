"use client";

import { Button } from "../primitives/button";
import type { ThemePreference } from "./theme";
import { useTheme } from "./theme-provider";

const nextPreference: Record<ThemePreference, ThemePreference> = {
  system: "light",
  light: "dark",
  dark: "system"
};

const label: Record<ThemePreference, string> = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme"
};

export const ThemeToggle = () => {
  const { preference, setPreference } = useTheme();
  const next = nextPreference[preference];

  return (
    <Button
      type="button"
      variant="outline"
      aria-label={`${label[preference]}. Switch to ${label[next]}`}
      onClick={() => setPreference(next)}
    >
      {label[preference]}
    </Button>
  );
};
