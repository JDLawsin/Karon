"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";

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

const icon: Record<ThemePreference, ReactNode> = {
  system: <Monitor aria-hidden className="size-5" />,
  light: <Sun aria-hidden className="size-5" />,
  dark: <Moon aria-hidden className="size-5" />
};

export const ThemeToggle = () => {
  const { preference, setPreference } = useTheme();
  const next = nextPreference[preference];

  return (
    <Button
      type="button"
      variant="outline"
      className="w-(--control-min-height) shrink-0 px-0"
      aria-label={`${label[preference]}. Switch to ${label[next]}`}
      onClick={() => setPreference(next)}
    >
      {icon[preference]}
    </Button>
  );
};
