import { describe, expect, it } from "vitest";

import { parseThemePreference, resolveTheme } from "./theme";

describe("parseThemePreference", () => {
  it("accepts light and dark, and treats anything else as system", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("system")).toBe("system");
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference("nope")).toBe("system");
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
