import { describe, expect, it } from "vitest";

import { parseThemePreference, resolveTheme } from "./theme";

describe("parseThemePreference", () => {
  it("defaults first-run and invalid preferences to light", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("system")).toBe("system");
    expect(parseThemePreference(null)).toBe("light");
    expect(parseThemePreference("nope")).toBe("light");
  });
});

describe("resolveTheme", () => {
  it("follows the OS only when preference is system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
