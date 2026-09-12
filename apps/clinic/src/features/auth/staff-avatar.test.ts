import { describe, expect, it } from "vitest";

import { staffAvatarDataUri, staffAvatarFallback } from "./staff-avatar";

describe("staffAvatarDataUri", () => {
  it("returns the same data URI for the same userId", () => {
    const userId = "22222222-2222-4222-8222-222222222222";

    expect(staffAvatarDataUri(userId)).toBe(staffAvatarDataUri(userId));
  });

  it("returns different data URIs for different userIds", () => {
    expect(
      staffAvatarDataUri("22222222-2222-4222-8222-222222222222")
    ).not.toBe(staffAvatarDataUri("33333333-3333-4333-8333-333333333333"));
  });

  it("maps role to a fallback letter", () => {
    expect(staffAvatarFallback("owner")).toBe("O");
    expect(staffAvatarFallback("assistant")).toBe("A");
  });
});
