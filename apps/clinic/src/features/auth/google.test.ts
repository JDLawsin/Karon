import { describe, expect, it } from "vitest";

import { googleOAuthStart, magicLinkRedirect } from "./auth-redirects";

describe("auth redirects", () => {
  it("starts Google OAuth at the app callback", () => {
    expect(googleOAuthStart("https://clinic.example")).toEqual({
      provider: "google",
      options: { redirectTo: "https://clinic.example/auth/callback" }
    });
  });

  it("returns magic-link users to the confirm route", () => {
    expect(magicLinkRedirect("https://clinic.example")).toBe(
      "https://clinic.example/auth/confirm"
    );
  });
});
