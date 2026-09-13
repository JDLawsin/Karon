import { describe, expect, it } from "vitest";

import {
  DEFAULT_STAFF_AVATAR_STYLE,
  resolveStaffAvatarSeed,
  resolveStaffAvatarStyle,
  staffAvatarDataUri,
  staffAvatarFallback
} from "./staff-avatar";

describe("staffAvatarDataUri", () => {
  it("returns the same data URI for the same seed and style", () => {
    const seed = "22222222-2222-4222-8222-222222222222";

    expect(staffAvatarDataUri(seed)).toBe(staffAvatarDataUri(seed));
    expect(staffAvatarDataUri(seed, "lorelei")).toBe(
      staffAvatarDataUri(seed, "lorelei")
    );
  });

  it("returns different data URIs for different seeds", () => {
    expect(
      staffAvatarDataUri("22222222-2222-4222-8222-222222222222")
    ).not.toBe(staffAvatarDataUri("33333333-3333-4333-8333-333333333333"));
  });

  it("returns different data URIs for different styles", () => {
    const seed = "avery";

    expect(staffAvatarDataUri(seed, "notionists-neutral")).not.toBe(
      staffAvatarDataUri(seed, "lorelei")
    );
  });

  it("maps role to a fallback letter", () => {
    expect(staffAvatarFallback("owner")).toBe("O");
    expect(staffAvatarFallback("assistant")).toBe("A");
  });
});

describe("resolveStaffAvatarSeed", () => {
  const userId = "22222222-2222-4222-8222-222222222222";

  it("falls back to the user id when no saved seed exists", () => {
    expect(resolveStaffAvatarSeed(userId)).toBe(userId);
    expect(resolveStaffAvatarSeed(userId, null)).toBe(userId);
  });

  it("uses a saved seed when it is valid", () => {
    expect(resolveStaffAvatarSeed(userId, "avery")).toBe("avery");
  });

  it("ignores invalid saved seeds", () => {
    expect(resolveStaffAvatarSeed(userId, "   ")).toBe(userId);
  });
});

describe("resolveStaffAvatarStyle", () => {
  it("falls back to the default style", () => {
    expect(resolveStaffAvatarStyle()).toBe(DEFAULT_STAFF_AVATAR_STYLE);
    expect(resolveStaffAvatarStyle(null)).toBe(DEFAULT_STAFF_AVATAR_STYLE);
  });

  it("uses a saved style when it is valid", () => {
    expect(resolveStaffAvatarStyle("lorelei")).toBe("lorelei");
  });

  it("ignores invalid saved styles", () => {
    expect(resolveStaffAvatarStyle("unknown")).toBe(DEFAULT_STAFF_AVATAR_STYLE);
  });
});
